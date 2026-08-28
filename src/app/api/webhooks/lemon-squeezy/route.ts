import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidUUID, getClientIp } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Lemon Squeezy webhooks are well under 64 KB; reject anything larger.
const MAX_BODY_BYTES = 64 * 1024; // 64 KB
// Only subscription_* events drive the plan.
//
// `order_created` is deliberately NOT handled. Lemon Squeezy fires it alongside
// subscription_created for the same purchase with no guaranteed ordering, and
// its payload carries none of the fields the plan is derived from: the variant
// name sits under first_order_item (not attributes.variant_name), there is no
// renews_at, and data.id is an ORDER id rather than the subscription id. Acting
// on it downgraded yearly customers to "pro_monthly", cleared plan_expires_at
// and wrote an order id into ls_subscription_id, breaking the portal link.
// The subscription_* events carry everything we need.
const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_resumed",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_expired",
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Lemon Squeezy webhook handler.
 * Verifies signature with timing-safe comparison, then updates user plan
 * and persists subscription metadata (ls_subscription_id, ls_customer_id,
 * plan_expires_at, plan_cancelled_at).
 */
export async function POST(request: NextRequest) {
  // Rate limit: max 30 webhook deliveries per minute per source IP.
  const ip = getClientIp(request.headers);
  const { ok: rlOk } = await rateLimitAsync(`webhook:lemon:${ip}`, 30, 60_000);
  if (!rlOk) {
    return json({ error: "Too many requests" }, 429);
  }

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: "Webhook not configured" }, 500);
  }

  // Reject oversized bodies before reading them into memory.
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const rawBody = await request.text();

  // Secondary size guard for chunked transfers (no Content-Length header).
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const signature = request.headers.get("x-signature");
  if (!signature) {
    return json({ error: "Missing signature" }, 401);
  }

  // Only valid hex strings of exactly 64 chars are comparable (SHA-256 output).
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return json({ error: "Invalid signature format" }, 401);
  }

  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // Timing-safe comparison to prevent HMAC oracle attacks.
  const sigBuf = Buffer.from(signature, "hex");
  const hmacBuf = Buffer.from(hmac, "hex");
  if (sigBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(sigBuf, hmacBuf)) {
    return json({ error: "Invalid signature" }, 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name as string | undefined;
    const attrs = payload.data?.attributes ?? {};

    const userId = payload.meta?.custom_data?.user_id;

    if (!HANDLED_EVENTS.has(String(eventName))) {
      return json({ ok: true, ignored: true, event: eventName });
    }

    // Security: Only trust a verified UUID from custom_data.user_id.
    // Never fall back to email — an attacker could craft a webhook with any
    // user's email address and escalate their plan for free.
    if (!isValidUUID(userId)) {
      logger.error("webhook:missing-user-id", { eventName, userId });
      return json({ ok: true, message: "No valid user_id in custom_data" });
    }

    const supabase = getSupabaseAdmin();

    // Strict whitelist of columns the webhook is allowed to write.
    // Prevents accidental mass-assignment if this function is ever extended.
    type AllowedProfileUpdate = {
      plan?: string;
      ls_subscription_id?: string | null;
      ls_customer_id?: string | null;
      plan_expires_at?: string | null;
      plan_cancelled_at?: string | null;
    };

    /** Update a profile row identified by UUID. Throws on DB error so
     *  Lemon Squeezy receives a non-2xx and retries the webhook delivery. */
    async function updateProfile(updates: AllowedProfileUpdate) {
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) {
        logger.error("webhook:profile-update", error);
        throw error;
      }
    }

    // Extract subscription metadata present in most events.
    const lsSubscriptionId =
      typeof payload.data?.id === "string" ? payload.data.id : null;
    const lsCustomerId =
      typeof attrs.customer_id === "number"
        ? String(attrs.customer_id)
        : typeof attrs.customer_id === "string"
          ? attrs.customer_id
          : null;

    // renewsAt / endsAt gives us the current period end.
    const renewsAt: string | null = attrs.renews_at ?? attrs.ends_at ?? null;
    const planExpiresAt = renewsAt ? new Date(renewsAt).toISOString() : null;

    if (
      eventName === "subscription_created" ||
      eventName === "subscription_resumed" ||
      eventName === "subscription_updated"
    ) {
      const billingInterval =
        attrs.first_subscription_item?.interval ||
        attrs.variant_name ||
        "";
      const plan = String(billingInterval).toLowerCase().includes("year")
        ? "pro_yearly"
        : "pro_monthly";

      await updateProfile({
        plan,
        ls_subscription_id: lsSubscriptionId,
        ls_customer_id: lsCustomerId,
        plan_expires_at: planExpiresAt,
        plan_cancelled_at: null, // clear any previous cancellation
      });
    }

    if (eventName === "subscription_cancelled") {
      // Subscription cancelled but still active until period end.
      // Use the event's own timestamp (cancelled_at / updated_at) instead of
      // new Date() — otherwise a retried delivery would rewrite the cancel
      // timestamp to "now" on every replay, breaking idempotency.
      const cancelledAt: string | null =
        (typeof attrs.cancelled_at === "string" && attrs.cancelled_at) ||
        (typeof attrs.updated_at === "string" && attrs.updated_at) ||
        new Date().toISOString();
      await updateProfile({
        plan_cancelled_at: cancelledAt,
        plan_expires_at: planExpiresAt,
        ls_subscription_id: lsSubscriptionId,
        ls_customer_id: lsCustomerId,
        // Keep plan as-is until subscription_expired fires.
      });
    }

    if (eventName === "subscription_expired") {
      // Grace period over – downgrade to free.
      await updateProfile({
        plan: "free",
        plan_expires_at: null,
        plan_cancelled_at: null,
      });
    }

    return json({ ok: true, event: eventName });
  } catch (err) {
    logger.error("webhook:lemon-squeezy", err);
    return json({ error: "Processing failed" }, 500);
  }
}

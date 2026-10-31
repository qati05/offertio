import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  decideStripeEvent,
  getFounderSeatLimit,
  seatLimitParam,
  verifyStripeSignature,
  type StripeEventPayload,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

type GrantResult = {
  ok?: boolean;
  reason?: string;
};

/**
 * Stripe webhook. Signature is verified before any database write.
 * `checkout.session.completed` (paid) sets profiles.plan = 'lifetime'.
 * `charge.refunded` and succeeded `refund.created` / `refund.updated`
 * revoke that plan and release the confirmed founder seat.
 * Deliveries are idempotent on the Stripe event id.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rate = await rateLimitAsync(`webhook:stripe:${ip}`, 60, 60_000);
  if (!rate.ok) {
    return json({ error: "Too many requests" }, 429);
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return json({ error: "Webhook not configured" }, 500);
  }

  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return json({ error: "Invalid signature" }, 401);
  }

  let event: StripeEventPayload;
  try {
    event = JSON.parse(rawBody) as StripeEventPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const decision = decideStripeEvent(event);
  if (decision.action === "ignore") {
    return json({ ok: true, ignored: true, reason: decision.reason });
  }

  try {
    const admin = getSupabaseAdmin();

    if (decision.action === "release") {
      const { data, error } = await admin.rpc("release_founder_seat_for_session", {
        p_event_id: decision.eventId,
        p_session_id: decision.sessionId,
      });
      if (error) {
        logger.error("webhook:stripe:release", error, { eventId: decision.eventId });
        return json({ error: "Processing failed" }, 500);
      }
      return json({ ok: true, result: (data as GrantResult | null)?.reason ?? "released" });
    }

    if (decision.action === "revoke") {
      const { data, error } = await admin.rpc("revoke_lifetime_for_refund", {
        p_event_id: decision.eventId,
        p_event_type: decision.eventType,
        p_user_id: decision.userId,
        p_customer_id: decision.customerId,
        p_payment_intent_id: decision.paymentIntentId,
        p_session_id: decision.sessionId,
        p_amount: decision.amount,
        p_currency: decision.currency,
      });
      if (error) {
        logger.error("webhook:stripe:revoke", error, { eventId: decision.eventId });
        return json({ error: "Processing failed" }, 500);
      }
      return json({ ok: true, result: (data as GrantResult | null)?.reason ?? "revoked" });
    }

    const { data, error } = await admin.rpc("grant_lifetime_seat", {
      p_event_id: decision.eventId,
      p_event_type: decision.eventType,
      p_user_id: decision.userId,
      p_session_id: decision.sessionId,
      p_customer_id: decision.customerId,
      p_payment_intent_id: decision.paymentIntentId,
      p_seat_limit: seatLimitParam(getFounderSeatLimit()),
    });

    if (error) {
      logger.error("webhook:stripe:grant", error, {
        eventId: decision.eventId,
        userId: decision.userId,
      });
      return json({ error: "Processing failed" }, 500);
    }

    const result = (data ?? {}) as GrantResult;
    if (result.reason === "sold_out") {
      logger.error("webhook:stripe:sold-out-after-payment", "Bezahlte Session ohne freien Gründerplatz", {
        eventId: decision.eventId,
        userId: decision.userId,
        sessionId: decision.sessionId,
      });
      return json({ ok: true, result: "sold_out" });
    }

    return json({ ok: true, result: result.reason ?? "granted" });
  } catch (err) {
    logger.error("webhook:stripe", err);
    return json({ error: "Processing failed" }, 500);
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  FREE_LIMIT,
  hasActiveAccess,
  isInTrial,
  trialDaysRemaining,
} from "@/lib/payment";
import { consumeFreeDocumentSlot } from "@/lib/document-quota";
import { isAllowedOrigin } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function getCurrentMonat(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

/**
 * GET: Check if user can create a document (server-side free limit).
 * POST: Increment the server-side document counter.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Nicht angemeldet" }, 401);
    }

    const rl = await rateLimitAsync(`check-limit:${user.id}`, 30, 60_000);
    if (!rl.ok) {
      return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const plan = profile?.plan || "free";
    const trialEndsAt = profile?.trial_ends_at || null;
    const inTrial = isInTrial(trialEndsAt);
    const daysLeft = trialDaysRemaining(trialEndsAt);

    if (hasActiveAccess(plan, trialEndsAt)) {
      return json({
        allowed: true,
        remaining: Infinity,
        plan,
        inTrial,
        trialEndsAt,
        daysLeft,
      });
    }

    const monat = getCurrentMonat();
    const { data: counter } = await supabase
      .from("dokument_counter")
      .select("anzahl")
      .eq("user_id", user.id)
      .eq("monat", monat)
      .maybeSingle();

    const anzahl = counter?.anzahl || 0;
    const remaining = Math.max(0, FREE_LIMIT - anzahl);

    return json({
      allowed: anzahl < FREE_LIMIT,
      remaining,
      plan,
      used: anzahl,
      inTrial,
      trialEndsAt,
      daysLeft,
    });
  } catch (err) {
    logger.error("check-limit:GET", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungueltige Herkunft der Anfrage." }, 403);
  }

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Nicht angemeldet" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const plan = profile?.plan || "free";
    const trialEndsAt = profile?.trial_ends_at || null;
    const slot = await consumeFreeDocumentSlot(supabase, user.id, plan, trialEndsAt);

    if (slot === "skipped") {
      return json({
        ok: true,
        remaining: Infinity,
        inTrial: isInTrial(trialEndsAt),
        trialEndsAt,
        daysLeft: trialDaysRemaining(trialEndsAt),
      });
    }
    if (slot === "error") {
      logger.error("check-limit:POST:rpc", "consume failed", { userId: user.id });
      return json({ error: "Server-Fehler" }, 500);
    }
    if (slot === "blocked") {
      return json({ error: "Monatslimit erreicht", remaining: 0 }, 403);
    }

    const monat = getCurrentMonat();
    const { data: counter } = await supabase
      .from("dokument_counter")
      .select("anzahl")
      .eq("user_id", user.id)
      .eq("monat", monat)
      .maybeSingle();
    const used = typeof counter?.anzahl === "number" ? counter.anzahl : FREE_LIMIT;

    return json({
      ok: true,
      used,
      remaining: Math.max(0, FREE_LIMIT - used),
      inTrial: isInTrial(trialEndsAt),
      trialEndsAt,
      daysLeft: trialDaysRemaining(trialEndsAt),
    });
  } catch (err) {
    logger.error("check-limit:POST", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

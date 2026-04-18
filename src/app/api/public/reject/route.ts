import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { stripControlChars } from "@/lib/security";
import { publicViewError, type PublicViewLocale } from "@/lib/public-view-i18n";

const MAX_REASON_LEN = 1000;

function pickLocale(req: NextRequest): PublicViewLocale {
  const raw = req.headers.get("accept-language") ?? "";
  if (/^fr\b/i.test(raw)) return "fr";
  if (/^it\b/i.test(raw)) return "it";
  return "de";
}

function json(body: unknown, status = 200, extra?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...(extra ?? {}) },
  });
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * POST /api/public/reject
 *
 * Marks an offerte as "abgelehnt" (rejected). The recipient may optionally
 * include a short reason. Same rate-limit budget as /sign.
 */
export async function POST(request: NextRequest) {
  const locale = pickLocale(request);
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`public-reject:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return json({ error: publicViewError("rate_limited", locale) }, 429, {
      "Retry-After": "60",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: publicViewError("invalid_body", locale) }, 400);
  }

  const { token, reason } = (body || {}) as Record<string, unknown>;

  if (typeof token !== "string" || !/^[0-9a-f-]{36}$/.test(token)) {
    return json({ error: publicViewError("invalid_token", locale) }, 400);
  }

  let cleanReason: string | null = null;
  if (reason !== undefined && reason !== null && reason !== "") {
    if (typeof reason !== "string" || reason.length > MAX_REASON_LEN) {
      return json({ error: publicViewError("invalid_reason", locale) }, 400);
    }
    // Defend against header-like injection though we never embed this in a header.
    cleanReason = stripControlChars(reason).slice(0, MAX_REASON_LEN) || null;
  }

  const admin = getSupabaseAdmin();

  const { data: doc, error: readErr } = await admin
    .from("dokumente")
    .select("id, typ, status, nummer, user_id")
    .eq("share_token", token)
    .maybeSingle();

  if (readErr) {
    logger.error("public-reject:db-read", readErr);
    return json({ error: publicViewError("db_error", locale) }, 500);
  }

  if (!doc) {
    return json({ error: publicViewError("not_found", locale) }, 404);
  }

  if (doc.typ !== "offerte") {
    return json({ error: publicViewError("not_an_offer", locale) }, 422);
  }

  if (doc.status === "abgelehnt") {
    return json({ ok: true, alreadyRejected: true });
  }

  if (doc.status !== "gesendet") {
    return json({ error: publicViewError("cannot_reject_now", locale) }, 422);
  }

  const { error: updateErr } = await admin
    .from("dokumente")
    .update({
      status: "abgelehnt",
      rejected_at: new Date().toISOString(),
      rejection_reason: cleanReason,
    })
    .eq("id", doc.id);

  if (updateErr) {
    logger.error("public-reject:db-update", updateErr);
    return json({ error: publicViewError("save_failed", locale) }, 500);
  }

  logger.info("public-reject:rejected", "offerte rejected", { docId: doc.id, nummer: doc.nummer });

  return json({ ok: true, nummer: doc.nummer });
}

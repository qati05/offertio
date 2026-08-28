import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { publicViewError, type PublicViewLocale } from "@/lib/public-view-i18n";
import { getClientIp, isValidUUID } from "@/lib/security";

const MAX_SIGNATURE_LEN = 50_000;

// SVG path grammar we produce in SignPad: "M x y ( L x y)*" with signed
// decimals. This regex rejects anything else (script/URL/control chars).
const SIGNATURE_PATH_REGEX = /^M\s-?\d+(\.\d+)?\s-?\d+(\.\d+)?(\sL\s-?\d+(\.\d+)?\s-?\d+(\.\d+)?)*$/;

function pickLocale(req: NextRequest): PublicViewLocale {
  const raw = req.headers.get("accept-language") ?? "";
  if (/^fr\b/i.test(raw)) return "fr";
  if (/^it\b/i.test(raw)) return "it";
  return "de";
}

/**
 * POST /api/public/sign
 *
 * Marks an offerte as "angenommen" (accepted) and persists the drawn
 * signature path. Public — no auth required; recipient is authorized by
 * possession of the share token.
 *
 * Body: { token: string, signature: string }
 */
export async function POST(request: NextRequest) {
  const locale = pickLocale(request);

  // Feature flag: signing is disabled in production until consent / email-verify
  // is implemented. When off, the route behaves as if the feature doesn't exist.
  if (process.env.NEXT_PUBLIC_ENABLE_SIGNING !== "true") {
    return json({ error: publicViewError("not_found", locale) }, 404);
  }

  const ip = getClientIp(request.headers);
  const rl = await rateLimitAsync(`public-sign:${ip}`, 5, 60_000);
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

  const { token, signature } = (body || {}) as Record<string, unknown>;

  if (!isValidUUID(token)) {
    return json({ error: publicViewError("invalid_token", locale) }, 400);
  }

  if (
    typeof signature !== "string" ||
    signature.length === 0 ||
    signature.length > MAX_SIGNATURE_LEN ||
    !SIGNATURE_PATH_REGEX.test(signature)
  ) {
    return json({ error: publicViewError("invalid_signature", locale) }, 400);
  }

  const admin = getSupabaseAdmin();

  const { data: doc, error: readErr } = await admin
    .from("dokumente")
    .select("id, typ, status, nummer, kundenname, user_id")
    .eq("share_token", token)
    .maybeSingle();

  if (readErr) {
    logger.error("public-sign:db-read", readErr);
    return json({ error: publicViewError("db_error", locale) }, 500);
  }

  if (!doc) {
    return json({ error: publicViewError("not_found", locale) }, 404);
  }

  if (doc.typ !== "offerte") {
    return json({ error: publicViewError("not_an_offer", locale) }, 422);
  }

  if (doc.status === "angenommen") {
    return json({ ok: true, alreadySigned: true });
  }

  if (doc.status !== "gesendet") {
    return json({ error: publicViewError("cannot_sign_now", locale) }, 422);
  }

  // Atomic transition: only flip the row when it is still "gesendet". Without
  // the status predicate a concurrent signer could overwrite the first
  // signature (TOCTOU between the read above and this update).
  const { data: updated, error: updateErr } = await admin
    .from("dokumente")
    .update({
      status: "angenommen",
      signature_path: signature,
      signed_at: new Date().toISOString(),
    })
    .eq("id", doc.id)
    .eq("status", "gesendet")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    logger.error("public-sign:db-update", updateErr);
    return json({ error: publicViewError("save_failed", locale) }, 500);
  }

  // Zero rows matched → someone else already signed or rejected it in parallel.
  if (!updated) {
    return json({ ok: true, alreadySigned: true });
  }

  logger.info("public-sign:accepted", "offerte accepted", { docId: doc.id, nummer: doc.nummer });

  return json({ ok: true, nummer: doc.nummer, kundenname: doc.kundenname });
}

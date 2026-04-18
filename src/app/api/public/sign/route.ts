import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
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
 * POST /api/public/sign
 *
 * Marks an offerte as "angenommen" (accepted). Public — no auth required.
 * The recipient signs via the share token.
 *
 * Body: { token: string }
 *
 * Guards:
 *   - Only documents with typ = "offerte" and status = "gesendet" can be signed.
 *   - Rate-limited by IP.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`public-sign:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültiger Request-Body." }, 400);
  }

  const { token } = (body || {}) as Record<string, unknown>;

  if (typeof token !== "string" || !/^[0-9a-f-]{36}$/.test(token)) {
    return json({ error: "Ungültiger Token." }, 400);
  }

  const admin = getSupabaseAdmin();

  const { data: doc, error: readErr } = await admin
    .from("dokumente")
    .select("id, typ, status, nummer, kundenname, user_id")
    .eq("share_token", token)
    .maybeSingle();

  if (readErr) {
    logger.error("public-sign:db-read", readErr);
    return json({ error: "Datenbankfehler" }, 500);
  }

  if (!doc) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }

  if (doc.typ !== "offerte") {
    return json({ error: "Nur Offerten können digital angenommen werden." }, 422);
  }

  if (doc.status === "angenommen") {
    return json({ ok: true, alreadySigned: true });
  }

  if (doc.status !== "gesendet") {
    return json({ error: "Diese Offerte kann nicht mehr angenommen werden." }, 422);
  }

  const { error: updateErr } = await admin
    .from("dokumente")
    .update({ status: "angenommen" })
    .eq("id", doc.id);

  if (updateErr) {
    logger.error("public-sign:db-update", updateErr);
    return json({ error: "Fehler beim Speichern." }, 500);
  }

  logger.info("public-sign:accepted", "offerte accepted", { docId: doc.id, nummer: doc.nummer });

  return json({ ok: true, nummer: doc.nummer, kundenname: doc.kundenname });
}

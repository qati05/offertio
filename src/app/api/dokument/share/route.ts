import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAllowedOrigin, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * POST /api/dokument/share
 * Returns a fresh signed URL for the PDF of a document owned by the caller.
 *
 * Body: { id: string }            — document UUID
 * Response: { url: string; expiresIn: number; nummer: string }
 *
 * Used by the WhatsApp share flow so the shared link keeps working after the
 * in-browser signed URL would have expired.
 */
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Forbidden" }, 403);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: "Nicht angemeldet." }, 401);
  }

  const rl = await rateLimitAsync(`dokument-share:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { id } = (body || {}) as Record<string, unknown>;

  if (typeof id !== "string" || !isValidUUID(id)) {
    return json({ error: "id must be a valid UUID" }, 400);
  }

  // RLS ensures the user only sees their own documents.
  const { data: doc, error: readError } = await supabase
    .from("dokumente")
    .select("id, nummer, pdf_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    logger.error("dokument-share:read", readError);
    return json({ error: "Datenbankfehler" }, 500);
  }

  if (!doc || !doc.pdf_url) {
    return json({ error: "Dokument nicht gefunden" }, 404);
  }

  // Signed URLs generated via service-role, 7-day TTL.
  // This is long enough to survive a typical "contractor sends quote → customer
  // replies over WhatsApp" cycle but short enough that the link is not a
  // permanent leak if forwarded.
  const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days

  const admin = getSupabaseAdmin();
  const { data: signed, error: signError } = await admin.storage
    .from("pdfs")
    .createSignedUrl(doc.pdf_url, EXPIRES_IN);

  if (signError || !signed?.signedUrl) {
    logger.error("dokument-share:sign", signError);
    return json({ error: "PDF-Link konnte nicht erstellt werden." }, 500);
  }

  return json({
    url: signed.signedUrl,
    expiresIn: EXPIRES_IN,
    nummer: doc.nummer,
  });
}

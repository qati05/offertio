/**
 * POST /api/profile/upload-logo
 *
 * Server-side logo upload with magic-byte validation.
 * The client sends a FormData request with a "file" field.
 * The server validates the actual file content (not just Content-Type header),
 * then uploads to Supabase Storage using the admin client.
 *
 * This prevents MIME-type spoofing — an attacker cannot rename a PHP script
 * to "logo.png" and have it accepted by only checking the Content-Type header.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isAllowedOrigin } from "@/lib/security";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Detect image type via magic bytes (file signature).
 * Never trust the Content-Type header or file extension alone.
 */
function detectImageType(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // WEBP: RIFF????WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungueltige Herkunft der Anfrage." }, 403);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Nicht angemeldet." }, 401);
  }

  // Rate limit: max 10 logo uploads per minute per user.
  const { ok } = await rateLimitAsync(`logo:${user.id}`, 10, 60_000);
  if (!ok) {
    return json({ error: "Zu viele Anfragen. Bitte warte kurz." }, 429);
  }

  // Coarse Content-Length guard (multipart overhead ~500 B, give 10 KB headroom).
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_LOGO_BYTES + 10_000) {
    return json({ error: "Datei zu gross. Maximale Grösse: 2 MB." }, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return json({ error: "Keine Datei erhalten." }, 400);
  }

  // Exact size guard after parsing (catches chunked transfers without Content-Length).
  if (file.size > MAX_LOGO_BYTES) {
    return json({ error: "Logo darf max. 2 MB gross sein." }, 413);
  }

  if (file.size === 0) {
    return json({ error: "Leere Datei." }, 400);
  }

  // Read bytes and detect actual image type via magic bytes.
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const detectedType = detectImageType(buf);
  if (!detectedType || !ALLOWED_MIME.has(detectedType)) {
    return json({ error: "Nur PNG, JPG oder WEBP sind erlaubt." }, 400);
  }

  // Derive extension from detected type — never trust the uploaded filename.
  const ext = detectedType === "image/png" ? "png" : detectedType === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/logo.${ext}`;

  const admin = getSupabaseAdmin();
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, buf, { contentType: detectedType, upsert: true });

  if (uploadError) {
    logger.error("logo:upload", uploadError);
    return json({ error: "Fehler beim Hochladen. Bitte versuche es erneut." }, 500);
  }

  const { data: urlData } = admin.storage.from("logos").getPublicUrl(path);

  // Persist logo URL directly — no separate client call needed.
  const { error: updateError } = await admin
    .from("profiles")
    .update({ logo_url: urlData.publicUrl })
    .eq("id", user.id);

  if (updateError) {
    logger.error("logo:profile-update", updateError);
    // Upload succeeded — return URL anyway so the UI can show it.
  }

  return json({ url: urlData.publicUrl });
}

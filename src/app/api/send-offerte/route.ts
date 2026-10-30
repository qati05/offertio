import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isSafeDocumentIdentifier, isValidUUID, stripControlChars } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  canAddressEmail,
  isDocumentEmailKind,
  renderDocumentEmail,
  resolveFromAddress,
  viewUrlForShareToken,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

/**
 * POST /api/send-offerte
 * Sends a quote or invoice email through Resend.
 * From address defaults to offerte@getoffertio.ch and must stay on that domain.
 * Without RESEND_API_KEY the route returns 503 so the client can fall back to mailto.
 */
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Forbidden" }, 403);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet." }, 401);

  const rl = await rateLimitAsync(`send-offerte:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültiges JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Ungültiger Body." }, 400);

  const record = body as Record<string, unknown>;
  if (!canAddressEmail(record.to)) return json({ error: "Ungültige Empfängeradresse." }, 400);
  if (!isDocumentEmailKind(record.kind)) return json({ error: "Art muss offerte oder rechnung sein." }, 400);
  if (typeof record.nummer !== "string" || !isSafeDocumentIdentifier(record.nummer)) {
    return json({ error: "Ungültige Dokumentnummer." }, 400);
  }

  const from = resolveFromAddress();
  if (!from.ok) {
    logger.error("send-offerte:from", from.reason);
    return json({ error: "Absenderadresse ist nicht konfiguriert." }, 500);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: "E-Mail-Versand ist nicht konfiguriert.", configured: false }, 503);
  }

  let viewUrl: string | null = null;
  if (record.shareToken != null) {
    if (typeof record.shareToken !== "string" || !isValidUUID(record.shareToken)) {
      return json({ error: "Ungültiger Freigabelink." }, 400);
    }
    const { data: owned, error } = await supabase
      .from("dokumente")
      .select("id")
      .eq("user_id", user.id)
      .eq("share_token", record.shareToken)
      .maybeSingle();
    if (error) {
      logger.error("send-offerte:token", error);
      return json({ error: "Datenbankfehler." }, 500);
    }
    if (!owned) return json({ error: "Dokument nicht gefunden." }, 404);
    viewUrl = viewUrlForShareToken(record.shareToken);
  }

  const kundeName = typeof record.kundeName === "string" ? record.kundeName : "";
  const firmenname = typeof record.firmenname === "string" ? record.firmenname : "";
  const message = renderDocumentEmail({
    kind: record.kind,
    nummer: record.nummer,
    kundeName,
    firmenname,
    viewUrl,
  });

  const idempotencyKey = `dokument/${user.id}/${record.kind}/${record.nummer}/${record.to.toLowerCase()}`.slice(0, 256);
  const endpoint = (process.env.RESEND_API_BASE_URL?.trim() || "https://api.resend.com").replace(/\/+$/, "");

  let response: Response;
  try {
    response = await fetch(`${endpoint}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: from.from,
        to: [record.to],
        subject: stripControlChars(message.subject),
        html: message.html,
        text: message.text,
      }),
    });
  } catch (err) {
    logger.error("send-offerte:fetch", err);
    return json({ error: "E-Mail konnte nicht gesendet werden." }, 502);
  }

  if (!response.ok) {
    logger.error("send-offerte:resend", `status ${response.status}`);
    return json({ error: "E-Mail konnte nicht gesendet werden." }, 502);
  }

  return json({ ok: true });
}

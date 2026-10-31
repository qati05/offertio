import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isSafeDocumentIdentifier, isValidUUID, stripControlChars } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  canAddressEmail,
  isDocumentEmailKind,
  renderDocumentEmail,
  resendEmailsEndpoint,
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

  const rl = await rateLimitAsync(`send-offerte:${user.id}`, 30, 60 * 60 * 1000);
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
  if (typeof record.shareToken !== "string" || !isValidUUID(record.shareToken)) {
    return json({ error: "Ungültiger Freigabelink." }, 400);
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

  const endpoint = resendEmailsEndpoint(process.env.RESEND_API_BASE_URL);
  if (!endpoint) {
    logger.error("send-offerte:endpoint", "Resend-Basisadresse ist nicht erlaubt");
    return json({ error: "E-Mail-Versand ist nicht konfiguriert." }, 500);
  }

  const { data: owned, error } = await supabase
    .from("dokumente")
    .select("id, typ, nummer, kunde_email")
    .eq("user_id", user.id)
    .eq("share_token", record.shareToken)
    .maybeSingle();
  if (error) {
    logger.error("send-offerte:token", error);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!owned || (owned.typ !== "offerte" && owned.typ !== "rechnung")) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }
  if (owned.typ !== record.kind) return json({ error: "Art muss offerte oder rechnung sein." }, 400);
  if (!isSafeDocumentIdentifier(owned.nummer)) return json({ error: "Ungültige Dokumentnummer." }, 400);

  const recipient = typeof owned.kunde_email === "string" ? owned.kunde_email.trim().toLowerCase() : "";
  if (!canAddressEmail(recipient) || recipient !== record.to.trim().toLowerCase()) {
    return json({ error: "Empfänger muss die E-Mail auf dem Dokument sein." }, 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("firmenname")
    .eq("id", user.id)
    .maybeSingle();

  const kundeName = typeof record.kundeName === "string" ? record.kundeName : "";
  const message = renderDocumentEmail({
    kind: owned.typ,
    nummer: owned.nummer,
    kundeName,
    firmenname: profile?.firmenname ?? "",
    viewUrl: viewUrlForShareToken(record.shareToken),
  });

  const idempotencyKey = `dokument/${user.id}/${owned.typ}/${owned.nummer}/${recipient}`.slice(0, 256);

  let response: Response;
  try {
    response = await fetch(endpoint, {
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

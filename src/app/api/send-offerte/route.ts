import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync } from "@/lib/rate-limit";
import {
  isAllowedOrigin,
  isSafeDocumentIdentifier,
  isValidBase64,
  isValidEmail,
  normalizeEmail,
  stripControlChars,
} from "@/lib/security";
import { createSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 7 * 1024 * 1024;

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

  const { ok } = await rateLimitAsync(`send-email:${user.id}`, 10, 60_000);
  if (!ok) {
    return json({ error: "Zu viele Anfragen. Bitte warte kurz." }, 429);
  }

  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Payload zu gross." }, 413);
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // No email provider configured - instruct client to use native share.
      return json({ method: "client-share" });
    }

    const body = await request.json();
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      return json({ error: "Payload zu gross." }, 413);
    }

    const { pdfBase64, kundeEmail, kundeName, firmenname, nummer, dokumentTyp, userEmail: bodyUserEmail } = body;

    if (!pdfBase64 || !kundeEmail || !nummer) {
      return json({ error: "Fehlende Daten fuer den E-Mail-Versand." }, 400);
    }

    if (
      typeof kundeEmail !== "string" ||
      typeof nummer !== "string" ||
      (kundeName != null && typeof kundeName !== "string") ||
      (firmenname != null && typeof firmenname !== "string")
    ) {
      return json({ error: "Ungueltige Eingabedaten." }, 400);
    }

    const normalizedEmail = normalizeEmail(kundeEmail);
    if (!isValidEmail(normalizedEmail)) {
      return json({ error: "Ungueltige E-Mail-Adresse des Empfaengers." }, 400);
    }

    if (
      normalizedEmail.length > 254 ||
      (kundeName && kundeName.length > 200) ||
      (firmenname && firmenname.length > 200) ||
      !isSafeDocumentIdentifier(nummer, 50) ||
      !isValidBase64(pdfBase64)
    ) {
      return json({ error: "Ungueltige Eingabedaten." }, 400);
    }

    const pdfBytes = Buffer.byteLength(pdfBase64, "base64");
    if (pdfBytes <= 0 || pdfBytes > MAX_PDF_BYTES) {
      return json({ error: "PDF ist ungueltig oder zu gross." }, 413);
    }

    const safeNummer = stripControlChars(nummer);
    const safeFirmenname = stripControlChars(firmenname || "Offertio");
    const safeKundeName = stripControlChars(kundeName || "");
    const fromEmail = process.env.RESEND_FROM_EMAIL || "offerte@offertio.ch";
    const safeTyp = dokumentTyp === "rechnung" ? "Rechnung" : "Offerte";

    // Reply-to: use authenticated user's email so replies go directly to the business owner
    // Priority: Supabase auth email (verified) > body-supplied email > none
    const replyToEmail = user.email || (
      typeof bodyUserEmail === "string" && isValidEmail(normalizeEmail(bodyUserEmail))
        ? normalizeEmail(bodyUserEmail)
        : null
    );

    const resend = new Resend(apiKey);
    await resend.emails.send({
      // From shows only the business name — professional, no "via Offertio" branding
      from: `${safeFirmenname} <${fromEmail}>`,
      to: normalizedEmail,
      // Replies go to the business owner, not to Offertio
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      subject: `${safeTyp} ${safeNummer} von ${safeFirmenname}`,
      text: `Guten Tag ${safeKundeName},\n\nIm Anhang finden Sie unsere ${safeTyp.toLowerCase()} ${safeNummer}.\n\nBei Fragen stehen wir Ihnen gerne zur Verfuegung.\n\nFreundliche Gruesse\n${safeFirmenname}`,
      attachments: [
        {
          filename: `${safeNummer}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    return json({ success: true });
  } catch (err) {
    logger.error("send-offerte", err);
    return json({ error: "Fehler beim Senden der E-Mail." }, 500);
  }
}

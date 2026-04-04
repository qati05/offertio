/**
 * POST /api/e-rechnung/generate
 *
 * Takes an existing PDF (base64) + invoice data, embeds ZUGFeRD 2.3.2 BASIC
 * CII-XML into the PDF, and returns the result as base64.
 *
 * Only relevant for: land === "DE" && dokumentTyp === "rechnung"
 *
 * Body:    { pdfBase64: string, invoiceData: OfferteData, leistungsdatum?: string }
 * Returns: { pdfBase64: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidBase64 } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { buildZugferdXml } from "@/lib/zugferd-xml";
import { embedZugferdXml } from "@/lib/zugferd-embedder";
import type { OfferteData } from "@/lib/types";

const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  // Origin check
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungueltige Herkunft der Anfrage." }, 403);
  }

  // Auth
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Nicht angemeldet." }, 401);
  }

  // Rate limit
  const { ok } = await rateLimitAsync(`e-rechnung:${user.id}`, 20, 60_000);
  if (!ok) {
    return json({ error: "Zu viele Anfragen. Bitte warte kurz." }, 429);
  }

  // Body size guard
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Anfrage zu gross." }, 413);
  }

  // Parse body
  let body: { pdfBase64: string; invoiceData: OfferteData; leistungsdatum?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungueltiges JSON im Request-Body." }, 400);
  }

  const { pdfBase64, invoiceData, leistungsdatum } = body;

  // Input validation
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return json({ error: "Pflichtfeld fehlt: pdfBase64." }, 400);
  }
  if (!isValidBase64(pdfBase64)) {
    return json({ error: "pdfBase64 ist kein gueltiger Base64-String." }, 400);
  }
  if (!invoiceData || typeof invoiceData !== "object") {
    return json({ error: "Pflichtfeld fehlt: invoiceData." }, 400);
  }
  if (!invoiceData.nummer || !invoiceData.datum || !invoiceData.profil || !invoiceData.positionen) {
    return json(
      { error: "invoiceData unvollstaendig: nummer, datum, profil und positionen sind Pflichtfelder." },
      400,
    );
  }
  if (!Array.isArray(invoiceData.positionen) || invoiceData.positionen.length === 0) {
    return json({ error: "invoiceData.positionen darf nicht leer sein." }, 400);
  }

  // Generate ZUGFeRD XML
  let xmlString: string;
  try {
    xmlString = buildZugferdXml(invoiceData, leistungsdatum);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: `XML-Generierung fehlgeschlagen: ${msg}` }, 500);
  }

  // Embed XML into PDF
  let outputBytes: Uint8Array;
  try {
    const pdfBytes = Uint8Array.from(Buffer.from(pdfBase64, "base64"));
    outputBytes = await embedZugferdXml(pdfBytes, xmlString);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: `PDF-Verarbeitung fehlgeschlagen: ${msg}` }, 400);
  }

  // Return base64-encoded result
  const resultBase64 = Buffer.from(outputBytes).toString("base64");
  return json({ pdfBase64: resultBase64 });
}

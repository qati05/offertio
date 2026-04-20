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
import type { OfferteData, Profile } from "@/lib/types";

const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

type ServerProfile = Pick<
  Profile,
  | "firmenname"
  | "vorname"
  | "nachname"
  | "adresse"
  | "plz"
  | "ort"
  | "telefon"
  | "iban"
  | "bic"
  | "uid_mwst"
  | "steuernummer"
  | "fn_nr"
  | "logo_url"
  | "land"
  | "sprache"
  | "beruf"
  | "zahlungsfrist"
  | "plan"
  | "kleinunternehmer"
  | "pdf_template"
  | "created_at"
> & { email?: string | null };

function profileFromServer(user: { id: string; email?: string | null }, profile: ServerProfile): Profile {
  return {
    id: user.id,
    email: user.email ?? profile.email ?? "",
    firmenname: profile.firmenname ?? "",
    vorname: profile.vorname ?? "",
    nachname: profile.nachname ?? "",
    adresse: profile.adresse ?? "",
    plz: profile.plz ?? "",
    ort: profile.ort ?? "",
    telefon: profile.telefon ?? "",
    iban: profile.iban ?? "",
    bic: profile.bic ?? "",
    uid_mwst: profile.uid_mwst ?? "",
    steuernummer: profile.steuernummer ?? "",
    fn_nr: profile.fn_nr ?? "",
    logo_url: profile.logo_url ?? "",
    land: profile.land,
    sprache: profile.sprache ?? "de",
    beruf: profile.beruf ?? "",
    zahlungsfrist: profile.zahlungsfrist ?? 30,
    plan: profile.plan ?? "free",
    kleinunternehmer: profile.kleinunternehmer ?? false,
    pdf_template: profile.pdf_template,
    created_at: profile.created_at ?? new Date(0).toISOString(),
  };
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
  const rl = await rateLimitAsync(`e-rechnung:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen. Bitte warte kurz." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
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
  // Leistungsdatum maps to ZUGFeRD BT-72 (ActualDeliverySupplyChainEvent). A
  // malformed value would still serialise but produce an invoice that fails
  // schema validation at the recipient, so reject obvious garbage upfront.
  if (leistungsdatum !== undefined) {
    if (
      typeof leistungsdatum !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(leistungsdatum) ||
      Number.isNaN(Date.parse(leistungsdatum))
    ) {
      return json({ error: "leistungsdatum muss ein ISO-Datum (YYYY-MM-DD) sein." }, 400);
    }
  }

  const { data: serverProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      [
        "email",
        "firmenname",
        "vorname",
        "nachname",
        "adresse",
        "plz",
        "ort",
        "telefon",
        "iban",
        "bic",
        "uid_mwst",
        "steuernummer",
        "fn_nr",
        "logo_url",
        "land",
        "sprache",
        "beruf",
        "zahlungsfrist",
        "plan",
        "kleinunternehmer",
        "pdf_template",
        "created_at",
      ].join(","),
    )
    .eq("id", user.id)
    .maybeSingle<ServerProfile>();

  if (profileError || !serverProfile) {
    return json({ error: "Profil konnte nicht geladen werden." }, 400);
  }

  if (serverProfile.land !== "DE") {
    return json({ error: "E-Rechnungen im ZUGFeRD-Format sind nur fuer deutsche Profile verfuegbar." }, 400);
  }

  const serverAuthoritativeInvoiceData: OfferteData = {
    ...invoiceData,
    profil: profileFromServer(user, serverProfile),
  };

  // Generate ZUGFeRD XML
  let xmlString: string;
  try {
    xmlString = buildZugferdXml(serverAuthoritativeInvoiceData, leistungsdatum);
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

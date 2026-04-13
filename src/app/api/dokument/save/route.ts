import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCustomerDisplayName, makePrimaryCustomerLookupKey } from "@/lib/customers";
import { isAllowedOrigin, isValidBase64, isSafeDocumentIdentifier, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { KundenInfo } from "@/lib/types";

const MAX_PDF_BYTES = 7 * 1024 * 1024;
// base64 overhead ≈ 4/3 — a 7 MB PDF becomes ~9.5 MB base64 plus JSON wrapper.
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

async function removeUploadedPdf(
  admin: ReturnType<typeof getSupabaseAdmin>,
  fileName: string,
  reason: string,
) {
  const { error } = await admin.storage.from("pdfs").remove([fileName]);
  if (error) {
    logger.error("pdf-cleanup", error, { fileName, reason });
  }
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

  const rl = await rateLimitAsync(`dokument-save:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen. Bitte warte kurz." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  // Content-Length guard — reject oversized requests before parsing JSON.
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "Anfrage zu gross." }, 413);
  }

  try {
    const {
      pdfBase64,
      typ,
      nummer,
      objekt,
      kundenname,
      kunde,
      betrag,
      datum,
      leistungsdatum,
      status,
      sourceDocumentId,
      sourceDocumentNummer,
      sourceDocumentNumber,
      sourceDocumentTyp,
      existingDocumentId,
    } = await request.json();

    if (!pdfBase64 || !typ || !nummer || !kundenname || betrag === undefined || betrag === null || !datum) {
      return json({ error: "Fehlende Daten fuer die Speicherung." }, 400);
    }

    // Whitelist document type — must match DB CHECK constraint.
    const VALID_TYPES = new Set(["offerte", "rechnung"]);
    if (!VALID_TYPES.has(typ)) {
      return json({ error: "Ungültiger Dokumenttyp." }, 400);
    }

    // Validate optional document IDs as UUIDs before any DB query.
    if (existingDocumentId && !isValidUUID(existingDocumentId)) {
      return json({ error: "Ungültige Dokument-ID." }, 400);
    }
    if (sourceDocumentId && !isValidUUID(sourceDocumentId)) {
      return json({ error: "Ungültige Quell-Dokument-ID." }, 400);
    }

    // Validate betrag is a finite non-negative number to prevent NaN/Infinity
    // from being stored or causing arithmetic errors downstream.
    const betragNum = Number(betrag);
    if (!Number.isFinite(betragNum) || betragNum < 0 || betragNum > 1_000_000_000) {
      return json({ error: "Ungültiger Betrag." }, 400);
    }

    // Prevent path traversal in nummer — it is used directly in Storage file path.
    if (!isSafeDocumentIdentifier(nummer, 80)) {
      return json({ error: "Ungültige Dokumentnummer." }, 400);
    }

    // Validate datum is a valid ISO date (YYYY-MM-DD)
    if (typeof datum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(datum) || isNaN(Date.parse(datum))) {
      return json({ error: "Ungültiges Datum." }, 400);
    }

    // Validate leistungsdatum format when present
    if (leistungsdatum && (typeof leistungsdatum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(leistungsdatum) || isNaN(Date.parse(leistungsdatum)))) {
      return json({ error: "Ungültiges Leistungsdatum." }, 400);
    }

    // Validate string field lengths to prevent oversized payloads reaching the DB
    if (typeof kundenname !== "string" || kundenname.length > 500) {
      return json({ error: "Kundenname ungültig oder zu lang." }, 400);
    }
    if (objekt !== undefined && objekt !== null && (typeof objekt !== "string" || objekt.length > 500)) {
      return json({ error: "Objektbezeichnung zu lang." }, 400);
    }

    // DE/AT legal requirement: Rechnungen must include Leistungsdatum
    if (typ === "rechnung" && !leistungsdatum) {
      // Look up the user's country to enforce the rule
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("land")
        .eq("id", user.id)
        .maybeSingle();
      const land = userProfile?.land || "CH";
      if (land === "DE" || land === "AT") {
        return json({
          error: "Leistungsdatum ist für Rechnungen in DE/AT gesetzlich erforderlich.",
        }, 400);
      }
    }

    if (!isValidBase64(pdfBase64)) {
      return json({ error: "Ungueltiges PDF-Format." }, 400);
    }

    const pdfBytes = Buffer.byteLength(pdfBase64, "base64");
    if (pdfBytes <= 0 || pdfBytes > MAX_PDF_BYTES) {
      return json({ error: "PDF ist zu gross." }, 413);
    }

    const admin = getSupabaseAdmin();
    const customerSnapshot = {
      name: getCustomerDisplayName(kunde || { name: kundenname }),
      email: (kunde?.email || null) as string | null,
      adresse: (kunde?.adresse || null) as string | null,
      adresse2: (kunde?.adresse2 || null) as string | null,
      plz: (kunde?.plz || null) as string | null,
      ort: (kunde?.ort || null) as string | null,
      uid_mwst: (kunde?.uid_mwst || null) as string | null,
    };
    const lookupKey = makePrimaryCustomerLookupKey((kunde || { name: kundenname }) as Partial<KundenInfo>);

    const { data: customerRecord, error: customerError } = await admin
      .from("customers")
      .upsert(
        {
          user_id: user.id,
          display_name: customerSnapshot.name,
          email: customerSnapshot.email,
          adresse: customerSnapshot.adresse,
          adresse2: customerSnapshot.adresse2,
          plz: customerSnapshot.plz,
          ort: customerSnapshot.ort,
          uid_mwst: customerSnapshot.uid_mwst,
          lookup_key: lookupKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lookup_key" },
      )
      .select("id")
      .single();

    if (customerError) {
      logger.error("customer-upsert", customerError);
    }

    // 1. Upload PDF to Storage
    const fileName = `${user.id}/${nummer}_${Date.now()}.pdf`;
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    
    const { error: uploadError } = await admin.storage
      .from("pdfs")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      logger.error("pdf-upload", uploadError);
      return json({ error: "Fehler beim Upload des PDFs." }, 500);
    }

    // 2. Save Document metadata to DB
    const normalizedStatus = status === "gesendet" ? "gesendet" : "entwurf";

    // --- Collision detection: ensure (user_id, nummer) is unique before insert ---
    // Two devices or a localStorage reset can produce the same nummer for the same user.
    // We resolve this transparently by appending a suffix (-1, -2, …) until we find a free slot.
    const userId = user.id; // capture for use inside nested async function (TS narrowing)
    async function hasNumberCollision(candidate: string, currentDocumentId?: string | null): Promise<boolean> {
      const { data, error } = await admin
        .from("dokumente")
        .select("id")
        .eq("user_id", userId)
        .eq("nummer", candidate)
        .limit(2);

      if (error) {
        logger.error("dokument-save:number-check", error, { userId, candidate, currentDocumentId });
        return true;
      }

      const collisions = (data || []).filter((doc) => doc.id !== currentDocumentId);
      return collisions.length > 0;
    }

    async function resolveUniqueNummer(candidate: string, currentDocumentId?: string | null): Promise<string> {
      if (!(await hasNumberCollision(candidate, currentDocumentId))) return candidate;

      // Collision detected — try suffixed variants
      for (let suffix = 1; suffix <= 99; suffix++) {
        const suffixed = `${candidate}-${suffix}`;
        if (!(await hasNumberCollision(suffixed, currentDocumentId))) return suffixed;
      }
      // Extremely unlikely: fall back to timestamp-based uniqueness
      return `${candidate}-${Date.now()}`;
    }

    const resolvedNummer = await resolveUniqueNummer(nummer, existingDocumentId || null);
    // ---

    const relationNumber = sourceDocumentNummer || sourceDocumentNumber || null;
    const documentPayload = {
      user_id: user.id,
      typ,
      nummer: resolvedNummer,
      objekt,
      kundenname: customerSnapshot.name,
      customer_id: customerRecord?.id ?? null,
      kunde_email: customerSnapshot.email,
      kunde_adresse: customerSnapshot.adresse,
      kunde_adresse2: customerSnapshot.adresse2,
      kunde_plz: customerSnapshot.plz,
      kunde_ort: customerSnapshot.ort,
      kunde_uid_mwst: customerSnapshot.uid_mwst,
      betrag: betragNum,
      datum,
      leistungsdatum: leistungsdatum || null,
      pdf_url: fileName,
      status: normalizedStatus,
      source_document_id: sourceDocumentId || null,
      source_document_nummer: relationNumber,
      source_document_typ: sourceDocumentTyp || null,
    };

    const { data: insertedDocument, error: dbError } = existingDocumentId
      ? await admin
          .from("dokumente")
          .update(documentPayload)
          .eq("id", existingDocumentId)
          .eq("user_id", user.id)
          .select("id, nummer, source_document_id, source_document_nummer, source_document_typ, customer_id")
          .single()
      : await admin
          .from("dokumente")
          .insert(documentPayload)
          .select("id, nummer, source_document_id, source_document_nummer, source_document_typ, customer_id")
          .single();

    if (dbError) {
      logger.error(existingDocumentId ? "db-update-dokument" : "db-insert-dokument", dbError);
      const legacyPayload = {
        user_id: user.id,
        typ,
        nummer,
        objekt,
        kundenname: customerSnapshot.name,
        betrag: betragNum,
        datum,
        pdf_url: fileName,
        status: normalizedStatus,
      };

      const { data: legacyDocument, error: legacyError } = existingDocumentId
        ? await admin
            .from("dokumente")
            .update(legacyPayload)
            .eq("id", existingDocumentId)
            .eq("user_id", user.id)
            .select("id, nummer")
            .single()
        : await admin
            .from("dokumente")
            .insert(legacyPayload)
            .select("id, nummer")
            .single();

      if (legacyError) {
        logger.error(existingDocumentId ? "db-update-dokument-legacy" : "db-insert-dokument-legacy", legacyError);
        await removeUploadedPdf(admin, fileName, "metadata-write-failed");
        return json({
          success: false,
          metadataStored: false,
          error: "Dokument konnte nicht gespeichert werden.",
        }, 500);
      }

      return json({
        success: true,
        path: fileName,
        metadataStored: true,
        warning: "Dokument wurde im Legacy-Schema gespeichert. Kundenordner und Verknüpfungen werden nach dem Einspielen der aktuellen Migration aktiviert.",
        document: legacyDocument,
      });
    }

    if (typ === "rechnung" && sourceDocumentId && insertedDocument?.id) {
      const { error: relationError } = await admin
        .from("dokumente")
        .update({
          converted_document_id: insertedDocument.id,
          converted_document_nummer: insertedDocument.nummer,
          converted_document_typ: typ,
        })
        .eq("id", sourceDocumentId)
        .eq("user_id", user.id);

      if (relationError) {
        logger.error("db-update-source-dokument", relationError);
      }
    }

    return json({ success: true, path: fileName, metadataStored: true, document: insertedDocument });
  } catch (err) {
    logger.error("dokument-save", err);
    return json({ error: "Interner Serverfehler beim Speichern." }, 500);
  }
}

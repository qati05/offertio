import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCustomerDisplayName, makePrimaryCustomerLookupKey } from "@/lib/customers";
import { isAllowedOrigin, isValidBase64 } from "@/lib/security";
import { logger } from "@/lib/logger";
import type { KundenInfo } from "@/lib/types";

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
      status,
      sourceDocumentId,
      sourceDocumentNummer,
      sourceDocumentNumber,
      sourceDocumentTyp,
    } = await request.json();

    if (!pdfBase64 || !typ || !nummer || !kundenname || betrag === undefined || betrag === null || !datum) {
      return json({ error: "Fehlende Daten fuer die Speicherung." }, 400);
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
    async function resolveUniqueNummer(candidate: string): Promise<string> {
      const { count } = await admin
        .from("dokumente")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("nummer", candidate);

      if (!count || count === 0) return candidate;

      // Collision detected — try suffixed variants
      for (let suffix = 1; suffix <= 99; suffix++) {
        const suffixed = `${candidate}-${suffix}`;
        const { count: suffixCount } = await admin
          .from("dokumente")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("nummer", suffixed);

        if (!suffixCount || suffixCount === 0) return suffixed;
      }
      // Extremely unlikely: fall back to timestamp-based uniqueness
      return `${candidate}-${Date.now()}`;
    }

    const resolvedNummer = await resolveUniqueNummer(nummer);
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
      betrag,
      datum,
      pdf_url: fileName,
      status: normalizedStatus,
      source_document_id: sourceDocumentId || null,
      source_document_nummer: relationNumber,
      source_document_typ: sourceDocumentTyp || null,
    };

    const { data: insertedDocument, error: dbError } = await admin
      .from("dokumente")
      .insert(documentPayload)
      .select("id, nummer, source_document_id, source_document_nummer, source_document_typ, customer_id")
      .single();

    if (dbError) {
      logger.error("db-insert-dokument", dbError);
      const legacyPayload = {
        user_id: user.id,
        typ,
        nummer,
        objekt,
        kundenname: customerSnapshot.name,
        betrag,
        datum,
        pdf_url: fileName,
        status: normalizedStatus,
      };

      const { data: legacyDocument, error: legacyError } = await admin
        .from("dokumente")
        .insert(legacyPayload)
        .select("id, nummer")
        .single();

      if (legacyError) {
        logger.error("db-insert-dokument-legacy", legacyError);
        return json({
          success: true,
          path: fileName,
          metadataStored: false,
          warning: "PDF gespeichert, aber Dokument-Metadaten konnten nicht in Supabase geschrieben werden.",
        });
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

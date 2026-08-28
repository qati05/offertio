import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCustomerDisplayName, makePrimaryCustomerLookupKey } from "@/lib/customers";
import { FREE_LIMIT, hasActiveAccess } from "@/lib/payment";
import { validatePositionen } from "@/lib/price-precision";
import { checkReverseChargeEligibility, isReverseCharge, type Steuerfall } from "@/lib/reverse-charge";
import { isAllowedOrigin, isValidBase64, isSafeDocumentIdentifier, isValidUUID, stripControlChars } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { KundenInfo } from "@/lib/types";

const MAX_PDF_BYTES = 7 * 1024 * 1024;
// base64 overhead ≈ 4/3 — a 7 MB PDF becomes ~9.5 MB base64 plus JSON wrapper.
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

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
      positionen,
      mwstSatz,
      rabatt,
      notiz,
      preisMode,
      steuerfall,
      ust1tgDatum,
      ust1tgReferenz,
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

    // Validate carryover fields. These are optional — if absent, the document is
    // saved without structured line items (legacy behavior). The PDF remains
    // the source of truth for visual rendering; these columns enable
    // 1-click conversion of an Offerte → Rechnung without retyping positions.
    let normalizedPositionen: unknown[] | undefined;
    if (positionen !== undefined && positionen !== null) {
      if (!Array.isArray(positionen)) {
        return json({ error: "Positionen müssen ein Array sein." }, 400);
      }
      if (positionen.length > 200) {
        return json({ error: "Zu viele Positionen (max. 200)." }, 400);
      }
      // Money must be whole cents. A sub-cent unit price makes the PDF total
      // and the EN 16931 header total disagree by a cent, because the standard
      // sums the rounded line amounts while the PDF sums the raw products.
      const priceCheck = validatePositionen(positionen);
      if (!priceCheck.ok) {
        return json({ error: priceCheck.message }, 400);
      }
      normalizedPositionen = positionen;
    }

    let normalizedMwstSatz: number | undefined;
    if (mwstSatz !== undefined && mwstSatz !== null) {
      const v = Number(mwstSatz);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        return json({ error: "Ungültiger MWST-Satz." }, 400);
      }
      normalizedMwstSatz = v;
    }

    if (rabatt !== undefined && rabatt !== null && typeof rabatt !== "object") {
      return json({ error: "Ungültiges Rabatt-Format." }, 400);
    }

    if (notiz !== undefined && notiz !== null) {
      if (typeof notiz !== "string" || notiz.length > 4000) {
        return json({ error: "Notiz ungültig oder zu lang." }, 400);
      }
    }

    let normalizedPreisMode: "exkl" | "inkl" | undefined;
    if (preisMode !== undefined && preisMode !== null) {
      if (preisMode !== "exkl" && preisMode !== "inkl") {
        return json({ error: "Ungültiger Preis-Modus." }, 400);
      }
      normalizedPreisMode = preisMode;
    }

    // DE/AT legal requirements — look up the user's country once for all rules.
    let issuerLand: string = "CH";
    // Hoisted: the reverse-charge check below needs the same row, and reading
    // the profile twice would invite the two checks to disagree.
    let issuerProfile: { land?: string | null; uid_mwst?: string | null; kleinunternehmer?: boolean | null } | null = null;
    if (typ === "rechnung") {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("land, uid_mwst, kleinunternehmer")
        .eq("id", user.id)
        .maybeSingle();
      issuerProfile = userProfile ?? null;
      issuerLand = userProfile?.land || "CH";

      // Rechnungen must include Leistungsdatum in DE/AT
      if (!leistungsdatum && (issuerLand === "DE" || issuerLand === "AT")) {
        return json({
          error: "Leistungsdatum ist für Rechnungen in DE/AT gesetzlich erforderlich.",
        }, 400);
      }

      // AT §11 Abs. 1 Z 6 UStG: seller UID is mandatory on every invoice unless
      // the seller qualifies as Kleinunternehmer (§6 Abs. 1 Z 27 UStG).
      const sellerUid = typeof userProfile?.uid_mwst === "string" ? userProfile.uid_mwst.trim() : "";
      if (issuerLand === "AT" && !userProfile?.kleinunternehmer && !sellerUid) {
        return json({
          error: "Für österreichische Rechnungen ist die eigene UID-Nummer im Profil gesetzlich erforderlich (§11 UStG).",
        }, 400);
      }

      // AT §11 Abs. 1 Z 8 UStG: invoices ≥ EUR 10.000 gross require the
      // recipient's UID. Enforce at the API boundary, not only in the Zod schema,
      // so clients cannot bypass by omitting the field client-side.
      const recipientUid = typeof kunde?.uid_mwst === "string" ? kunde.uid_mwst.trim() : "";
      if (issuerLand === "AT" && betragNum >= 10_000 && !recipientUid) {
        return json({
          error: "Für österreichische Rechnungen ab EUR 10.000 ist die UID des Empfängers gesetzlich erforderlich.",
        }, 400);
      }
    }

    // ── Reverse charge (§13b UStG) ────────────────────────────────────────
    // Validated at the API boundary, not only in the form: a reverse-charge
    // invoice that is missing either VAT id produces an e-invoice the recipient's
    // system will reject (EN 16931 BR-AE-02 ff.), and one issued for the wrong
    // country or by a Kleinunternehmer is a tax question this application must
    // not answer on the user's behalf.
    let normalizedSteuerfall: Steuerfall = "standard";
    let normalizedUst1tgDatum: string | null = null;
    let normalizedUst1tgReferenz: string | null = null;

    if (steuerfall !== undefined && steuerfall !== null && steuerfall !== "standard") {
      if (typeof steuerfall !== "string" || !isReverseCharge(steuerfall)) {
        return json({ error: "Unbekannter Steuerfall." }, 400);
      }
      if (typ !== "rechnung") {
        return json({ error: "Reverse Charge ist nur für Rechnungen möglich." }, 422);
      }

      const eligibility = checkReverseChargeEligibility({
        steuerfall,
        land: issuerProfile?.land ?? undefined,
        sellerVatId: issuerProfile?.uid_mwst,
        buyerVatId: kunde?.uid_mwst,
        kleinunternehmer: issuerProfile?.kleinunternehmer ?? undefined,
      });
      if (!eligibility.ok) {
        return json({ error: eligibility.message, code: eligibility.code }, 422);
      }

      normalizedSteuerfall = steuerfall as Steuerfall;

      // Issuer's own evidence for the §13b call. Optional; validated only for
      // shape, since its content is a note about a paper certificate.
      if (ust1tgDatum !== undefined && ust1tgDatum !== null && ust1tgDatum !== "") {
        if (typeof ust1tgDatum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ust1tgDatum)) {
          return json({ error: "USt-1-TG-Datum muss YYYY-MM-DD sein." }, 400);
        }
        normalizedUst1tgDatum = ust1tgDatum;
      }
      if (ust1tgReferenz !== undefined && ust1tgReferenz !== null && ust1tgReferenz !== "") {
        if (typeof ust1tgReferenz !== "string" || ust1tgReferenz.length > 200) {
          return json({ error: "USt-1-TG-Referenz ist zu lang (max. 200 Zeichen)." }, 400);
        }
        normalizedUst1tgReferenz = stripControlChars(ust1tgReferenz);
      }
    }

    // ── Free-plan quota ───────────────────────────────────────────────────
    // Enforced here, not only in the client. The form calls
    // /api/dokument/check-limit before saving, but nothing stopped a direct
    // POST to this route from creating unlimited documents on the free plan.
    //
    // Only for NEW documents: re-saving an existing one is an edit, and
    // charging quota for it would let a user lose access to their own draft.
    // The counter is still incremented by the client after a successful save,
    // so this reads a value that has not yet counted the document being
    // created — hence >= rather than >.
    if (!existingDocumentId) {
      const { data: planProfile } = await supabase
        .from("profiles")
        .select("plan, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!hasActiveAccess(planProfile?.plan ?? "free", planProfile?.trial_ends_at ?? null)) {
        const now = new Date();
        const monat = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const { data: counter } = await supabase
          .from("dokument_counter")
          .select("anzahl")
          .eq("user_id", user.id)
          .eq("monat", monat)
          .maybeSingle();

        if ((counter?.anzahl ?? 0) >= FREE_LIMIT) {
          return json({ error: "Monatslimit erreicht", remaining: 0 }, 403);
        }
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

    if (customerError || !customerRecord) {
      logger.error("customer-upsert", customerError ?? new Error("customerRecord missing"));
      return json({ error: "Fehler beim Speichern des Kunden." }, 500);
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
    //
    // Single round-trip: fetch every nummer that starts with the candidate (the
    // candidate itself plus any "<candidate>-N" suffixes) and compute the first
    // free slot in memory. This avoids up to 100 sequential queries on a
    // colliding save.
    const userId = user.id;
    async function resolveUniqueNummer(candidate: string, currentDocumentId?: string | null): Promise<string> {
      const { data, error } = await admin
        .from("dokumente")
        .select("id, nummer")
        .eq("user_id", userId)
        .like("nummer", `${candidate}%`)
        .limit(200);

      if (error) {
        logger.error("dokument-save:number-check", error, { userId, candidate, currentDocumentId });
        // Fail safe: timestamp suffix guarantees uniqueness even if we can't read the table.
        return `${candidate}-${Date.now()}`;
      }

      const taken = new Set(
        (data || [])
          .filter((doc) => doc.id !== currentDocumentId)
          .map((doc) => doc.nummer),
      );

      if (!taken.has(candidate)) return candidate;
      for (let suffix = 1; suffix <= 99; suffix++) {
        const suffixed = `${candidate}-${suffix}`;
        if (!taken.has(suffixed)) return suffixed;
      }
      return `${candidate}-${Date.now()}`;
    }

    const resolvedNummer = await resolveUniqueNummer(nummer, existingDocumentId || null);
    // ---

    const relationNumber = sourceDocumentNummer || sourceDocumentNumber || null;
    const documentPayload: Record<string, unknown> = {
      user_id: user.id,
      typ,
      nummer: resolvedNummer,
      objekt,
      kundenname: customerSnapshot.name,
      customer_id: customerRecord.id,
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
      steuerfall: normalizedSteuerfall,
      ust1tg_datum: normalizedUst1tgDatum,
      ust1tg_referenz: normalizedUst1tgReferenz,
      source_document_id: sourceDocumentId || null,
      source_document_nummer: relationNumber,
      source_document_typ: sourceDocumentTyp || null,
    };

    // Only include carryover columns when the client actually sent them.
    // Omitting (rather than setting null) lets the column DEFAULT '[]' apply
    // for inserts and avoids overwriting existing values on partial updates.
    if (normalizedPositionen !== undefined) documentPayload.positionen = normalizedPositionen;
    if (normalizedMwstSatz !== undefined) documentPayload.mwst_satz = normalizedMwstSatz;
    if (rabatt !== undefined && rabatt !== null) documentPayload.rabatt = rabatt;
    if (notiz !== undefined && notiz !== null) documentPayload.notiz = notiz;
    if (normalizedPreisMode !== undefined) documentPayload.preis_mode = normalizedPreisMode;

    const { data: insertedDocument, error: dbError } = existingDocumentId
      ? await admin
          .from("dokumente")
          .update(documentPayload)
          .eq("id", existingDocumentId)
          .eq("user_id", user.id)
          .select("id, nummer, source_document_id, source_document_nummer, source_document_typ, customer_id, share_token")
          .single()
      : await admin
          .from("dokumente")
          .insert(documentPayload)
          .select("id, nummer, source_document_id, source_document_nummer, source_document_typ, customer_id, share_token")
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

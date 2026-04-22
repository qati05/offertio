import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/account/export
 *
 * GDPR Art. 20 — Right to data portability.
 * Exports all user data as a JSON file download:
 * - Profile
 * - Documents (metadata, no PDF binaries)
 * - Customers
 * - Templates (Vorlagen)
 *
 * Rate-limited to 5 requests per hour to prevent abuse.
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(request.url, origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const rl = await rateLimitAsync(`account-export:${user.id}`, 5, 3_600_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte warte eine Stunde." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    // Fetch all user data in parallel
    const [profileRes, dokumenteRes, customersRes, vorlagenRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "email, firmenname, vorname, nachname, adresse, plz, ort, telefon, iban, bic, uid_mwst, steuernummer, fn_nr, land, sprache, beruf, zahlungsfrist, plan, onboarding_complete, pdf_template, pdf_accent_color, kleinunternehmer, created_at",
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("dokumente")
          .select(
            "id, typ, nummer, objekt, kundenname, kunde_email, kunde_adresse, kunde_plz, kunde_ort, kunde_uid_mwst, betrag, datum, leistungsdatum, status, source_document_nummer, source_document_typ, created_at",
          )
          .eq("user_id", user.id)
          .order("datum", { ascending: false })
          .limit(10000),

        supabase
          .from("customers")
          .select(
            "display_name, email, adresse, adresse2, plz, ort, uid_mwst, created_at, updated_at",
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(10000),

        supabase
          .from("vorlagen")
          .select("name, beruf, positionen, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        format_version: 1,
        description:
          "Vollständiger Datenexport gemäss DSGVO Art. 20 (Recht auf Datenportabilität)",
      },
      profil: profileRes.data ?? null,
      dokumente: dokumenteRes.data ?? [],
      kunden: customersRes.data ?? [],
      vorlagen: vorlagenRes.data ?? [],
    };

    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().split("T")[0];

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="offertio-export-${timestamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("account:export", err);
    return NextResponse.json(
      { error: "Fehler beim Exportieren der Daten." },
      { status: 500 },
    );
  }
}

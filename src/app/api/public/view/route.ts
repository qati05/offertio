import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const SIGNED_URL_TTL = 60 * 60; // 1 hour (enough to view, short to limit leakage)

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * GET /api/public/view?token=<share_token>
 *
 * Public — no auth required. Returns limited document metadata + a short-lived
 * signed PDF URL so the recipient can view the document.
 *
 * Rate-limited by IP to prevent token enumeration.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`public-view:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429);
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    return json({ error: "Ungültiger Token." }, 400);
  }

  const admin = getSupabaseAdmin();

  const { data: doc, error: docErr } = await admin
    .from("dokumente")
    .select(`
      id, typ, nummer, objekt, kundenname,
      betrag, datum, status, pdf_url,
      user_id, share_token
    `)
    .eq("share_token", token)
    .maybeSingle();

  if (docErr) {
    logger.error("public-view:db", docErr);
    return json({ error: "Datenbankfehler" }, 500);
  }

  if (!doc) {
    return json({ error: "Dokument nicht gefunden oder Link abgelaufen." }, 404);
  }

  // Fetch sender profile for display (firmenname, adresse, etc.)
  const { data: profile } = await admin
    .from("profiles")
    .select("firmenname, vorname, nachname, adresse, plz, ort, telefon, uid_mwst, logo_url, land")
    .eq("id", doc.user_id)
    .maybeSingle();

  let pdfUrl: string | null = null;
  if (doc.pdf_url) {
    const { data: signed, error: signErr } = await admin.storage
      .from("pdfs")
      .createSignedUrl(doc.pdf_url, SIGNED_URL_TTL);

    if (signErr) {
      logger.error("public-view:sign-url", signErr);
    } else {
      pdfUrl = signed?.signedUrl ?? null;
    }
  }

  return json({
    id: doc.id,
    typ: doc.typ,
    nummer: doc.nummer,
    objekt: doc.objekt,
    kundenname: doc.kundenname,
    betrag: doc.betrag,
    datum: doc.datum,
    status: doc.status,
    pdfUrl,
    firmenname: profile?.firmenname ?? "",
    firmenAdresse: profile?.adresse ?? "",
    firmenPlz: profile?.plz ?? "",
    firmenOrt: profile?.ort ?? "",
    firmenTelefon: profile?.telefon ?? "",
    firmenLand: profile?.land ?? "CH",
    logoUrl: profile?.logo_url ?? null,
  });
}

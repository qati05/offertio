import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  FOUNDER_SETUP_BUCKET,
  detectLogo,
  detectPriceList,
  extensionMatches,
  parseFounderSetupPayload,
} from "@/lib/founder-setup";
import { sendOperatorEmail } from "@/lib/operator-mail";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

async function isFounder(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (profile?.plan === "lifetime") return true;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return false;
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("founder_seats")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

async function readOwnedFile(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  path: string,
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(FOUNDER_SETUP_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungültige Herkunft der Anfrage." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 32_000) {
    return json({ error: "Die Anfrage ist zu gross." }, 413);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet." }, 401);

  const rate = await rateLimitAsync(`founder-setup:${user.id}`, 5, 60 * 60 * 1000);
  if (!rate.ok) {
    return json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  if (!(await isFounder(supabase, user.id))) {
    return json({ error: "Nur ein bestätigter Gründerplatz kann Unterlagen schicken." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Angaben." }, 400);
  }

  const parsed = parseFounderSetupPayload(body, user.id);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const fields = parsed.fields;

  const [logoBytes, priceBytes] = await Promise.all([
    readOwnedFile(supabase, fields.logoPath),
    readOwnedFile(supabase, fields.preislistePath),
  ]);
  const logoKind = logoBytes ? detectLogo(logoBytes) : null;
  const priceKind = priceBytes ? detectPriceList(priceBytes) : null;
  const logoOk = Boolean(logoKind && extensionMatches(fields.logoPath, logoKind.ext));
  const priceOk = Boolean(priceKind && extensionMatches(fields.preislistePath, priceKind.ext));

  if (!logoOk || !priceOk) {
    await supabase.storage.from(FOUNDER_SETUP_BUCKET).remove([fields.logoPath, fields.preislistePath]);
    return json(
      {
        error: !logoOk
          ? "Das Logo muss eine PNG-, SVG- oder JPG-Datei sein."
          : "Die Preisliste muss eine Excel-, CSV-, PDF- oder Bilddatei sein.",
      },
      400,
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("founder_setup_submissions")
    .insert({
      id: fields.submissionId,
      user_id: user.id,
      firmenname: fields.firmenname,
      adresse: fields.adresse,
      plz: fields.plz,
      ort: fields.ort,
      telefon: fields.telefon,
      email: fields.email,
      iban: fields.iban,
      uid_mwst: fields.uidMwst,
      logo_path: fields.logoPath,
      preisliste_path: fields.preislistePath,
    })
    .select("id, submitted_at")
    .single();

  if (insertError || !row?.submitted_at) {
    logger.error("founder-setup:insert", insertError ?? "missing timestamp", { userId: user.id });
    await supabase.storage.from(FOUNDER_SETUP_BUCKET).remove([fields.logoPath, fields.preislistePath]);
    return json({ error: "Die Unterlagen konnten nicht gespeichert werden." }, 500);
  }

  const { data: earliest } = await supabase
    .from("founder_setup_submissions")
    .select("submitted_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const submittedAt = String(row.submitted_at);
  const guaranteeStartedAt = earliest?.submitted_at ? String(earliest.submitted_at) : submittedAt;

  const [logoSigned, priceSigned] = await Promise.all([
    supabase.storage.from(FOUNDER_SETUP_BUCKET).createSignedUrl(fields.logoPath, SIGNED_URL_SECONDS),
    supabase.storage.from(FOUNDER_SETUP_BUCKET).createSignedUrl(fields.preislistePath, SIGNED_URL_SECONDS),
  ]);

  const ip = getClientIp(request.headers);
  const mail = await sendOperatorEmail({
    submissionId: fields.submissionId,
    userId: user.id,
    firmenname: fields.firmenname,
    adresse: fields.adresse,
    plz: fields.plz,
    ort: fields.ort,
    telefon: fields.telefon,
    email: fields.email,
    iban: fields.iban,
    uidMwst: fields.uidMwst,
    submittedAt,
    guaranteeStartedAt,
    logoPath: fields.logoPath,
    preislistePath: fields.preislistePath,
    logoUrl: logoSigned.data?.signedUrl ?? null,
    preislisteUrl: priceSigned.data?.signedUrl ?? null,
  });

  if (!mail.sent) {
    logger.warn("founder-setup:email", "Operator-Mail nicht gesendet", { userId: user.id, ip });
  } else {
    logger.info("founder-setup:received", "Gründer-Unterlagen eingegangen", {
      userId: user.id,
      submissionId: fields.submissionId,
      submittedAt,
    });
  }

  return json({
    ok: true,
    submittedAt,
    guaranteeStartedAt,
    emailSent: mail.sent,
  });
}

import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { RecurringFrequency } from "@/lib/recurring";

const VALID_FREQUENCIES = new Set<RecurringFrequency>(["weekly", "monthly", "quarterly", "yearly"]);

/**
 * GET /api/recurring
 * Lists all recurring schedules owned by the authenticated user.
 * Joins the template's nummer + kundenname so the UI can label each entry
 * without a second round-trip.
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data, error } = await supabase
    .from("recurring_schedules")
    .select(
      "id, template_dokument_id, frequency, next_generation_at, last_generated_at, end_date, active, created_at",
    )
    .eq("user_id", user.id)
    .order("active", { ascending: false })
    .order("next_generation_at", { ascending: true });

  if (error) {
    logger.error("recurring:list", error);
    return json({ error: "Datenbankfehler." }, 500);
  }

  // Second round-trip to pull template label info — we keep it separate from
  // the schedules query because PostgREST joins require FK metadata that may
  // not be refreshed on the client's schema cache right after the migration.
  const templateIds = Array.from(
    new Set((data ?? []).map((row) => row.template_dokument_id).filter((x): x is string => !!x)),
  );
  const templatesById: Record<string, { nummer: string; kundenname: string }> = {};
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("dokumente")
      .select("id, nummer, kundenname")
      .in("id", templateIds);
    for (const t of templates ?? []) {
      templatesById[t.id] = { nummer: t.nummer, kundenname: t.kundenname };
    }
  }

  const schedules = (data ?? []).map((row) => ({
    ...row,
    template: row.template_dokument_id ? templatesById[row.template_dokument_id] ?? null : null,
  }));

  return json({ schedules });
}

/**
 * POST /api/recurring
 * Creates a new schedule backed by an existing Rechnung.
 * Body: { template_dokument_id, frequency, next_generation_at, end_date? }
 */
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Forbidden" }, 403);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rl = await rateLimitAsync(`recurring:create:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültiges JSON." }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({ error: "Ungültiger Body." }, 400);
  }

  const { template_dokument_id, frequency, next_generation_at, end_date } = body as Record<string, unknown>;

  if (typeof template_dokument_id !== "string" || !isValidUUID(template_dokument_id)) {
    return json({ error: "Ungültige template_dokument_id." }, 400);
  }

  if (typeof frequency !== "string" || !VALID_FREQUENCIES.has(frequency as RecurringFrequency)) {
    return json({ error: "Ungültige frequency." }, 400);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof next_generation_at !== "string" || !dateRegex.test(next_generation_at)) {
    return json({ error: "next_generation_at muss YYYY-MM-DD sein." }, 400);
  }

  let endDateValue: string | null = null;
  if (end_date !== undefined && end_date !== null && end_date !== "") {
    if (typeof end_date !== "string" || !dateRegex.test(end_date)) {
      return json({ error: "end_date muss YYYY-MM-DD sein." }, 400);
    }
    if (end_date < next_generation_at) {
      return json({ error: "end_date darf nicht vor dem Startdatum liegen." }, 400);
    }
    endDateValue = end_date;
  }

  // Verify the template dokument belongs to the user AND is a Rechnung.
  // Offerten cannot be recurred — they don't carry "period" semantics.
  const { data: template, error: templateErr } = await supabase
    .from("dokumente")
    .select("id, typ")
    .eq("id", template_dokument_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateErr) {
    logger.error("recurring:template-check", templateErr);
    return json({ error: "Datenbankfehler." }, 500);
  }

  if (!template) {
    return json({ error: "Vorlage-Dokument nicht gefunden." }, 404);
  }

  if (template.typ !== "rechnung") {
    return json({ error: "Nur Rechnungen können als Serie angelegt werden." }, 422);
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("recurring_schedules")
    .insert({
      user_id: user.id,
      template_dokument_id,
      frequency,
      next_generation_at,
      end_date: endDateValue,
      active: true,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    logger.error("recurring:insert", insertErr ?? new Error("insert returned no row"));
    return json({ error: "Serie konnte nicht angelegt werden." }, 500);
  }

  return json({ ok: true, id: inserted.id }, 201);
}

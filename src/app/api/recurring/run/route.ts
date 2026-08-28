import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAllowedOrigin } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { advanceByFrequency, type RecurringFrequency } from "@/lib/recurring";

const MAX_GENERATED_PER_RUN = 50;

/** Return today's date in the user's locale as YYYY-MM-DD.
 *  We intentionally use the server's local time (typically UTC on Vercel) —
 *  schedules are coarse (day-level) and TZ drift of a few hours doesn't
 *  meaningfully change which schedules are due. */
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Resolve the next free `nummer` for the user.
 *  Strategy: start from `${baseNummer}-${periodTag}`, then append -1, -2, … if
 *  collisions exist. Single query fetches every existing nummer that starts
 *  with the candidate to compute the free slot in memory. */
async function resolveUniqueNummer(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  baseNummer: string,
  periodTag: string,
): Promise<string> {
  const candidate = `${baseNummer}-${periodTag}`;
  const { data, error } = await admin
    .from("dokumente")
    .select("nummer")
    .eq("user_id", userId)
    .like("nummer", `${candidate}%`)
    .limit(200);

  if (error) {
    // Timestamp suffix guarantees uniqueness even if read fails.
    return `${candidate}-${Date.now()}`;
  }

  const taken = new Set((data ?? []).map((r) => r.nummer));
  if (!taken.has(candidate)) return candidate;
  for (let i = 1; i <= 99; i++) {
    const s = `${candidate}-${i}`;
    if (!taken.has(s)) return s;
  }
  return `${candidate}-${Date.now()}`;
}

interface TemplateRow {
  id: string;
  user_id: string;
  nummer: string;
  typ: string;
  kundenname: string;
  customer_id: string | null;
  kunde_email: string | null;
  kunde_adresse: string | null;
  kunde_adresse2: string | null;
  kunde_plz: string | null;
  kunde_ort: string | null;
  kunde_uid_mwst: string | null;
  objekt: string | null;
  betrag: number | null;
  positionen: unknown[] | null;
  mwst_satz: number | null;
  rabatt: unknown;
  notiz: string | null;
  preis_mode: string | null;
  leistungsdatum: string | null;
}

/**
 * POST /api/recurring/run
 *
 * User-scoped generator: runs all due schedules for the authenticated user
 * and spawns draft Rechnungen. We deliberately keep the generator manual
 * (and user-scoped) in the MVP; a Vercel Cron entry can hit this with a
 * service token later to automate it.
 *
 * For each due schedule:
 *   1. Load the template dokument and sanity-check ownership + typ='rechnung'.
 *   2. Insert a fresh dokument row with:
 *        - status = 'entwurf'  (user reviews before sending)
 *        - nummer = template.nummer + period tag (uniqueness resolved)
 *        - datum   = today
 *        - leistungsdatum = schedule's next_generation_at (what the invoice is for)
 *        - recurring_schedule_id = schedule.id
 *      Everything else (positions, mwst, rabatt, notiz, kunde_*) is cloned.
 *   3. Advance next_generation_at by the cadence.
 *   4. If the new next_generation_at passes end_date, mark the schedule inactive.
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

  // Tight rate limit — this is an expensive endpoint (N inserts per call).
  const rl = await rateLimitAsync(`recurring:run:${user.id}`, 6, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  const today = todayIso();
  const admin = getSupabaseAdmin();

  // Fetch all due schedules for this user in one round-trip.
  const { data: schedules, error: scheduleErr } = await admin
    .from("recurring_schedules")
    .select("id, template_dokument_id, frequency, next_generation_at, end_date, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .lte("next_generation_at", today)
    .limit(MAX_GENERATED_PER_RUN);

  if (scheduleErr) {
    logger.error("recurring:run:list", scheduleErr);
    return json({ error: "Datenbankfehler." }, 500);
  }

  if (!schedules || schedules.length === 0) {
    return json({ ok: true, generated: 0, skipped: 0, schedules: [] });
  }

  // Pull all referenced templates in one query.
  const templateIds = Array.from(
    new Set(schedules.map((s) => s.template_dokument_id).filter((x): x is string => !!x)),
  );

  let templates: TemplateRow[] = [];
  if (templateIds.length > 0) {
    const { data: tplData, error: tplErr } = await admin
      .from("dokumente")
      .select(
        "id, user_id, nummer, typ, kundenname, customer_id, kunde_email, kunde_adresse, kunde_adresse2, kunde_plz, kunde_ort, kunde_uid_mwst, objekt, betrag, positionen, mwst_satz, rabatt, notiz, preis_mode, leistungsdatum",
      )
      .in("id", templateIds)
      .eq("user_id", user.id);

    if (tplErr) {
      logger.error("recurring:run:templates", tplErr);
      return json({ error: "Datenbankfehler." }, 500);
    }
    templates = (tplData ?? []) as TemplateRow[];
  }
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const results: Array<{ schedule_id: string; status: "generated" | "skipped"; reason?: string; new_document_id?: string }> = [];
  let generated = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const tpl = schedule.template_dokument_id ? templateById.get(schedule.template_dokument_id) : null;

    // Template deleted or doesn't exist — pause the schedule so we don't
    // keep retrying. The user can fix the template ref or delete the schedule.
    if (!tpl) {
      await admin.from("recurring_schedules").update({ active: false, updated_at: new Date().toISOString() }).eq("id", schedule.id);
      results.push({ schedule_id: schedule.id, status: "skipped", reason: "template_missing" });
      skipped++;
      continue;
    }

    // Defensive: only Rechnungen can spawn Rechnungen.
    if (tpl.typ !== "rechnung") {
      await admin.from("recurring_schedules").update({ active: false, updated_at: new Date().toISOString() }).eq("id", schedule.id);
      results.push({ schedule_id: schedule.id, status: "skipped", reason: "template_wrong_type" });
      skipped++;
      continue;
    }

    const period = schedule.next_generation_at; // YYYY-MM-DD
    const periodTag = period.slice(0, 7); // YYYY-MM — coarse tag for the nummer suffix
    const nummer = await resolveUniqueNummer(admin, user.id, tpl.nummer, periodTag);

    // Build the new dokument payload — strip template's transient fields
    // (id, nummer, datum, status, etc.) and replace with schedule-specific values.
    const newDoc: Record<string, unknown> = {
      user_id: user.id,
      typ: "rechnung",
      nummer,
      objekt: tpl.objekt,
      kundenname: tpl.kundenname,
      customer_id: tpl.customer_id,
      kunde_email: tpl.kunde_email,
      kunde_adresse: tpl.kunde_adresse,
      kunde_adresse2: tpl.kunde_adresse2,
      kunde_plz: tpl.kunde_plz,
      kunde_ort: tpl.kunde_ort,
      kunde_uid_mwst: tpl.kunde_uid_mwst,
      betrag: tpl.betrag ?? 0,
      datum: today,
      // Leistungsdatum: the period the invoice is "for" — better semantics than
      // today. DE/AT legal requirement, copied from template when present.
      leistungsdatum: tpl.leistungsdatum ?? period,
      positionen: tpl.positionen ?? [],
      mwst_satz: tpl.mwst_satz,
      rabatt: tpl.rabatt,
      notiz: tpl.notiz,
      preis_mode: tpl.preis_mode,
      status: "entwurf",
      recurring_schedule_id: schedule.id,
    };

    const { data: inserted, error: insertErr } = await admin
      .from("dokumente")
      .insert(newDoc)
      .select("id")
      .single();

    if (insertErr || !inserted) {
      logger.error("recurring:run:insert", insertErr ?? new Error("no row"), { scheduleId: schedule.id });
      results.push({ schedule_id: schedule.id, status: "skipped", reason: "insert_failed" });
      skipped++;
      continue;
    }

    // Advance next_generation_at. If the new date passes end_date, deactivate.
    const nextDate = advanceByFrequency(schedule.next_generation_at, schedule.frequency as RecurringFrequency);
    const passesEnd = schedule.end_date ? nextDate > schedule.end_date : false;
    const scheduleUpdate: Record<string, unknown> = {
      last_generated_at: new Date().toISOString(),
      next_generation_at: nextDate,
      updated_at: new Date().toISOString(),
    };
    if (passesEnd) scheduleUpdate.active = false;

    const { error: advanceErr } = await admin
      .from("recurring_schedules")
      .update(scheduleUpdate)
      .eq("id", schedule.id)
      .eq("user_id", user.id);

    if (advanceErr) {
      // Log but don't fail the whole run — the invoice is already saved.
      // A subsequent run with the stale next_generation_at would double-generate,
      // so we treat this as a generator error and surface it.
      logger.error("recurring:run:advance", advanceErr, { scheduleId: schedule.id });
    }

    results.push({ schedule_id: schedule.id, status: "generated", new_document_id: inserted.id });
    generated++;
  }

  return json({ ok: true, generated, skipped, schedules: results });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { RecurringFrequency } from "@/lib/recurring";

const VALID_FREQUENCIES = new Set<RecurringFrequency>(["weekly", "monthly", "quarterly", "yearly"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

/**
 * PATCH /api/recurring/[id]
 * Updates a schedule. Only the fields present in the body are changed so a
 * single endpoint can toggle `active`, bump the frequency, or set/clear the
 * end date. We deliberately do NOT allow changing template_dokument_id —
 * that would change the semantic source of the series; delete + recreate
 * instead.
 *
 * DELETE /api/recurring/[id]
 * Hard-deletes the schedule. Already-generated invoices keep their
 * `recurring_schedule_id` (the FK uses ON DELETE SET NULL) so history is
 * preserved.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Forbidden" }, 403);
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return json({ error: "Ungültige id." }, 400);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rl = await rateLimitAsync(`recurring:update:${user.id}`, 30, 60_000);
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

  const { active, frequency, next_generation_at, end_date } = body as Record<string, unknown>;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (active !== undefined) {
    if (typeof active !== "boolean") {
      return json({ error: "active muss boolean sein." }, 400);
    }
    updates.active = active;
  }

  if (frequency !== undefined) {
    if (typeof frequency !== "string" || !VALID_FREQUENCIES.has(frequency as RecurringFrequency)) {
      return json({ error: "Ungültige frequency." }, 400);
    }
    updates.frequency = frequency;
  }

  if (next_generation_at !== undefined) {
    if (typeof next_generation_at !== "string" || !DATE_RE.test(next_generation_at)) {
      return json({ error: "next_generation_at muss YYYY-MM-DD sein." }, 400);
    }
    updates.next_generation_at = next_generation_at;
  }

  if (end_date !== undefined) {
    if (end_date === null || end_date === "") {
      updates.end_date = null;
    } else if (typeof end_date === "string" && DATE_RE.test(end_date)) {
      updates.end_date = end_date;
    } else {
      return json({ error: "end_date muss YYYY-MM-DD oder null sein." }, 400);
    }
  }

  // Require at least one meaningful field (beyond updated_at) to avoid no-op writes.
  if (Object.keys(updates).length === 1) {
    return json({ error: "Keine Änderungen angegeben." }, 400);
  }

  const { data, error } = await supabase
    .from("recurring_schedules")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error("recurring:update", error);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!data) {
    return json({ error: "Serie nicht gefunden." }, 404);
  }

  return json({ ok: true, id: data.id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Forbidden" }, 403);
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return json({ error: "Ungültige id." }, 400);
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rl = await rateLimitAsync(`recurring:delete:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  const { data, error } = await supabase
    .from("recurring_schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error("recurring:delete", error);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!data) {
    return json({ error: "Serie nicht gefunden." }, 404);
  }

  return json({ ok: true });
}

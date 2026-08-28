import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const MAX_MAHNSTUFE = 3;

/**
 * POST /api/dokument/mahnung
 *
 * Escalate the Mahnstufe of a Rechnung.
 *
 * Body:
 *   { id: string, stage?: 1|2|3 }   // explicit target stage; defaults to current+1
 *
 * Rules:
 *   * Only rechnung-type docs.
 *   * Cannot escalate a paid invoice (status === 'bezahlt').
 *   * Cannot regress — the target must be strictly greater than current mahnstufe.
 *   * Maximum stage is 3 (2. Mahnung / letzte Mahnung). Anything further goes
 *     to a collection agency, outside this app's scope.
 *   * Stamps last_mahnung_at with the server's clock.
 *   * Also flips status to 'ueberfaellig' if it was still 'gesendet' — sending
 *     a Mahnung implies the invoice is past due.
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

  const rl = await rateLimitAsync(`mahnung:${user.id}`, 30, 60_000);
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

  const { id, stage } = body as Record<string, unknown>;

  if (typeof id !== "string" || !isValidUUID(id)) {
    return json({ error: "Ungültige id." }, 400);
  }

  if (stage !== undefined) {
    if (typeof stage !== "number" || !Number.isInteger(stage) || stage < 1 || stage > MAX_MAHNSTUFE) {
      return json({ error: `stage muss 1..${MAX_MAHNSTUFE} sein.` }, 400);
    }
  }

  const { data: current, error: readErr } = await supabase
    .from("dokumente")
    .select("id, typ, status, mahnstufe, payment_received_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readErr) {
    logger.error("mahnung:read", readErr);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!current) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }
  if (current.typ !== "rechnung") {
    return json({ error: "Mahnungen gelten nur für Rechnungen." }, 422);
  }
  if (current.status === "bezahlt" || current.payment_received_at) {
    return json({ error: "Bezahlte Rechnungen können nicht gemahnt werden." }, 422);
  }

  const currentStufe = typeof current.mahnstufe === "number" ? current.mahnstufe : 0;
  const target = typeof stage === "number" ? stage : Math.min(currentStufe + 1, MAX_MAHNSTUFE);

  if (target <= currentStufe) {
    return json({ error: `Mahnstufe ${target} ist bereits erreicht (aktuell: ${currentStufe}).` }, 422);
  }

  const updates: Record<string, unknown> = {
    mahnstufe: target,
    last_mahnung_at: new Date().toISOString(),
  };
  // Sending a Mahnung implies overdue. Only overwrite gesendet — respect
  // angenommen/entwurf if somehow set, those are manual states.
  if (current.status === "gesendet") {
    updates.status = "ueberfaellig";
  }

  const { data, error } = await supabase
    .from("dokumente")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, mahnstufe, last_mahnung_at, status")
    .maybeSingle();

  if (error) {
    logger.error("mahnung:update", error);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!data) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }

  return json({ ok: true, document: data, stage: target });
}

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

/**
 * PATCH /api/dokument/mark-paid
 *
 * Marks a Rechnung as paid. Sets status = 'bezahlt' and stamps
 * payment_received_at. Also resets mahnstufe so the invoice stops appearing
 * in overdue-reminder lists.
 *
 * Body:
 *   { id: string, paid_at?: string }   // paid_at optional (ISO date), defaults to now
 *
 * Idempotency: if already bezahlt, returns ok=true without overwriting the
 * original payment timestamp — this preserves the audit trail if the button
 * is clicked twice.
 */
export async function PATCH(request: NextRequest) {
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

  const rl = await rateLimitAsync(`mark-paid:${user.id}`, 30, 60_000);
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

  const { id, paid_at } = body as Record<string, unknown>;

  if (typeof id !== "string" || !isValidUUID(id)) {
    return json({ error: "Ungültige id." }, 400);
  }

  let paidAtIso: string;
  if (paid_at === undefined || paid_at === null || paid_at === "") {
    paidAtIso = new Date().toISOString();
  } else if (typeof paid_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(paid_at)) {
    // Date-only input is interpreted as end-of-day in local time; use UTC noon
    // so the timestamp sits cleanly inside the paid day regardless of TZ.
    paidAtIso = new Date(`${paid_at}T12:00:00Z`).toISOString();
  } else if (typeof paid_at === "string" && !Number.isNaN(Date.parse(paid_at))) {
    paidAtIso = new Date(paid_at).toISOString();
  } else {
    return json({ error: "Ungültiges paid_at." }, 400);
  }

  // Fetch current state so we can respect idempotency on double-click.
  const { data: current, error: readErr } = await supabase
    .from("dokumente")
    .select("id, typ, status, payment_received_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readErr) {
    logger.error("mark-paid:read", readErr);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!current) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }
  if (current.typ !== "rechnung") {
    return json({ error: "Nur Rechnungen können als bezahlt markiert werden." }, 422);
  }

  // Already paid — preserve original timestamp, return success.
  if (current.status === "bezahlt" && current.payment_received_at) {
    return json({ ok: true, alreadyPaid: true, payment_received_at: current.payment_received_at });
  }

  const { data, error } = await supabase
    .from("dokumente")
    .update({
      status: "bezahlt",
      payment_received_at: paidAtIso,
      // Clear Mahnstufe so collection workflow stops.
      mahnstufe: 0,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status, payment_received_at, mahnstufe")
    .maybeSingle();

  if (error) {
    logger.error("mark-paid:update", error);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!data) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }

  return json({ ok: true, document: data });
}

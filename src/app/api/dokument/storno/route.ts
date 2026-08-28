import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkStornoTransition } from "@/lib/dokument-immutability";
import { isAllowedOrigin, isValidUUID, stripControlChars } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const MAX_GRUND_LENGTH = 300;

/**
 * POST /api/dokument/storno
 *
 * Cancels an issued invoice. Body: { id: string; grund?: string }
 *
 * Cancellation is how a wrong invoice is corrected: the original stays exactly
 * as it was issued, is marked cancelled, and a new invoice is written. It is
 * deliberately terminal and deliberately does NOT free the invoice number —
 * reusing a number for different content is what the whole rule exists to
 * prevent.
 *
 * A separate endpoint rather than a case inside update-status, because this is
 * not an ordinary status change: it is irreversible, it stamps a timestamp, and
 * it is the one transition that must never be reachable by accident.
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
    return json({ error: "Nicht angemeldet." }, 401);
  }

  const rl = await rateLimitAsync(`storno:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, {
      "Retry-After": String(rl.retryAfterSeconds),
    });
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

  const { id, grund } = body as Record<string, unknown>;
  if (typeof id !== "string" || !isValidUUID(id)) {
    return json({ error: "Ungültige Dokument-ID." }, 400);
  }

  let normalizedGrund: string | null = null;
  if (grund !== undefined && grund !== null && grund !== "") {
    if (typeof grund !== "string" || grund.length > MAX_GRUND_LENGTH) {
      return json({ error: `Grund ist zu lang (max. ${MAX_GRUND_LENGTH} Zeichen).` }, 400);
    }
    normalizedGrund = stripControlChars(grund) || null;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("dokumente")
    .select("id, typ, status, nummer")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    logger.error("storno:lookup", lookupError);
    return json({ error: "Datenbankfehler." }, 500);
  }
  if (!existing) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }

  const transition = checkStornoTransition({
    typ: existing.typ,
    currentStatus: existing.status,
  });
  if (!transition.ok) {
    return json({ error: transition.message, code: transition.code }, 409);
  }

  // Guard the transition in the WHERE clause as well as in the check above.
  // Two tabs cancelling the same invoice would otherwise both succeed, and the
  // second would overwrite the first cancellation's timestamp.
  const { data: updated, error: updateError } = await supabase
    .from("dokumente")
    .update({
      status: "storniert",
      storniert_at: new Date().toISOString(),
      storno_grund: normalizedGrund,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "storniert")
    .select("id, nummer, status, storniert_at")
    .maybeSingle();

  if (updateError) {
    logger.error("storno:update", updateError, { documentId: id });
    return json({ error: "Stornierung fehlgeschlagen." }, 500);
  }
  if (!updated) {
    // The row moved to 'storniert' between the check and the update.
    return json({ error: "Diese Rechnung ist bereits storniert.", code: "already_cancelled" }, 409);
  }

  return json({ ok: true, document: updated });
}

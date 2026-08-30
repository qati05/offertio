import type { NextRequest } from "next/server";
import { json } from "@/lib/api-response";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID, sanitize } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { checkStatusTransition } from "@/lib/status-transitions";

const VALID_STATUSES = new Set([
  "entwurf",
  "gesendet",
  "angenommen",
  "abgelaufen",
  "bezahlt",
  "ueberfaellig",
]);

/**
 * PATCH /api/dokument/update-status
 * Updates the status of a single document owned by the authenticated user.
 *
 * Body: { id: string; status: DokumentStatus }
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

  const rl = await rateLimitAsync(`update-status:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return json({ error: "Zu viele Anfragen." }, 429, { "Retry-After": String(rl.retryAfterSeconds) });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }

  const { id, status } = body as Record<string, unknown>;

  if (typeof id !== "string" || !isValidUUID(id)) {
    return json({ error: "id must be a valid UUID" }, 400);
  }

  if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
    return json(
      { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
      400,
    );
  }

  // Where the document is coming from decides whether it may go there at all.
  // Validating only the TARGET status left the archive's dropdown able to move
  // an issued invoice back to "entwurf", which switches off the immutability
  // check in /api/dokument/save — one click, and the next save may rewrite
  // Betrag, Nummer and Kunde. Read the stored row first.
  const { data: current, error: currentError } = await supabase
    .from("dokumente")
    .select("status, typ")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (currentError) {
    logger.error("update-status:read", currentError, { documentId: id });
    return json({ error: "Database error" }, 500);
  }
  if (!current) {
    return json({ error: "Dokument nicht gefunden." }, 404);
  }

  const transition = checkStatusTransition({
    typ: current.typ ?? "rechnung",
    currentStatus: current.status,
    nextStatus: status,
  });
  if (!transition.ok) {
    // 409, not the 500 the CHECK constraint from migration 033 would otherwise
    // produce: the user gets told why, in German.
    return json({ error: transition.message, code: transition.code }, 409);
  }

  // RLS ensures only the owner can update their own documents.
  const { data, error } = await supabase
    .from("dokumente")
    .update({ status: sanitize(status) })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status, nummer")
    .maybeSingle();

  if (error) {
    logger.error("update-status", error);
    return json({ error: "Database error" }, 500);
  }

  if (!data) {
    return json({ error: "Document not found" }, 404);
  }

  return json({ ok: true, document: data });
}

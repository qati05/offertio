import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isAllowedOrigin, isValidUUID, sanitize } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const VALID_STATUSES = new Set([
  "entwurf",
  "gesendet",
  "angenommen",
  "abgelaufen",
  "bezahlt",
  "ueberfaellig",
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

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
    return json({ error: "Zu viele Anfragen." }, 429);
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

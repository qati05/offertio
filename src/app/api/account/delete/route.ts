import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isAllowedOrigin } from "@/lib/security";
import { logger } from "@/lib/logger";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungültige Herkunft der Anfrage." }, 403);
  }

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ error: "Nicht angemeldet." }, 401);
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      logger.error("account:delete", error);
      return json({ error: "Konto konnte nicht gelöscht werden." }, 500);
    }

    return json({ success: true });
  } catch (err) {
    logger.error("account:delete:unexpected", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

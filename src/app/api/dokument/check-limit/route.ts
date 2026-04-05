import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { FREE_LIMIT, isPro } from "@/lib/payment";
import { isAllowedOrigin } from "@/lib/security";
import { logger } from "@/lib/logger";

function getCurrentMonat(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET: Check if user can create a document (server-side free limit).
 * POST: Increment the server-side document counter.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Nicht angemeldet" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan = profile?.plan || "free";

    if (isPro(plan)) {
      return json({ allowed: true, remaining: Infinity, plan });
    }

    const monat = getCurrentMonat();
    const { data: counter } = await supabase
      .from("dokument_counter")
      .select("anzahl")
      .eq("user_id", user.id)
      .eq("monat", monat)
      .maybeSingle();

    const anzahl = counter?.anzahl || 0;
    const remaining = Math.max(0, FREE_LIMIT - anzahl);

    return json({
      allowed: anzahl < FREE_LIMIT,
      remaining,
      plan,
      used: anzahl,
    });
  } catch (err) {
    logger.error("check-limit:GET", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungueltige Herkunft der Anfrage." }, 403);
  }

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Nicht angemeldet" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan = profile?.plan || "free";
    const monat = getCurrentMonat();

    // Pre-flight check for free users to avoid incrementing a blocked counter.
    if (!isPro(plan)) {
      const { data: counter } = await supabase
        .from("dokument_counter")
        .select("anzahl")
        .eq("user_id", user.id)
        .eq("monat", monat)
        .maybeSingle();

      if ((counter?.anzahl || 0) >= FREE_LIMIT) {
        return json({ error: "Monatslimit erreicht", remaining: 0 }, 403);
      }
    }

    // Atomic upsert - avoids the TOCTOU race condition of SELECT + UPDATE/INSERT.
    const { data: newAnzahl, error: rpcError } = await supabase.rpc(
      "increment_dokument_counter",
      { p_user_id: user.id, p_monat: monat }
    );

    if (rpcError) {
      // P0001 = limit_exceeded raised inside increment_dokument_counter
      if (rpcError.code === "P0001") {
        return json({ error: "Monatslimit erreicht", remaining: 0 }, 403);
      }
      logger.error("check-limit:POST:rpc", rpcError, { userId: user.id });
      return json({ error: "Server-Fehler" }, 500);
    }

    return json({
      ok: true,
      used: newAnzahl,
      remaining: isPro(plan) ? Infinity : Math.max(0, FREE_LIMIT - (newAnzahl as number)),
    });
  } catch (err) {
    logger.error("check-limit:POST", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

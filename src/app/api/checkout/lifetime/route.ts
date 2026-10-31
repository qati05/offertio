import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/site";
import {
  FOUNDER_SEAT_HOLD_SECONDS,
  getFounderSeatLimit,
  isStripeCheckoutConfigured,
  seatLimitParam,
} from "@/lib/stripe-billing";
import { LIFETIME_PRICE_CHF, LIFETIME_PRODUCT_NAME } from "@/lib/payment";
import { openLifetimeCheckout, reuseOpenCheckoutSession } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

const CHECKOUT_TTL_SECONDS = 23 * 60 * 60;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function checkoutBaseUrl(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(request.url, origin)) {
    return origin.replace(/\/+$/, "");
  }
  return SITE_URL;
}

type SeatReservation = {
  ok?: boolean;
  reason?: string;
  session_id?: string | null;
  taken?: number;
  limit?: number | null;
};

type SeatAvailability = {
  taken?: number;
  limit?: number | null;
  sold_out?: boolean;
  remaining?: number | null;
};

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Nicht angemeldet" }, 401);

    const configured = isStripeCheckoutConfigured();
    const seatLimit = getFounderSeatLimit();
    const payload = {
      configured,
      priceChf: LIFETIME_PRICE_CHF,
      currency: "CHF",
      productName: LIFETIME_PRODUCT_NAME,
      seatLimit,
      soldOut: false,
      remaining: null as number | null,
      alreadyLifetime: false,
    };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(payload);
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    payload.alreadyLifetime = profile?.plan === "lifetime";

    const { data, error } = await admin.rpc("founder_seat_availability", {
      p_seat_limit: seatLimitParam(seatLimit),
    });
    if (!error && data && typeof data === "object") {
      const availability = data as SeatAvailability;
      payload.soldOut = Boolean(availability.sold_out);
      payload.remaining =
        typeof availability.remaining === "number" ? availability.remaining : null;
    }

    return json(payload);
  } catch (err) {
    logger.error("checkout:lifetime:get", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.url, request.headers.get("origin"))) {
    return json({ error: "Ungueltige Herkunft der Anfrage." }, 403);
  }

  const ip = getClientIp(request.headers);
  const rate = await rateLimitAsync(`checkout:lifetime:${ip}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  if (!isStripeCheckoutConfigured()) {
    return json(
      {
        error: "Zahlungsfreischaltung folgt. Du kannst Offertio bis dahin im Free-Plan weiter nutzen.",
        configured: false,
      },
      503,
    );
  }

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Nicht angemeldet" }, 401);

    const admin = getSupabaseAdmin();
    const seatLimit = seatLimitParam(getFounderSeatLimit());
    const { data, error } = await admin.rpc("reserve_founder_seat", {
      p_user_id: user.id,
      p_seat_limit: seatLimit,
      p_hold_seconds: FOUNDER_SEAT_HOLD_SECONDS,
    });

    if (error) {
      logger.error("checkout:lifetime:reserve", error, { userId: user.id });
      return json({ error: "Zahlungen sind noch nicht bereit. Die Datenbank-Migration fehlt oder ist fehlgeschlagen." }, 503);
    }

    const reservation = (data ?? {}) as SeatReservation;
    if (!reservation.ok && reservation.reason === "sold_out") {
      return json({ error: "Alle Gründerplätze sind vergeben.", soldOut: true }, 409);
    }
    if (reservation.reason === "already_lifetime") {
      return json({ alreadyLifetime: true });
    }
    if (!reservation.ok) {
      logger.error("checkout:lifetime:reserve-rejected", reservation.reason ?? "unknown", { userId: user.id });
      return json({ error: "Checkout konnte nicht gestartet werden." }, 409);
    }

    if (reservation.session_id) {
      const existingUrl = await reuseOpenCheckoutSession(reservation.session_id);
      if (existingUrl) return json({ url: existingUrl, reused: true });
    }

    const base = checkoutBaseUrl(request);
    let session: { id: string; url: string; twintOffered: boolean };
    try {
      session = await openLifetimeCheckout({
        userId: user.id,
        email: user.email,
        successUrl: `${base}/einrichtung?checkout=erfolg`,
        cancelUrl: `${base}/einstellungen/abonnement?checkout=abgebrochen`,
        expiresAt: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
      });
    } catch (err) {
      logger.error("checkout:lifetime:stripe", err, { userId: user.id });
      await admin.rpc("release_founder_reservation", { p_user_id: user.id });
      return json({ error: "Checkout konnte nicht gestartet werden." }, 502);
    }

    const { error: attachError } = await admin.rpc("attach_founder_checkout_session", {
      p_user_id: user.id,
      p_session_id: session.id,
    });
    if (attachError) {
      logger.error("checkout:lifetime:attach", attachError, { userId: user.id, sessionId: session.id });
    }

    logger.info("checkout:lifetime:created", "Checkout-Session erstellt", {
      userId: user.id,
      sessionId: session.id,
      twintOffered: session.twintOffered,
    });

    return json({ url: session.url, twintOffered: session.twintOffered });
  } catch (err) {
    logger.error("checkout:lifetime:post", err);
    return json({ error: "Server-Fehler" }, 500);
  }
}

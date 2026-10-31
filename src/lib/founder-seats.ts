import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getFounderSeatLimit, seatLimitParam } from "@/lib/stripe-billing";
import { parseSeatAvailability, type FounderSeats } from "@/lib/sale-page";

async function loadFounderSeats(limit: number): Promise<FounderSeats | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("founder_seat_availability", {
      p_seat_limit: seatLimitParam(limit),
    });
    if (error) return null;
    return parseSeatAvailability(data, limit);
  } catch {
    return null;
  }
}

const loadFounderSeatsCached = unstable_cache(loadFounderSeats, ["founder-seat-availability"], {
  revalidate: 30,
});

/**
 * Public seat counter. Cached for 30 seconds.
 * Returns null when Supabase is not configured, the cap is off, or the query fails.
 */
export async function getCachedFounderSeats(): Promise<FounderSeats | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return null;
  }
  const limit = getFounderSeatLimit();
  if (limit == null) return null;
  return loadFounderSeatsCached(limit);
}

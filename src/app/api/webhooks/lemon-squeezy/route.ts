import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy is retired. This endpoint no longer changes plans.
 * Disable the old webhook in the Lemon Squeezy dashboard.
 */
export function POST() {
  return NextResponse.json(
    { error: "Lemon Squeezy ist abgelöst. Zahlungen laufen über Stripe." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

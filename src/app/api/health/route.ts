import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for load balancers, uptime monitors,
 * and deployment readiness probes.
 *
 * Returns 200 with a JSON body containing status and timestamp.
 * Does NOT check database connectivity — keep this fast and side-effect-free
 * so it can be polled at high frequency without load.
 */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

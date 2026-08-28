import { NextResponse } from "next/server";

/**
 * Standard JSON response for API routes.
 *
 * `Cache-Control: no-store` is the important part and the reason this is
 * centralised: every one of these endpoints returns per-user data (documents,
 * customers, plan state, share tokens). A cached response served to the wrong
 * user is the failure mode this header exists to prevent, so it must not
 * depend on each route remembering to set it.
 *
 * @param body   Serialised as JSON.
 * @param status HTTP status code. Defaults to 200.
 * @param extra  Additional headers, e.g. `{ "Retry-After": "30" }`. Merged
 *               after the defaults, so a caller can override Cache-Control
 *               deliberately.
 */
export function json(
  body: unknown,
  status = 200,
  extra?: Record<string, string>,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

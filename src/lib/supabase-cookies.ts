import type { CookieOptionsWithName } from "@supabase/ssr";

/** Session cookies: HttpOnly, Lax, and Secure outside local HTTP. */
export function supabaseCookieOptions(): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

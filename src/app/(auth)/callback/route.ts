import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { parseAuthNext } from "@/lib/auth-next";
import { resolvePostAuthPath } from "@/lib/auth-redirect";

/**
 * All redirect destinations in this route are hardcoded relative paths.
 * We intentionally do NOT read a `redirect_to` / `next` parameter from the
 * query string to prevent open redirect attacks where an attacker crafts a
 * link like /callback?code=X&next=https://evil.com and the victim is sent
 * to an external site after a legitimate auth flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createSupabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else if (tokenHash && type) {
    const allowedTypes: EmailOtpType[] = ["signup", "magiclink", "recovery", "invite", "email_change", "email"];
    if (!allowedTypes.includes(type as EmailOtpType)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  const fallback = resolvePostAuthPath({
    type: searchParams.get("type"),
    onboardingComplete: !!profile?.onboarding_complete,
  });
  // Recovery must win over a stored next path so a reset link cannot be skipped.
  const requested = searchParams.get("type") === "recovery"
    ? null
    : parseAuthNext(request.cookies.get("offertio_auth_next")?.value);
  const destination = requested ?? fallback;
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set("offertio_auth_next", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

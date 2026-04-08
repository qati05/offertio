import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

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

  if (!profile?.onboarding_complete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

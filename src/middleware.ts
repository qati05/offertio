import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDachConfig } from "@/lib/dach";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // 'unsafe-eval' is required by @react-pdf/renderer for client-side font
    // subsetting via eval(). Removing it breaks PDF generation in the browser.
    // Tracked as a known limitation — replace when the library offers a strict-CSP mode.
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://va.vercel-scripts.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://www.googletagmanager.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://vitals.vercel-analytics.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function isPublicPath(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/confirm") ||
    path.startsWith("/callback") ||
    path.startsWith("/datenschutz") ||
    path.startsWith("/agb") ||
    path.startsWith("/impressum") ||
    path.startsWith("/blog") ||
    path.startsWith("/branchen") ||
    path.startsWith("/vergleich") ||
    path === "/preise" ||
    // Recipient-facing surface: authorised by the document's share_token via
    // the admin client, never by an auth cookie. Recipients are by definition
    // not logged in, so these must bypass the session check.
    // Trailing slashes are load-bearing — "/view" alone would also open
    // "/viewer/…", "/api/public" would also open "/api/publications".
    path.startsWith("/view/") ||
    path.startsWith("/api/public/") ||
    path.startsWith("/api/webhooks/") ||
    path === "/api/health" ||
    path.startsWith("/_next/") ||
    path === "/sw.js" ||
    path === "/register-sw.js" ||
    path === "/manifest.json" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  supabaseResponse.headers.set("Content-Security-Policy", csp);

  if (isPublicPath(path)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          supabaseResponse.headers.set("Content-Security-Policy", csp);
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!path.startsWith("/onboarding") && !path.startsWith("/einstellungen") && !path.startsWith("/api/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, land, uid_mwst, steuernummer, fn_nr")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ico|json|xml|txt)$).*)",
  ],
};

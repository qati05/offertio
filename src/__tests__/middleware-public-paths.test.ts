import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/middleware";

/**
 * The recipient-facing surface must stay reachable without a session.
 *
 * `/view/<share_token>` and the `/api/public/*` endpoints are served from the
 * Supabase admin client and authorise the caller via the document's
 * `share_token` — never via an auth cookie. If the middleware treats them as
 * protected, every recipient is bounced to /login and the whole "send a link
 * to your customer" flow is dead.
 */
describe("middleware · recipient-facing paths stay public", () => {
  it("treats the recipient view link as public", () => {
    expect(isPublicPath("/view/123e4567-e89b-42d3-a456-426614174000")).toBe(true);
  });

  it("treats the public API endpoints as public", () => {
    expect(isPublicPath("/api/public/view")).toBe(true);
    expect(isPublicPath("/api/public/sign")).toBe(true);
    expect(isPublicPath("/api/public/reject")).toBe(true);
  });
});

describe("middleware · protected paths stay protected", () => {
  it("keeps the authenticated app behind the session check", () => {
    for (const path of [
      "/dashboard",
      "/dokument/neu",
      "/dokumente",
      "/onboarding",
      "/einstellungen/profil",
      "/einstellungen/wiederkehrend",
      "/kunden/mueller-ag",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("keeps authenticated API routes behind the session check", () => {
    for (const path of [
      "/api/dokument/save",
      "/api/dokument/share",
      "/api/recurring",
      "/api/recurring/run",
      "/api/account/export",
      "/api/profile/upload-logo",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("does not open up paths that merely look public", () => {
    // Guards against a substring-based rule leaking the authenticated surface.
    expect(isPublicPath("/api/publications")).toBe(false);
    expect(isPublicPath("/viewer/secret")).toBe(false);
    expect(isPublicPath("/dokumente/view")).toBe(false);
  });
});

describe("middleware · previously covered public paths", () => {
  it("still allows marketing, legal and auth entry points", () => {
    for (const path of [
      "/",
      "/login",
      "/callback",
      "/agb",
      "/datenschutz",
      "/impressum",
      "/preise",
      "/blog/qr-rechnung-schweiz-2026",
      "/branchen/maler",
      "/vergleich/offertio-vs-bexio",
      "/api/webhooks/lemon-squeezy",
      "/api/health",
      "/manifest.json",
      "/robots.txt",
      "/sitemap.xml",
    ]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });
});

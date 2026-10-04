import { test, expect } from "@playwright/test";

test.describe("Auth redirects (unauthenticated)", () => {
  test("redirects /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("redirects /dokument/neu to /login", async ({ page }) => {
    await page.goto("/dokument/neu");
    await page.waitForURL("**/login");
  });

  test("redirects /dokumente to /login", async ({ page }) => {
    await page.goto("/dokumente");
    await page.waitForURL("**/login");
  });

  test("redirects /einstellungen/profil to /login", async ({ page }) => {
    await page.goto("/einstellungen/profil");
    await page.waitForURL("**/login");
  });

  test("redirects the start page to /login", async ({ page }) => {
    // There is no landing page: without a session, "/" ends up at the login.
    await page.goto("/");
    await page.waitForURL("**/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("does NOT redirect the pages a stranger needs", async ({ request }) => {
    for (const path of ["/agb", "/impressum", "/datenschutz", "/robots.txt", "/manifest.json"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} should be publicly reachable`).toBeLessThan(400);
      expect(response.headers().location, `${path} should not redirect to login`).toBeUndefined();
    }
  });

  test("serves no marketing pages any more", async ({ request }) => {
    for (const path of ["/preise", "/blog", "/branchen/maler", "/vergleich/offertio-vs-bexio", "/sitemap.xml"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(
        [301, 302, 307, 308, 404].includes(response.status()),
        `${path} must not be served (got ${response.status()})`,
      ).toBe(true);
    }
  });

  test("does NOT bounce the recipient surface to /login", async ({ request }) => {
    // Recipients are never logged in: /view/<share_token> and the /api/public
    // endpoints authorise via the document's share token, not an auth cookie.
    // The token below is well-formed but does not exist, so the handlers are
    // expected to answer 4xx/5xx on their own — what must never happen is a
    // redirect to /login, which would mean the middleware swallowed the request
    // before the handler ever ran.
    for (const path of [
      "/view/123e4567-e89b-42d3-a456-426614174000",
      "/api/public/view",
      "/api/public/sign",
      "/api/public/reject",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(
        response.headers().location ?? "",
        `${path} must not redirect to /login`,
      ).not.toContain("/login");
      expect(
        [301, 302, 307, 308].includes(response.status()),
        `${path} must not be redirected by the middleware`,
      ).toBe(false);
    }
  });
});

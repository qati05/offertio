import { test, expect } from "@playwright/test";

test.describe("Auth redirects (unauthenticated)", () => {
  async function expectPublicPath(page: import("@playwright/test").Page, path: string) {
    await page.goto(path, { waitUntil: "commit" });
    await expect(page).toHaveURL(path);
  }

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

  test("does NOT redirect public pages", async ({ request }) => {
    for (const path of [
      "/",
      "/agb",
      "/impressum",
      "/blog",
      "/blog/e-rechnung-deutschland-2026",
      "/blog/qr-rechnung-schweiz-2026",
      "/branchen/handwerker",
      "/branchen/reinigung",
      "/vergleich/offertio-vs-bexio",
      "/vergleich/offertio-vs-sevdesk",
      "/robots.txt",
      "/sitemap.xml",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} should be publicly reachable`).toBeLessThan(400);
      expect(response.headers().location, `${path} should not redirect to login`).toBeUndefined();
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

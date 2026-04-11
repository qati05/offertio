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
});

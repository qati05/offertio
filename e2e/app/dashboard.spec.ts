import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders greeting and cockpit heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Cockpit");

    // Greeting based on time of day
    const greetingEl = page.locator("text=/Guten (Morgen|Tag|Abend)/");
    await expect(greetingEl).toBeVisible({ timeout: 10_000 });
  });

  test("shows action tiles for Offerte and Rechnung", async ({ page }) => {
    const offerteTile = page.locator(".dash-tile-primary");
    await expect(offerteTile).toBeVisible();
    await expect(offerteTile).toContainText("Neue Offerte");

    const rechnungTile = page.locator(".dash-tile-secondary");
    await expect(rechnungTile).toBeVisible();
    await expect(rechnungTile).toContainText("Neue Rechnung");
  });

  test("Offerte tile navigates to /dokument/neu", async ({ page }) => {
    await page.locator(".dash-tile-primary").click();
    await page.waitForURL("**/dokument/neu");
  });

  test("Rechnung tile navigates to /dokument/neu?typ=rechnung", async ({ page }) => {
    await page.locator(".dash-tile-secondary").click();
    await page.waitForURL("**/dokument/neu?typ=rechnung");
  });

  test("shows Verlauf section", async ({ page }) => {
    // Wait for loading to finish
    await expect(page.locator(".skeleton").first()).not.toBeVisible({ timeout: 10_000 });

    // Verlauf header is present
    await expect(page.locator("text=Verlauf")).toBeVisible();
  });

  test("shows date in German format", async ({ page }) => {
    // Today's date in de-CH format (e.g., "Donnerstag, 9. April")
    const dateEl = page.locator("text=/\\d+\\. (Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/");
    await expect(dateEl).toBeVisible({ timeout: 10_000 });
  });
});

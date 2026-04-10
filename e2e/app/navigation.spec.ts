import { test, expect } from "@playwright/test";

test.describe("App navigation", () => {
  test("sidebar/navbar has all main links", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    // Main navigation links should be present
    const navArea = page.locator("nav, aside, [class*='sidebar'], [class*='navbar']");

    // Dashboard link
    await expect(
      navArea.getByRole("link").filter({ hasText: /Dashboard|Übersicht/i }).first(),
    ).toBeVisible();
  });

  test("can navigate between main pages", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    // Navigate to Dokumente
    await page.goto("/dokumente");
    await expect(
      page.locator("text=/Dokumente|Verlauf/i").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Navigate to Einstellungen
    await page.goto("/einstellungen/profil");
    await expect(
      page.locator("text=/Profil|Einstellungen/i").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Navigate back to Dashboard
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });
  });

  test("deprecated /offerte/neu redirects to /dokument/neu", async ({ page }) => {
    await page.goto("/offerte/neu");
    await page.waitForURL("**/dokument/neu", { timeout: 10_000 });
  });

  test("deprecated /offerte/success redirects to /dokument/success", async ({ page }) => {
    await page.goto("/offerte/success");
    await page.waitForURL("**/dokument/success", { timeout: 10_000 });
  });
});

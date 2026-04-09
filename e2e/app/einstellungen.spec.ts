import { test, expect } from "@playwright/test";

test.describe("Settings — Profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/einstellungen/profil");
  });

  test("loads profile settings page", async ({ page }) => {
    await expect(
      page.locator("text=/Profil|Einstellungen|Firmenprofil/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows company name field", async ({ page }) => {
    const firmenname = page.locator(
      "input[placeholder*='Firma'], input[name*='firma'], input[id*='firma']",
    ).first();
    await expect(firmenname).toBeVisible({ timeout: 10_000 });
  });

  test("shows country/region selector", async ({ page }) => {
    // Land (CH/DE/AT) selector
    await expect(
      page.locator("text=/Schweiz|Deutschland|Österreich|Land/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows IBAN field", async ({ page }) => {
    await expect(
      page.locator("input[placeholder*='IBAN'], input[name*='iban'], input[id*='iban']")
        .or(page.locator("text=IBAN"))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows danger zone", async ({ page }) => {
    // Scroll to bottom for account deletion section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(
      page.locator("text=/Gefahrenzone|Konto löschen/i").first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Settings — Vorlagen (Templates)", () => {
  test("loads templates page", async ({ page }) => {
    await page.goto("/einstellungen/vorlagen");
    await expect(
      page.locator("text=/Vorlagen|Templates/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("has create template button", async ({ page }) => {
    await page.goto("/einstellungen/vorlagen");
    await page.waitForLoadState("networkidle");
    const createBtn = page.getByRole("button", {
      name: /Neue Vorlage|Vorlage erstellen|Hinzufügen|\+/i,
    }).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
  });
});

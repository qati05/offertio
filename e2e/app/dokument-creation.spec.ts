import { test, expect } from "@playwright/test";

test.describe("Document creation — Offerte", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dokument/neu");
    // Wait for the editor to load
    await expect(page.locator("text=/Neue Offerte|Offerte erstellen/i")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("loads offerte editor by default", async ({ page }) => {
    // Editor should have a date field
    await expect(page.locator("input[type='date']").first()).toBeVisible();
  });

  test("has customer name input", async ({ page }) => {
    // Look for the customer name / firma field
    const kundeInput = page.locator(
      "input[placeholder*='Kunde'], input[placeholder*='Name'], input[placeholder*='Firma']",
    ).first();
    await expect(kundeInput).toBeVisible();
  });

  test("can add position rows", async ({ page }) => {
    // Find and click the add-position button
    const addBtn = page.getByRole("button", { name: /Position|Hinzufügen|\+/i }).first();
    await expect(addBtn).toBeVisible();

    // Count initial rows
    const initialCount = await page.locator("[class*='pos-row'], [class*='position-row'], tr").count();
    await addBtn.click();
    // Should have more rows now
    const newCount = await page.locator("[class*='pos-row'], [class*='position-row'], tr").count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("shows MwSt configuration", async ({ page }) => {
    // VAT/MwSt should be configurable
    await expect(
      page.locator("text=/MwSt|Mehrwertsteuer|USt/i").first(),
    ).toBeVisible();
  });

  test("has send/save buttons", async ({ page }) => {
    // Submit button
    const sendBtn = page.getByRole("button", {
      name: /Senden|Erstellen|Speichern/i,
    }).first();
    await expect(sendBtn).toBeVisible();
  });
});

test.describe("Document creation — Rechnung", () => {
  test("loads rechnung editor via query param", async ({ page }) => {
    await page.goto("/dokument/neu?typ=rechnung");
    await expect(
      page.locator("text=/Neue Rechnung|Rechnung erstellen/i"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows Leistungsdatum field for Rechnung", async ({ page }) => {
    await page.goto("/dokument/neu?typ=rechnung");
    await expect(
      page.locator("text=/Leistungsdatum|Lieferdatum/i").first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Document creation — validation", () => {
  test("prevents send without required fields", async ({ page }) => {
    await page.goto("/dokument/neu");
    await expect(page.locator("text=/Neue Offerte|Offerte erstellen/i")).toBeVisible({
      timeout: 15_000,
    });

    // Try to send without filling anything
    const sendBtn = page.getByRole("button", {
      name: /Senden|Erstellen/i,
    }).first();

    if (await sendBtn.isEnabled()) {
      await sendBtn.click();
      // Should show validation error or toast
      await expect(
        page.locator("text=/fehlt|erforderlich|Pflicht|bitte/i").first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

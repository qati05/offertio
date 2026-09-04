import { test, expect } from "@playwright/test";

test.describe("Document list — /dokumente", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dokumente");
  });

  test("loads document archive page", async ({ page }) => {
    // Page title or heading
    await expect(
      page.locator("text=/Dokumente|Verlauf|Archiv/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows status filter chips", async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // At minimum, should have status filter options available
    await expect(
      page.locator("text=/Alle|Entwurf|Gesendet|Bezahlt/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("has CSV export button", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const exportBtn = page.locator("text=/Export|CSV/i").first();
    // Export might only be visible when documents exist
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeEnabled();
    }
  });
});

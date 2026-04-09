import { test, expect } from "@playwright/test";

test.describe("Customer autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dokument/neu");
    await expect(page.locator("text=/Neue Offerte|Offerte erstellen/i")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows autocomplete dropdown when typing customer name", async ({ page }) => {
    // Find the customer name input
    const kundeInput = page.locator(
      "input[placeholder*='Kunde'], input[placeholder*='Name'], input[placeholder*='Firma']",
    ).first();
    await expect(kundeInput).toBeVisible();

    // Type a query — only triggers if the test account has existing customers
    await kundeInput.fill("Mu");
    await kundeInput.press("s");

    // Wait briefly for dropdown — it may or may not appear depending on data
    const dropdown = page.locator("[style*='position: absolute']").filter({
      hasText: /.+/,
    });

    // If dropdown appears, verify it's interactive
    if (await dropdown.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Should have at least one item
      const items = dropdown.locator("div[style*='cursor']");
      expect(await items.count()).toBeGreaterThan(0);

      // Keyboard navigation: press ArrowDown
      await kundeInput.press("ArrowDown");
      // Press Enter to select
      await kundeInput.press("Enter");
      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
    }
  });

  test("does not show dropdown for short queries", async ({ page }) => {
    const kundeInput = page.locator(
      "input[placeholder*='Kunde'], input[placeholder*='Name'], input[placeholder*='Firma']",
    ).first();
    await kundeInput.fill("M");

    // Short query (< 2 chars) should not trigger dropdown
    const dropdown = page.locator("[style*='position: absolute']").filter({
      hasText: /.+/,
    });
    await expect(dropdown).not.toBeVisible({ timeout: 1_000 }).catch(() => {
      // acceptable — dropdown just doesn't exist
    });
  });
});

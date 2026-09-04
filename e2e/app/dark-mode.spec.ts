import { test, expect } from "@playwright/test";

test.describe("Dark mode", () => {
  test("respects system color scheme preference", async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    // Check that the page has dark theme applied
    // Alternatively check background color of the body/main container
    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // Dark mode should have a dark background (not white)
    // RGB values should be relatively low for dark background
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // In dark mode, background should be dark (average < 128)
      expect((r + g + b) / 3).toBeLessThan(128);
    }
  });

  test("light mode has light background", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // Light mode background should be bright
      expect((r + g + b) / 3).toBeGreaterThan(128);
    }
  });
});

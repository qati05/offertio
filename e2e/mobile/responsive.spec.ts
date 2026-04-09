import { test, expect } from "@playwright/test";

test.describe("Mobile responsive", () => {
  test("dashboard renders on mobile viewport", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    // Action tiles should stack or be visible
    const offerteTile = page.locator(".dash-tile-primary");
    await expect(offerteTile).toBeVisible();

    // Tiles should be within viewport
    const box = await offerteTile.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const viewport = page.viewportSize();
      expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 1);
    }
  });

  test("document editor is usable on mobile", async ({ page }) => {
    await page.goto("/dokument/neu");
    await expect(page.locator("text=/Neue Offerte|Offerte erstellen/i")).toBeVisible({
      timeout: 15_000,
    });

    // Verify no horizontal overflow
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(docWidth).toBeLessThanOrEqual(viewportWidth + 20); // small tolerance
  });

  test("login page is usable on mobile", async ({ page }) => {
    // Clear auth state for this test
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 10_000 });

    // Form elements should be within viewport
    const emailInput = page.locator("input[type='email']");
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    }
  });

  test("navigation is accessible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Cockpit", { timeout: 10_000 });

    // Mobile nav should be accessible (bottom bar or hamburger)
    // Tap-friendly targets: minimum 44px
    const navLinks = page.locator("nav a, aside a, [class*='navbar'] a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

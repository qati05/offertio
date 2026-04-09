import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test("AGB page loads", async ({ page }) => {
    await page.goto("/agb");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toContainText("Allgemeine Geschäftsbedingungen");
  });

  test("Datenschutz page loads", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toContainText("Datenschutz");
  });

  test("Impressum page loads", async ({ page }) => {
    await page.goto("/impressum");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toContainText("Impressum");
  });
});

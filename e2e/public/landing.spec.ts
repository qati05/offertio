import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and key sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Offertio/);

    // Hero section visible
    const hero = page.locator("main");
    await expect(hero).toBeVisible();

    // Navbar with logo
    await expect(page.locator("nav")).toBeVisible();

    // CTA buttons exist
    const ctaLinks = page.getByRole("link", { name: /Jetzt starten|Kostenlos testen/i });
    await expect(ctaLinks.first()).toBeVisible();
  });

  test("navigation to login", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.getByRole("link", { name: /Anmelden|Login/i });
    await expect(loginLink.first()).toBeVisible();
    await loginLink.first().click();
    await page.waitForURL("**/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });
});

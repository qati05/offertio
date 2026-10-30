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

    const cta = page.getByRole("link", { name: "Gründerplatz sichern, CHF 249" })
      .or(page.getByRole("button", { name: "Gründerplatz sichern, CHF 249" }));
    await expect(cta.first()).toBeVisible();
    await expect(cta).toHaveCount(3);
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

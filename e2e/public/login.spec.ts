import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form", async ({ page }) => {
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.getByRole("button", { name: /Konto erstellen/i })).toBeVisible();
  });

  test("switches between signup and login mode", async ({ page }) => {
    // Default: signup mode
    await expect(page.getByRole("button", { name: /Konto erstellen/i })).toBeVisible();

    // Switch to login mode
    await page.getByText("Bereits ein Konto?").click();
    await expect(page.getByRole("button", { name: /Anmelden/i })).toBeVisible();

    // Switch back to signup
    await page.getByText("Noch kein Konto?").click();
    await expect(page.getByRole("button", { name: /Konto erstellen/i })).toBeVisible();
  });

  test("shows validation for empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /Konto erstellen/i }).click();

    // Browser native validation on required email field
    const emailInput = page.locator("input[type='email']");
    const validity = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing,
    );
    expect(validity).toBe(true);
  });

  test("shows password field after email entry", async ({ page }) => {
    await page.fill("input[type='email']", "test@example.com");
    // Password field should be visible in signup/password mode
    await expect(page.locator("input[type='password']")).toBeVisible();
  });
});

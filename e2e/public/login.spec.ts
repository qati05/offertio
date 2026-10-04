import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the sign-in form", async ({ page }) => {
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("offers no way to register", async ({ page }) => {
    // Single-user installation: the account is created once by the owner.
    await expect(page.getByRole("button", { name: /Konto erstellen/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Registrieren/i })).toHaveCount(0);
  });

  test("switches to the passwordless link and back", async ({ page }) => {
    await page.getByRole("button", { name: /Login-Link/i }).click();
    await expect(page.locator("input[type='password']")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Link senden" })).toBeVisible();

    await page.getByRole("button", { name: /Zurück zum Passwort-Login/i }).click();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("shows validation for empty submit", async ({ page }) => {
    await page.locator("form").getByRole("button", { name: "Anmelden" }).click();

    // Browser native validation on required email field
    const emailInput = page.locator("input[type='email']");
    const validity = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing,
    );
    expect(validity).toBe(true);
  });

  test("tells a refused stranger why", async ({ page }) => {
    await page.goto("/login?error=not_owner");
    await expect(page.getByText(/nicht freigeschaltet/i)).toBeVisible();
  });
});

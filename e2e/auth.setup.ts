import { test as setup, expect } from "@playwright/test";

/**
 * Auth setup — logs in once and saves session state for all "app" tests.
 *
 * Requires env vars:
 *   E2E_USER_EMAIL    — test account email
 *   E2E_USER_PASSWORD — test account password
 *
 * Create a test account in your Supabase dashboard before running.
 * The account must have completed onboarding.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_USER_EMAIL or E2E_USER_PASSWORD env vars. " +
        "Create a test account and set these before running authenticated tests.",
    );
  }

  await page.goto("/login");

  // Wait for the login page to load
  await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 10_000 });

  // Switch to password mode if needed (page defaults to signup)
  const passwordToggle = page.getByText("Bereits ein Konto?");
  if (await passwordToggle.isVisible()) {
    await passwordToggle.click();
  }

  // Fill credentials
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", password);

  // Submit
  await page.getByRole("button", { name: "Anmelden" }).click();

  // Wait for redirect to dashboard (onboarding must be complete)
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.locator("h1")).toContainText("Cockpit");

  // Save auth state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});

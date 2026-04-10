import { test, expect } from "@playwright/test";

test.describe("Auth redirects (unauthenticated)", () => {
  test("redirects /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("redirects /dokument/neu to /login", async ({ page }) => {
    await page.goto("/dokument/neu");
    await page.waitForURL("**/login");
  });

  test("redirects /dokumente to /login", async ({ page }) => {
    await page.goto("/dokumente");
    await page.waitForURL("**/login");
  });

  test("redirects /einstellungen/profil to /login", async ({ page }) => {
    await page.goto("/einstellungen/profil");
    await page.waitForURL("**/login");
  });

  test("does NOT redirect public pages", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");

    await page.goto("/agb");
    await expect(page).toHaveURL("/agb");

    await page.goto("/impressum");
    await expect(page).toHaveURL("/impressum");
  });
});

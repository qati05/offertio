import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.describe("Landing page", () => {
  test("renders hero and key sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Offertio/);

    // Hero section visible
    const hero = page.locator("main");
    await expect(hero).toBeVisible();

    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();

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

  test("has one heading, swiss copy, and no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Unser Versprechen an Gründer" })).toBeVisible();
    await expect(page.getByText("QR-Rechnung erstellen, Swiss QR-Bill")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

const widths = [360, 390, 768] as const;

test.describe("Landing widths", () => {
  test.beforeAll(() => {
    mkdirSync("e2e/screenshots", { recursive: true });
  });

  for (const width of widths) {
    test(`fits ${width}px without overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const decline = page.getByRole("button", { name: "Ablehnen" });
      if (await decline.isVisible()) await decline.click();
      const cta = page.getByRole("link", { name: "Gründerplatz sichern, CHF 249" })
        .or(page.getByRole("button", { name: "Gründerplatz sichern, CHF 249" }));
      await expect(cta.first()).toBeVisible();
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tap: Array.from(document.querySelectorAll("a, button, summary")).every((node) => {
          const box = node.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) return true;
          return box.width >= 24 && box.height >= 24;
        }),
      }));
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `e2e/screenshots/landing-${width}.png`,
        fullPage: true,
      });
    });
  }
});

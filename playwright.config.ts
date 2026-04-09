import { defineConfig, devices } from "@playwright/test";

/**
 * Offertio E2E — Playwright configuration
 *
 * Run:   npx playwright test
 * UI:    npx playwright test --ui
 * Debug: npx playwright test --debug
 *
 * First time: npx playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "de-CH",
  },

  projects: [
    /* Auth setup — creates reusable session state */
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    /* Public pages — no auth needed */
    {
      name: "public",
      testMatch: /public\/.*/,
      use: { ...devices["Desktop Chrome"] },
    },
    /* Authenticated tests — depend on setup */
    {
      name: "app",
      testMatch: /app\/.*/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
    /* Mobile viewport */
    {
      name: "mobile",
      testMatch: /mobile\/.*/,
      dependencies: ["setup"],
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],

  /* Dev server — starts automatically if not running */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

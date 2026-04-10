import { defineConfig, devices } from "@playwright/test";

const hasAuthCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const port = Number(process.env.PORT || process.env.E2E_PORT || 3000);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;

const authProjects = hasAuthCredentials
  ? [
      {
        name: "setup",
        testMatch: /.*\.setup\.ts/,
      },
      {
        name: "app",
        testMatch: /app\/.*/,
        dependencies: ["setup"],
        use: {
          ...devices["Desktop Chrome"],
          storageState: "e2e/.auth/user.json",
        },
      },
      {
        name: "mobile",
        testMatch: /mobile\/.*/,
        dependencies: ["setup"],
        use: {
          ...devices["Pixel 5"],
          storageState: "e2e/.auth/user.json",
        },
      },
    ]
  : [
      {
        name: "mobile-public",
        testMatch: /mobile\/.*\.spec\.ts/,
        use: { ...devices["Pixel 5"] },
        grep: /login page is usable on mobile/,
      },
    ];

/**
 * Offertio E2E - Playwright configuration
 *
 * Public smoke tests run without real Supabase credentials. Authenticated app
 * tests are enabled automatically once E2E_USER_EMAIL and E2E_USER_PASSWORD are
 * present in the environment.
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
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "de-CH",
  },

  projects: [
    {
      name: "public",
      testMatch: /public\/.*/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...authProjects,
  ],

  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(port),
      // Public and login E2E tests do not call Supabase, but middleware creates
      // a Supabase client for every request. These local placeholders keep
      // unauthenticated browser smoke tests runnable before real credentials exist.
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "offertio-e2e-local-anon-key",
      NEXT_PUBLIC_GOOGLE_AUTH_ENABLED:
        process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED || "false",
    },
  },
});

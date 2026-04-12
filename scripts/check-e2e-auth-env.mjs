const required = ["E2E_USER_EMAIL", "E2E_USER_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    [
      `Missing required authenticated E2E env var(s): ${missing.join(", ")}`,
      "",
      "Create a Supabase test user with completed onboarding, then run:",
      '$env:E2E_USER_EMAIL="test@example.com"',
      '$env:E2E_USER_PASSWORD="your-password"',
      "npm run test:e2e:auth",
    ].join("\n"),
  );
  process.exit(1);
}

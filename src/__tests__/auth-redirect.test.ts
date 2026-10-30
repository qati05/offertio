import { describe, expect, it } from "vitest";
import { passwordResetRedirect, resolvePostAuthPath } from "@/lib/auth-redirect";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("auth redirects", () => {
  it("sends a recovery link to the password page", () => {
    expect(resolvePostAuthPath({ type: "recovery", onboardingComplete: true })).toBe("/einstellungen/passwort");
    expect(resolvePostAuthPath({ type: "recovery", onboardingComplete: false })).toBe("/einstellungen/passwort");
  });

  it("keeps signup and login redirects", () => {
    expect(resolvePostAuthPath({ type: "signup", onboardingComplete: false })).toBe("/onboarding");
    expect(resolvePostAuthPath({ type: null, onboardingComplete: true })).toBe("/dashboard");
  });

  it("builds a same-origin recovery callback", () => {
    expect(passwordResetRedirect("https://getoffertio.ch/")).toBe(
      "https://getoffertio.ch/callback?type=recovery",
    );
  });
});

describe("migration 033", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "supabase/migrations/033_lifetime_refund.sql"),
    "utf8",
  );

  it("revokes lifetime and releases only confirmed founder seats", () => {
    expect(sql).toContain("revoke_lifetime_for_refund");
    expect(sql).toContain("plan = 'free'");
    expect(sql).toContain("status = 'released'");
    expect(sql).toContain("status = 'confirmed'");
    expect(sql).toContain("p_amount IS DISTINCT FROM 24900");
    expect(sql).toContain("reason', 'duplicate'");
  });

  it("stops a user from incrementing another account's document counter", () => {
    expect(sql).toContain("auth.uid() IS DISTINCT FROM p_user_id");
    expect(sql).toContain("forbidden");
    expect(sql).toContain("DROP POLICY IF EXISTS \"Users can update own counters\"");
  });
});

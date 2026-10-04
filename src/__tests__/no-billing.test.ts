import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// This is a single-user installation. There is no subscription, no free limit,
// no trial and no payment provider. Those were removed on purpose, and they are
// the kind of thing a merge from an older branch brings back without anyone
// noticing — a checkout link, a limit check that quietly 403s the owner.
//
// Database columns (profiles.plan, dokument_counter, …) are deliberately NOT
// covered: dropping them is a data-model migration and waits for a decision.

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const SOURCES = walk("src");

describe("no billing in a single-user installation", () => {
  it("has files to check", () => {
    expect(SOURCES.length).toBeGreaterThan(50);
  });

  it("has no route, page or module left for the subscription", () => {
    for (const gone of [
      "src/lib/payment.ts",
      "src/lib/referrals.ts",
      "src/components/UpgradeScreen.tsx",
      "src/components/PlanExpiryBanner.tsx",
      "src/app/(app)/einstellungen/abonnement",
      "src/app/api/dokument/check-limit",
      "src/app/api/webhooks",
    ]) {
      expect(existsSync(gone), `${gone} should not exist`).toBe(false);
    }
  });

  it("nothing imports the removed payment module", () => {
    const offenders = SOURCES.filter((file) => /@\/lib\/(payment|referrals)\b/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("nothing links to a checkout or the subscription page", () => {
    const offenders = SOURCES.filter((file) =>
      /einstellungen\/abonnement|lemonsqueezy|checkout\/buy/i.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("nothing calls the removed limit endpoint", () => {
    const offenders = SOURCES.filter((file) => readFileSync(file, "utf8").includes("/api/dokument/check-limit"));
    expect(offenders).toEqual([]);
  });

  it("the save route does not refuse a document for quota", () => {
    const route = readFileSync("src/app/api/dokument/save/route.ts", "utf8");
    expect(route).not.toMatch(/Monatslimit|FREE_LIMIT|dokument_counter/);
  });
});

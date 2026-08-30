import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The upgrade path has to lead somewhere.
 *
 * Three places link to /einstellungen/abonnement — the dashboard's trial
 * banner, the quota counter in the document form, and the post-login fallback
 * when checkout is unconfigured. The route did not exist. Every one of them
 * landed on the 404 page, which means a user who wants to pay cannot, at
 * exactly the moment they decided to.
 */

const PAGE = "src/app/(app)/einstellungen/abonnement/page.tsx";

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("every link to the subscription page resolves", () => {
  it("the page exists", () => {
    expect(existsSync(PAGE)).toBe(true);
  });

  it("nothing links to a settings route that has no page", () => {
    // The general form of this bug: a CTA pointing at a route nobody built.
    const links = new Set<string>();
    for (const file of walk("src/app")) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/["'`](\/einstellungen\/[a-z-]+)["'`]/g)) {
        links.add(match[1]);
      }
    }
    expect(links.size).toBeGreaterThan(2);
    const broken = [...links].filter(
      (href) => !existsSync(join("src/app/(app)", href, "page.tsx")),
    );
    expect(broken).toEqual([]);
  });
});

describe("the subscription page", () => {
  const source = readFileSync(PAGE, "utf8");

  it("builds the checkout link instead of hard-coding one", () => {
    // getCheckoutUrl attaches the email and the user id, which the Lemon
    // Squeezy webhook requires to identify who paid.
    expect(source).toContain("getCheckoutUrl");
    expect(source).not.toMatch(/https:\/\/[a-z0-9-]*\.lemonsqueezy\.com/i);
  });

  it("passes the user id to checkout", () => {
    // Without it the webhook refuses the order — it will not fall back to
    // matching on email.
    expect(source).toMatch(/getCheckoutUrl\([^)]*\buserId\b|getCheckoutUrl\([^)]*user\.id/);
  });

  it("does not offer a dead button when checkout is unconfigured", () => {
    expect(source).toContain("isCheckoutConfigured");
  });

  it("shows what the user has now, not only what they could buy", () => {
    expect(source).toMatch(/isInTrial|trialDaysRemaining/);
    expect(source).toContain("isPro");
  });

  it("says how to cancel rather than pretending to offer it", () => {
    // Cancellation runs through Lemon Squeezy; there is no endpoint for it
    // here, and inventing a button that does nothing would be worse than a
    // sentence that is true.
    expect(source).toMatch(/[Kk]ündig/);
  });
});

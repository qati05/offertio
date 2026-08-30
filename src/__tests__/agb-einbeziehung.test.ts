import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The terms have to be reachable where they are agreed to.
 *
 * §1 of the AGB says "Mit der Registrierung akzeptieren Sie diese Bedingungen".
 * The registration screen linked Datenschutz, Impressum and the landing page —
 * a search of the whole auth area for "agb" returned nothing at all. The text
 * relied on a consent that was never obtained.
 *
 * For German and Austrian users this matters more than for Swiss ones: §305
 * Abs. 2 BGB requires the user to be given a reasonable opportunity to take
 * notice of the terms before they become part of the contract. Terms nobody can
 * find are hard to defend as validly incorporated.
 *
 * A link, not a checkbox: the AGB themselves phrase registration as the act of
 * acceptance, and a checkbox would be a product decision about how signup
 * feels. This makes the existing claim true without changing what the user has
 * to do.
 */

const LOGIN = readFileSync("src/app/(auth)/login/page.tsx", "utf8");

describe("terms are reachable from the registration screen", () => {
  it("links to /agb", () => {
    expect(LOGIN).toMatch(/href="\/agb"/);
  });

  it("keeps the other legal links", () => {
    // The AGB link must be added, not swapped in for one of these.
    expect(LOGIN).toMatch(/href="\/datenschutz"/);
    expect(LOGIN).toMatch(/href="\/impressum"/);
  });

  it("the terms still describe registration as the moment of acceptance", () => {
    // If this sentence ever goes, the link stops being the right fix and a
    // checkbox becomes the question instead.
    const agb = readFileSync("src/app/(auth)/agb/page.tsx", "utf8");
    expect(agb).toMatch(/Mit der Registrierung akzeptieren Sie diese Bedingungen/);
  });
});

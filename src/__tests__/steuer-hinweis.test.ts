import { describe, it, expect } from "vitest";
import { getSteuerHinweis, getEffektiverMwstSatz } from "@/lib/reverse-charge";
import type { Profile } from "@/lib/types";

const de = { land: "DE", kleinunternehmer: false } as unknown as Profile;
const deKlein = { land: "DE", kleinunternehmer: true } as unknown as Profile;
const ch = { land: "CH", kleinunternehmer: false } as unknown as Profile;
const chKlein = { land: "CH", kleinunternehmer: true } as unknown as Profile;

/**
 * One place decides which tax notice a document carries and which rate it is
 * printed at. All five PDF templates read it from here, so a reverse-charge
 * invoice cannot come out correct in one layout and wrong in another.
 */
describe("steuer-hinweis · which notice a document carries", () => {
  it("prints nothing extra on an ordinary invoice", () => {
    expect(getSteuerHinweis(de, "standard")).toBeNull();
    expect(getSteuerHinweis(de, undefined)).toBeNull();
  });

  it("prints the §19 notice for a Kleinunternehmer", () => {
    expect(getSteuerHinweis(deKlein, "standard")).toContain("19 UStG");
  });

  it("uses the country-specific Kleinunternehmer wording", () => {
    expect(getSteuerHinweis(chKlein, "standard")).toContain("MWSTG");
  });

  it("prints the §13b notice for a reverse-charge invoice", () => {
    const hinweis = getSteuerHinweis(de, "reverse_charge_13b_4");
    expect(hinweis).toContain("Steuerschuldnerschaft des Leistungsempfängers");
    expect(hinweis).toContain("13b");
  });

  it("lets reverse charge win over the Kleinunternehmer notice", () => {
    // The combination is refused before a document is saved, so this only
    // decides what a pre-existing or hand-crafted record renders as. Showing
    // the §13b notice is the safer of the two: it names the party who owes the
    // tax, whereas the §19 notice alone would suggest nobody does.
    expect(getSteuerHinweis(deKlein, "reverse_charge_13b_4")).toContain(
      "Steuerschuldnerschaft des Leistungsempfängers",
    );
  });
});

describe("steuer-hinweis · which rate a document is printed at", () => {
  it("leaves an ordinary rate alone", () => {
    expect(getEffektiverMwstSatz(19, de, "standard")).toBe(19);
    expect(getEffektiverMwstSatz(8.1, ch, undefined)).toBe(8.1);
  });

  it("forces 0 for reverse charge, whatever was passed in", () => {
    // §14a Abs. 5 UStG disapplies the separate tax statement. An invoice that
    // claims reverse charge and also shows VAT makes the issuer liable for
    // that VAT under §14c UStG, so the rate is closed off here rather than
    // trusted from a stale draft.
    expect(getEffektiverMwstSatz(19, de, "reverse_charge_13b_4")).toBe(0);
    expect(getEffektiverMwstSatz(7, de, "reverse_charge_13b_4")).toBe(0);
  });

  it("forces 0 for a Kleinunternehmer", () => {
    expect(getEffektiverMwstSatz(19, deKlein, "standard")).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import {
  REVERSE_CHARGE_CASES,
  isReverseCharge,
  getReverseChargeCase,
  getReverseChargeHinweis,
  checkReverseChargeEligibility,
  getEffektiverMwstSatz,
  getSteuerHinweis,
  type Steuerfall,
} from "@/lib/reverse-charge";

const seller = {
  land: "DE" as const,
  sellerVatId: "DE123456789",
  kleinunternehmer: false,
};
const buyerVatId = "DE987654321";

describe("reverse-charge · case catalogue", () => {
  it("knows exactly the two enabled domestic German cases", () => {
    // The other ten categories of §13b Abs. 2 are deliberately not enabled.
    expect(Object.keys(REVERSE_CHARGE_CASES).sort()).toEqual([
      "reverse_charge_13b_4",
      "reverse_charge_13b_8",
    ]);
  });

  it("carries the exact wording §14a Abs. 5 UStG demands", () => {
    // The statute requires the phrase "Steuerschuldnerschaft des
    // Leistungsempfängers" verbatim. Paraphrasing it makes the invoice
    // formally defective.
    const hinweis = getReverseChargeHinweis("reverse_charge_13b_4");
    expect(hinweis).toContain("Steuerschuldnerschaft des Leistungsempfängers");
    expect(hinweis).toContain("13b");
  });

  it("maps to the CEF VATEX code for reverse charge", () => {
    expect(REVERSE_CHARGE_CASES.reverse_charge_13b_4.vatexCode).toBe("VATEX-EU-AE");
  });

  it("is limited to Germany", () => {
    expect(REVERSE_CHARGE_CASES.reverse_charge_13b_4.land).toBe("DE");
  });
});

describe("reverse-charge · isReverseCharge", () => {
  it("recognises the reverse-charge case", () => {
    expect(isReverseCharge("reverse_charge_13b_4")).toBe(true);
  });

  it("treats standard, undefined and unknown values as not reverse charge", () => {
    expect(isReverseCharge("standard")).toBe(false);
    expect(isReverseCharge(undefined)).toBe(false);
    expect(isReverseCharge(null)).toBe(false);
    expect(isReverseCharge("something-else")).toBe(false);
  });

  it("returns null for an unknown case lookup", () => {
    expect(getReverseChargeCase("standard")).toBeNull();
    expect(getReverseChargeCase("nope")).toBeNull();
  });
});

describe("reverse-charge · eligibility", () => {
  function check(overrides: Record<string, unknown> = {}) {
    return checkReverseChargeEligibility({
      steuerfall: "reverse_charge_13b_4" as Steuerfall,
      ...seller,
      buyerVatId,
      ...overrides,
    });
  }

  it("accepts a complete domestic German construction invoice", () => {
    expect(check()).toEqual({ ok: true });
  });

  it("always accepts the standard case without further conditions", () => {
    expect(
      checkReverseChargeEligibility({
        steuerfall: "standard",
        land: "CH",
        sellerVatId: undefined,
        buyerVatId: undefined,
        kleinunternehmer: true,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a country other than Germany", () => {
    // Only the domestic German case is implemented. CH as a third country and
    // the Austrian equivalents are deliberately out of scope.
    const result = check({ land: "CH" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("land_not_supported");
  });

  it("rejects a Kleinunternehmer as issuer", () => {
    // Deliberately blocked rather than guessed at: a §19 issuer showing no VAT
    // for a different legal reason needs its own analysis.
    const result = check({ kleinunternehmer: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("kleinunternehmer_unsupported");
  });

  it("rejects a missing seller VAT id (BR-AE-02)", () => {
    const result = check({ sellerVatId: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("seller_vat_id_required");
  });

  it("rejects a blank seller VAT id", () => {
    const result = check({ sellerVatId: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("seller_vat_id_required");
  });

  it("rejects a missing recipient VAT id (BR-AE-03 / BR-AE-04)", () => {
    const result = check({ buyerVatId: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("buyer_vat_id_required");
  });

  it("explains every rejection in German for the UI", () => {
    for (const override of [
      { land: "CH" },
      { kleinunternehmer: true },
      { sellerVatId: undefined },
      { buyerVatId: undefined },
    ]) {
      const result = check(override);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message.length).toBeGreaterThan(20);
        expect(result.message).toMatch(/[a-zäöüß]/i);
      }
    }
  });

  it("reports the seller problem first when several are missing", () => {
    // The issuer can fix their own profile; they cannot fix the customer's
    // missing VAT id without asking, so surface the actionable one first.
    const result = check({ sellerVatId: undefined, buyerVatId: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("seller_vat_id_required");
  });
});

/**
 * §13b Abs. 2 Nr. 8 — Reinigung von Gebäuden und Gebäudeteilen.
 *
 * Structurally identical to Nr. 4: the recipient owes the tax when they
 * themselves sustainably perform building-cleaning services (§13b Abs. 5 S. 2,
 * evidenced by a USt 1 TG certificate). Only the cited paragraph and the
 * printed notice differ, so everything below asserts that the second case
 * behaves exactly like the first — and that the two are never confused.
 */
describe("reverse-charge · §13b Abs. 2 Nr. 8 (Gebäudereinigung)", () => {
  const CASE = "reverse_charge_13b_8";

  it("is part of the catalogue", () => {
    expect(Object.keys(REVERSE_CHARGE_CASES).sort()).toEqual([
      "reverse_charge_13b_4",
      "reverse_charge_13b_8",
    ]);
  });

  it("is recognised as reverse charge", () => {
    expect(isReverseCharge(CASE)).toBe(true);
  });

  it("cites Nr. 8, not Nr. 4", () => {
    const hinweis = getReverseChargeHinweis(CASE)!;
    expect(hinweis).toContain("Steuerschuldnerschaft des Leistungsempfängers");
    expect(hinweis).toContain("Nr. 8");
    expect(hinweis).not.toContain("Nr. 4");
  });

  it("keeps the two cases textually distinct", () => {
    // A cleaning invoice citing the construction paragraph is a wrong invoice.
    expect(getReverseChargeHinweis("reverse_charge_13b_4")).not.toEqual(
      getReverseChargeHinweis(CASE),
    );
    expect(REVERSE_CHARGE_CASES.reverse_charge_13b_8.label).toMatch(/reinigung/i);
  });

  it("uses the same VATEX code — the coded reason is reverse charge either way", () => {
    expect(REVERSE_CHARGE_CASES.reverse_charge_13b_8.vatexCode).toBe("VATEX-EU-AE");
  });

  it("is limited to Germany", () => {
    expect(REVERSE_CHARGE_CASES.reverse_charge_13b_8.land).toBe("DE");
    const result = checkReverseChargeEligibility({
      steuerfall: CASE,
      land: "CH",
      sellerVatId: "CHE-123",
      buyerVatId: "CHE-456",
      kleinunternehmer: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("land_not_supported");
  });

  it("enforces the same eligibility rules as Nr. 4", () => {
    const base = {
      steuerfall: CASE,
      land: "DE" as const,
      sellerVatId: "DE123456789",
      buyerVatId: "DE987654321",
      kleinunternehmer: false,
    };
    expect(checkReverseChargeEligibility(base)).toEqual({ ok: true });

    for (const [override, code] of [
      [{ sellerVatId: undefined }, "seller_vat_id_required"],
      [{ buyerVatId: undefined }, "buyer_vat_id_required"],
      [{ kleinunternehmer: true }, "kleinunternehmer_unsupported"],
    ] as const) {
      const result = checkReverseChargeEligibility({ ...base, ...override });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe(code);
    }
  });

  it("forces the VAT rate to 0 like every reverse-charge case", () => {
    expect(getEffektiverMwstSatz(19, { kleinunternehmer: false }, CASE)).toBe(0);
  });

  it("prints its own notice instead of a VAT line", () => {
    const hinweis = getSteuerHinweis({ land: "DE", kleinunternehmer: false }, CASE);
    expect(hinweis).toContain("Nr. 8");
  });
});

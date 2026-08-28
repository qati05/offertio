import { describe, it, expect } from "vitest";
import {
  REVERSE_CHARGE_CASES,
  isReverseCharge,
  getReverseChargeCase,
  getReverseChargeHinweis,
  checkReverseChargeEligibility,
  type Steuerfall,
} from "@/lib/reverse-charge";

const seller = {
  land: "DE" as const,
  sellerVatId: "DE123456789",
  kleinunternehmer: false,
};
const buyerVatId = "DE987654321";

describe("reverse-charge · case catalogue", () => {
  it("knows only the domestic German construction case for now", () => {
    expect(Object.keys(REVERSE_CHARGE_CASES)).toEqual(["reverse_charge_13b_4"]);
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

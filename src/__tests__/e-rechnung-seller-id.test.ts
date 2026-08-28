import { describe, it, expect } from "vitest";
import { checkSellerIdentifiable } from "@/lib/e-rechnung-eligibility";

/**
 * EN 16931 BR-CO-26: for the buyer to identify the supplier automatically, an
 * invoice must carry the Seller identifier (BT-29), the Seller legal
 * registration identifier (BT-30) and/or the Seller VAT identifier (BT-31).
 *
 * A German Steuernummer does NOT satisfy this. It is emitted as
 * SpecifiedTaxRegistration with schemeID "FC", and the rule accepts only
 * schemeID "VA" there. §14 Abs. 4 Nr. 2 UStG treats Steuernummer and USt-IdNr.
 * as interchangeable, which holds for a paper invoice but not for an
 * EN 16931 e-invoice.
 */
describe("e-invoice eligibility · seller must be identifiable (BR-CO-26)", () => {
  it("accepts a seller with a USt-IdNr.", () => {
    expect(checkSellerIdentifiable({ uid_mwst: "DE123456789", steuernummer: "13/123/12345" }))
      .toEqual({ ok: true });
  });

  it("accepts a seller with only a USt-IdNr.", () => {
    expect(checkSellerIdentifiable({ uid_mwst: "DE123456789" })).toEqual({ ok: true });
  });

  it("refuses a seller carrying only a Steuernummer", () => {
    const result = checkSellerIdentifiable({ steuernummer: "13/123/12345" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("seller_not_identifiable");
      expect(result.message).toMatch(/USt-IdNr/);
    }
  });

  it("refuses a seller with neither identifier", () => {
    expect(checkSellerIdentifiable({}).ok).toBe(false);
  });

  it("treats a blank USt-IdNr. as missing", () => {
    expect(checkSellerIdentifiable({ uid_mwst: "   " }).ok).toBe(false);
    expect(checkSellerIdentifiable({ uid_mwst: null }).ok).toBe(false);
  });

  it("names the free BZSt route in the message so the user can act", () => {
    const result = checkSellerIdentifiable({ steuernummer: "13/123/12345" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/BZSt|Bundeszentralamt/i);
  });
});

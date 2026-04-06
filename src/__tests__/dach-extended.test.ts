/**
 * DACH Extended — Coverage for getOnboardingTaxField, leistungsdatum,
 * tax-label precision (MwSt/USt/UID), and cross-jurisdiction edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  getDachConfig,
  getAllLands,
  getOnboardingTaxField,
} from "@/lib/dach";

describe("getDachConfig — default fallback", () => {
  it("falls back to CH config when land is undefined", () => {
    const cfg = getDachConfig(undefined);
    expect(cfg.land).toBe("CH");
    expect(cfg.currency).toBe("CHF");
  });

  it("falls back to CH config when land is empty string", () => {
    const cfg = getDachConfig("");
    expect(cfg.land).toBe("CH");
  });

  it("falls back to CH config when land is an unknown value", () => {
    const cfg = getDachConfig("JP"); // Japan — not a DACH country
    expect(cfg.land).toBe("CH");
  });

  it("falls back to CH config for numeric-like strings", () => {
    const cfg = getDachConfig("41");
    expect(cfg.land).toBe("CH");
  });
});

describe("Tax label precision — the MwSt/USt/UID matrix", () => {
  it("CH uses MWST (not USt) as mwstLabel", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.mwstLabel).toBe("MWST");
    expect(cfg.mwstTermLabel).toBe("MWST");
  });

  it("DE uses USt. as mwstLabel and MwSt. as mwstTermLabel", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.mwstLabel).toBe("USt.");
    expect(cfg.mwstTermLabel).toBe("MwSt.");
  });

  it("AT uses USt. as mwstLabel and MwSt. as mwstTermLabel", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.mwstLabel).toBe("USt.");
    expect(cfg.mwstTermLabel).toBe("MwSt.");
  });

  it("CH UID label uses UID / MWST-Nr. nomenclature", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.uidLabel).toContain("UID");
    expect(cfg.uidLabel).toContain("MWST");
    expect(cfg.pdfMwstNrLabel).toBe("MWST-Nr.");
  });

  it("DE UID label uses USt-IdNr.", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.uidLabel).toBe("USt-IdNr.");
    expect(cfg.pdfUidLabel).toBe("Steuernummer");
    expect(cfg.pdfMwstNrLabel).toBe("USt-IdNr.");
  });

  it("AT UID label uses UID-Nummer", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.uidLabel).toBe("UID-Nummer");
    expect(cfg.pdfUidLabel).toBe("Steuernummer / UID");
    expect(cfg.pdfMwstNrLabel).toBe("MWST-Nr.");
  });
});

describe("Leistungsdatum legal requirements", () => {
  it("CH does NOT require Leistungsdatum on invoices", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.leistungsdatumRequired).toBe(false);
  });

  it("DE REQUIRES Leistungsdatum (§14 Abs. 4 Nr. 6 UStG)", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.leistungsdatumRequired).toBe(true);
  });

  it("AT REQUIRES Leistungsdatum (§11 UStG AT)", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.leistungsdatumRequired).toBe(true);
  });
});

describe("VAT rate options — DACH tax jurisdiction matrix", () => {
  it("CH has correct VAT rates: 0%, 2.6%, 8.1%", () => {
    const cfg = getDachConfig("CH");
    const values = cfg.mwstOptions.map((o) => o.value);
    expect(values).toContain(0);
    expect(values).toContain(2.6);
    expect(values).toContain(8.1);
    expect(cfg.defaultMwst).toBe(8.1);
  });

  it("DE has correct VAT rates: 0%, 7%, 19%", () => {
    const cfg = getDachConfig("DE");
    const values = cfg.mwstOptions.map((o) => o.value);
    expect(values).toContain(0);
    expect(values).toContain(7);
    expect(values).toContain(19);
    expect(cfg.defaultMwst).toBe(19);
  });

  it("AT has correct VAT rates: 0%, 10%, 13%, 20%", () => {
    const cfg = getDachConfig("AT");
    const values = cfg.mwstOptions.map((o) => o.value);
    expect(values).toContain(0);
    expect(values).toContain(10);
    expect(values).toContain(13);
    expect(values).toContain(20);
    expect(cfg.defaultMwst).toBe(20);
  });

  it("each country has a 0% option for zero-rated transactions", () => {
    for (const land of ["CH", "DE", "AT"] as const) {
      const cfg = getDachConfig(land);
      const hasZero = cfg.mwstOptions.some((o) => o.value === 0);
      expect(hasZero, `${land} must have a 0% VAT option`).toBe(true);
    }
  });
});

describe("Payment system flags", () => {
  it("CH has QR-Bill, no SEPA, no ZUGFeRD", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.hasQrBill).toBe(true);
    expect(cfg.sepaEnabled).toBe(false);
    expect(cfg.zugferdCompatible).toBe(false);
  });

  it("DE has SEPA + ZUGFeRD, no QR-Bill", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.hasQrBill).toBe(false);
    expect(cfg.sepaEnabled).toBe(true);
    expect(cfg.zugferdCompatible).toBe(true);
  });

  it("AT has SEPA, no QR-Bill, no ZUGFeRD", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.hasQrBill).toBe(false);
    expect(cfg.sepaEnabled).toBe(true);
    expect(cfg.zugferdCompatible).toBe(false);
  });
});

describe("IBAN prefix and PLZ digit count", () => {
  it("CH IBAN starts with CH, 4-digit PLZ", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.ibanPrefix).toBe("CH");
    expect(cfg.plzDigits).toBe(4);
  });

  it("DE IBAN starts with DE, 5-digit PLZ", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.ibanPrefix).toBe("DE");
    expect(cfg.plzDigits).toBe(5);
  });

  it("AT IBAN starts with AT, 4-digit PLZ", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.ibanPrefix).toBe("AT");
    expect(cfg.plzDigits).toBe(4);
  });
});

describe("companyIdFields — onboarding field configuration", () => {
  it("CH has one field: uid_mwst (optional)", () => {
    const cfg = getDachConfig("CH");
    expect(cfg.companyIdFields).toHaveLength(1);
    expect(cfg.companyIdFields[0].key).toBe("uid_mwst");
    expect(cfg.companyIdFields[0].required).toBe(false);
  });

  it("DE has two fields: Steuernummer (required) and USt-IdNr (optional)", () => {
    const cfg = getDachConfig("DE");
    expect(cfg.companyIdFields).toHaveLength(2);
    const steuernummerField = cfg.companyIdFields.find((f) => f.key === "steuernummer");
    const ustIdField = cfg.companyIdFields.find((f) => f.key === "uid_mwst");
    expect(steuernummerField?.required).toBe(true);
    expect(ustIdField?.required).toBe(false);
  });

  it("AT has two fields: UID-Nummer and Firmenbuchnummer (both optional)", () => {
    const cfg = getDachConfig("AT");
    expect(cfg.companyIdFields).toHaveLength(2);
    for (const field of cfg.companyIdFields) {
      expect(field.required).toBe(false);
    }
    const uidField = cfg.companyIdFields.find((f) => f.key === "uid_mwst");
    const fnField = cfg.companyIdFields.find((f) => f.key === "fn_nr");
    expect(uidField).toBeDefined();
    expect(fnField).toBeDefined();
  });
});

describe("getOnboardingTaxField — never tested before", () => {
  it("returns uid_mwst field for CH", () => {
    const field = getOnboardingTaxField("CH");
    expect(field).not.toBeNull();
    expect(field!.key).toBe("uid_mwst");
    expect(field!.label).toBe("MWST-Nr.");
    expect(field!.placeholder).toBe("CHE-123.456.789");
  });

  it("returns steuernummer field for DE", () => {
    const field = getOnboardingTaxField("DE");
    expect(field).not.toBeNull();
    expect(field!.key).toBe("steuernummer");
    expect(field!.label).toBe("Steuernummer");
    expect(field!.placeholder).toBe("13/123/12345");
  });

  it("returns uid_mwst field for AT", () => {
    const field = getOnboardingTaxField("AT");
    expect(field).not.toBeNull();
    expect(field!.key).toBe("uid_mwst");
    expect(field!.label).toBe("UID-Nummer");
    expect(field!.placeholder).toBe("ATU12345678");
  });

  it("returns null for unknown country (JP, US, etc.)", () => {
    expect(getOnboardingTaxField("JP")).toBeNull();
    expect(getOnboardingTaxField("US")).toBeNull();
    expect(getOnboardingTaxField("")).toBeNull();
  });

  it("placeholder formats match country standards", () => {
    const ch = getOnboardingTaxField("CH")!;
    expect(ch.placeholder).toMatch(/^CHE-\d{3}\.\d{3}\.\d{3}$/);

    const at = getOnboardingTaxField("AT")!;
    expect(at.placeholder).toMatch(/^ATU\d{8}$/);

    const de = getOnboardingTaxField("DE")!;
    expect(de.placeholder).toMatch(/^\d{2}\/\d{3}\/\d{5}$/);
  });
});

describe("getAllLands — country list integrity", () => {
  it("returns exactly 3 countries", () => {
    expect(getAllLands()).toHaveLength(3);
  });

  it("contains CH, DE, AT in that order", () => {
    const lands = getAllLands().map((l) => l.value);
    expect(lands).toEqual(["CH", "DE", "AT"]);
  });

  it("each entry has a human-readable German label", () => {
    const labels = getAllLands().map((l) => l.label);
    expect(labels).toContain("Schweiz");
    expect(labels).toContain("Deutschland");
    expect(labels).toContain("Österreich");
  });
});

describe("Cross-jurisdiction edge case: Swiss user, Japanese customer, AT VAT rate", () => {
  // This scenario tests that DACH config is user-jurisdiction based,
  // not customer-jurisdiction based. The user is in CH → CH config applies.
  it("CH config is used regardless of customer country", () => {
    const userLand = "CH"; // user's company is in Switzerland
    const cfg = getDachConfig(userLand);

    // CH rules apply: CHF currency, 8.1% default VAT, QR-bill
    expect(cfg.currency).toBe("CHF");
    expect(cfg.defaultMwst).toBe(8.1);
    expect(cfg.hasQrBill).toBe(true);

    // AT's 20% VAT rate is NOT in CH's options
    const hasAT20 = cfg.mwstOptions.some((o) => o.value === 20);
    expect(hasAT20).toBe(false);
  });

  it("getDachConfig ignores customer country — returns user country config", () => {
    // Simulates: user selects their land (CH), customer is in JP
    // The getDachConfig must not be called with customer country
    const chConfig = getDachConfig("CH");
    const jpFallbackConfig = getDachConfig("JP"); // falls back to CH

    // Both produce CH config — the customer's country is irrelevant
    expect(chConfig.land).toBe(jpFallbackConfig.land);
    expect(chConfig.currency).toBe(jpFallbackConfig.currency);
  });
});

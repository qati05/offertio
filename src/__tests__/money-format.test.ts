import { describe, it, expect } from "vitest";
import { formatMoney, moneyLocaleFor } from "@/lib/money-format";

/**
 * Amounts must be printed the way the recipient's country writes them. A German
 * customer reading "1'234.56" sees a Swiss document; the apostrophe grouping is
 * not used in Germany at all.
 */
describe("money format · Switzerland", () => {
  it("uses apostrophe grouping and a decimal point", () => {
    expect(formatMoney(1234.5, "CH")).toBe("1'234.50");
    expect(formatMoney(1234567.89, "CH")).toBe("1'234'567.89");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(5, "CH")).toBe("5.00");
    expect(formatMoney(0, "CH")).toBe("0.00");
  });
});

describe("money format · Germany and Austria", () => {
  it("uses dot grouping and a decimal comma", () => {
    expect(formatMoney(1234.5, "DE")).toBe("1.234,50");
    expect(formatMoney(1234567.89, "DE")).toBe("1.234.567,89");
  });

  it("formats Austrian amounts the same way as German ones", () => {
    // ICU's de-AT grouping separator is a non-breaking space (U+00A0), which is
    // a poor fit for a PDF: it is invisible in review, survives copy-paste
    // badly, and depends on the embedded font carrying the glyph. Austrian
    // invoices are conventionally written 1.234,56 as well, so both EUR
    // countries share one format.
    expect(formatMoney(1234.5, "AT")).toBe("1.234,50");
    expect(formatMoney(1234.5, "AT")).not.toContain(" ");
  });

  it("always shows two decimals", () => {
    expect(formatMoney(5, "DE")).toBe("5,00");
    expect(formatMoney(0, "DE")).toBe("0,00");
  });
});

describe("money format · edge cases", () => {
  it("defaults to the Swiss format when the country is unknown", () => {
    // CH is the product's default country (profiles.land DEFAULT 'CH').
    expect(formatMoney(1234.5, undefined)).toBe("1'234.50");
    expect(formatMoney(1234.5, "XX")).toBe("1'234.50");
  });

  it("renders negative amounts", () => {
    expect(formatMoney(-1234.5, "DE")).toBe("-1.234,50");
  });

  it("rounds to two decimals rather than truncating", () => {
    expect(formatMoney(1.005, "DE")).toBe("1,01");
    expect(formatMoney(1.004, "DE")).toBe("1,00");
  });

  it("never emits a non-breaking space in any supported country", () => {
    for (const land of ["CH", "DE", "AT"]) {
      expect(formatMoney(1234567.89, land)).not.toContain(" ");
    }
  });

  it("exposes the locale it uses", () => {
    expect(moneyLocaleFor("CH")).toBe("de-CH");
    expect(moneyLocaleFor("DE")).toBe("de-DE");
    expect(moneyLocaleFor("AT")).toBe("de-DE");
  });
});

import { describe, it, expect } from "vitest";
import { hasAtMostTwoDecimals, roundToCents, validatePositionen } from "@/lib/price-precision";

/**
 * Unit prices are money and must carry at most two decimals.
 *
 * This is not cosmetic. EN 16931 forces the header total BT-106 to equal the
 * sum of the ROUNDED line amounts the invoice prints, while the PDF sums the
 * raw products. For a sub-cent unit price (2 × 0.005) the two disagree by a
 * cent — documented as a known limitation in zugferd-xml.ts. Rejecting such a
 * price on input makes the case unreachable instead of leaving two documents
 * that disagree about what the customer owes.
 */
describe("price precision · hasAtMostTwoDecimals", () => {
  it("accepts whole numbers and ordinary money values", () => {
    for (const v of [0, 1, 12, 1000, 0.5, 0.05, 12.3, 12.34, -5.25]) {
      expect(hasAtMostTwoDecimals(v), `${v}`).toBe(true);
    }
  });

  it("rejects sub-cent precision", () => {
    for (const v of [0.005, 12.345, 1.001, 33.333]) {
      expect(hasAtMostTwoDecimals(v), `${v}`).toBe(false);
    }
  });

  it("rejects values that are not finite numbers", () => {
    for (const v of [NaN, Infinity, -Infinity]) {
      expect(hasAtMostTwoDecimals(v as number)).toBe(false);
    }
  });

  it("is not fooled by binary floating point", () => {
    // 8.1 has no exact binary representation, and 0.1 + 0.2 lands on
    // 0.30000000000000004. Both are two-decimal money values that arithmetic
    // noise has nudged; rejecting them would block legitimate prices. A naive
    // `v * 100 % 1 === 0` check gets these wrong.
    expect(hasAtMostTwoDecimals(8.1)).toBe(true);
    expect(hasAtMostTwoDecimals(0.1 + 0.2)).toBe(true);
    // 1.005 is genuinely sub-cent, not noise, and must still be rejected.
    expect(hasAtMostTwoDecimals(1.005)).toBe(false);
  });
});

describe("price precision · roundToCents", () => {
  it("rounds to two decimals", () => {
    expect(roundToCents(12.344)).toBe(12.34);
    expect(roundToCents(12.346)).toBe(12.35);
    expect(roundToCents(0.005)).toBe(0.01);
  });

  it("leaves clean values untouched", () => {
    expect(roundToCents(19)).toBe(19);
    expect(roundToCents(8.1)).toBe(8.1);
  });
});

describe("price precision · validatePositionen", () => {
  const ok = [
    { bezeichnung: "A", einheit: "Std.", menge: 2, preis: 120.5 },
    { bezeichnung: "B", einheit: "pauschal", menge: 1, preis: 1000 },
  ];

  it("accepts well-formed positions", () => {
    expect(validatePositionen(ok)).toEqual({ ok: true });
  });

  it("accepts an empty list", () => {
    // Position lists are optional on save; emptiness is not this check's job.
    expect(validatePositionen([])).toEqual({ ok: true });
  });

  it("rejects a sub-cent unit price and names the line", () => {
    const result = validatePositionen([ok[0], { ...ok[1], preis: 0.005 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.index).toBe(1);
      expect(result.message).toMatch(/Rappen|Cent|Dezimal/i);
    }
  });

  it("rejects a non-numeric price", () => {
    const result = validatePositionen([{ ...ok[0], preis: "12,50" as unknown as number }]);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-finite quantity", () => {
    const result = validatePositionen([{ ...ok[0], menge: NaN }]);
    expect(result.ok).toBe(false);
  });

  it("rejects a quantity with sub-cent precision", () => {
    // Quantities multiply into money, so the same limit applies.
    const result = validatePositionen([{ ...ok[0], menge: 1.005 }]);
    expect(result.ok).toBe(false);
  });

  it("rejects anything that is not an object", () => {
    expect(validatePositionen([null as unknown as never]).ok).toBe(false);
    expect(validatePositionen("nope" as unknown as never[]).ok).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { computeInsights, buildMonthlySeries, formatCompactCurrency } from "@/lib/insights";
import type { DokumentHistorie } from "@/lib/types";

function makeDoc(overrides: Partial<DokumentHistorie>): DokumentHistorie {
  return {
    typ: "rechnung",
    nummer: "R-001",
    objekt: "",
    kundenname: "Müller AG",
    betrag: 100,
    datum: "2026-04-10",
    status: "bezahlt",
    ...overrides,
  };
}

const NOW = new Date("2026-04-16T12:00:00Z");

describe("computeInsights", () => {
  it("returns zero baseline for empty history", () => {
    const r = computeInsights([], NOW);
    expect(r.revenueThisMonth).toBe(0);
    expect(r.revenueLast30Days).toBe(0);
    expect(r.revenueYearToDate).toBe(0);
    expect(r.openInvoiceAmount).toBe(0);
    expect(r.openInvoiceCount).toBe(0);
    expect(r.overdueAmount).toBe(0);
    expect(r.winRate).toBeNull();
    expect(r.winRateSample).toBe(0);
    expect(r.averageInvoiceAmount).toBe(0);
    expect(r.topCustomers).toEqual([]);
    expect(r.monthlySeries).toHaveLength(6);
  });

  it("sums revenue only from paid invoices", () => {
    const history = [
      makeDoc({ status: "bezahlt", betrag: 200, datum: "2026-04-05" }),
      makeDoc({ status: "bezahlt", betrag: 300, datum: "2026-04-10" }),
      makeDoc({ status: "gesendet", betrag: 500, datum: "2026-04-12" }), // ignored
      makeDoc({ status: "entwurf", betrag: 900, datum: "2026-04-14" }),  // ignored
      makeDoc({ typ: "offerte", status: "angenommen", betrag: 9999, datum: "2026-04-15" }), // offers excluded
    ];
    const r = computeInsights(history, NOW);
    expect(r.revenueThisMonth).toBe(500);
    expect(r.revenueLast30Days).toBe(500);
    expect(r.revenueYearToDate).toBe(500);
  });

  it("excludes revenue from previous months in revenueThisMonth", () => {
    const history = [
      makeDoc({ status: "bezahlt", betrag: 100, datum: "2026-03-30" }),
      makeDoc({ status: "bezahlt", betrag: 200, datum: "2026-04-01" }),
    ];
    const r = computeInsights(history, NOW);
    expect(r.revenueThisMonth).toBe(200);
    expect(r.revenueLast30Days).toBe(300);
    expect(r.revenueYearToDate).toBe(300);
  });

  it("excludes prior year from revenueYearToDate", () => {
    const history = [
      makeDoc({ status: "bezahlt", betrag: 100, datum: "2025-12-31" }),
      makeDoc({ status: "bezahlt", betrag: 200, datum: "2026-01-01" }),
      makeDoc({ status: "bezahlt", betrag: 50, datum: "2026-04-15" }),
    ];
    const r = computeInsights(history, NOW);
    expect(r.revenueYearToDate).toBe(250);
  });

  it("tracks open invoice amount and count separately from overdue", () => {
    const history = [
      makeDoc({ status: "gesendet", betrag: 500 }),
      makeDoc({ status: "ueberfaellig", betrag: 800 }),
      makeDoc({ status: "gesendet", betrag: 100 }),
      makeDoc({ status: "bezahlt", betrag: 999 }), // excluded
    ];
    const r = computeInsights(history, NOW);
    expect(r.openInvoiceAmount).toBe(1400);
    expect(r.openInvoiceCount).toBe(3);
    expect(r.overdueAmount).toBe(800);
    expect(r.overdueCount).toBe(1);
  });

  it("computes win rate from accepted vs expired offers", () => {
    const history = [
      makeDoc({ typ: "offerte", status: "angenommen" }),
      makeDoc({ typ: "offerte", status: "angenommen" }),
      makeDoc({ typ: "offerte", status: "angenommen" }),
      makeDoc({ typ: "offerte", status: "abgelaufen" }),
      makeDoc({ typ: "offerte", status: "gesendet" }), // pending — not counted
    ];
    const r = computeInsights(history, NOW);
    expect(r.winRate).toBeCloseTo(0.75, 5);
    expect(r.winRateSample).toBe(4);
  });

  it("winRate is null when no offers are decided", () => {
    const history = [
      makeDoc({ typ: "offerte", status: "gesendet" }),
      makeDoc({ typ: "offerte", status: "entwurf" }),
    ];
    const r = computeInsights(history, NOW);
    expect(r.winRate).toBeNull();
    expect(r.winRateSample).toBe(0);
  });

  it("averages invoice amount across all invoices (not just paid)", () => {
    const history = [
      makeDoc({ status: "bezahlt", betrag: 100 }),
      makeDoc({ status: "gesendet", betrag: 300 }),
      makeDoc({ status: "entwurf", betrag: 500 }),
      makeDoc({ typ: "offerte", status: "gesendet", betrag: 9999 }), // excluded
    ];
    const r = computeInsights(history, NOW);
    expect(r.averageInvoiceAmount).toBe(300);
  });

  it("groups top customers by paid revenue and limits to 5", () => {
    const history = [
      makeDoc({ kundenname: "Alpha", status: "bezahlt", betrag: 1000 }),
      makeDoc({ kundenname: "Alpha", status: "bezahlt", betrag: 500 }),
      makeDoc({ kundenname: "Beta", status: "bezahlt", betrag: 2000 }),
      makeDoc({ kundenname: "Gamma", status: "bezahlt", betrag: 300 }),
      makeDoc({ kundenname: "Delta", status: "bezahlt", betrag: 100 }),
      makeDoc({ kundenname: "Epsilon", status: "bezahlt", betrag: 50 }),
      makeDoc({ kundenname: "Zeta", status: "bezahlt", betrag: 10 }),
    ];
    const r = computeInsights(history, NOW);
    expect(r.topCustomers).toHaveLength(5);
    expect(r.topCustomers[0]).toMatchObject({ name: "Beta", revenue: 2000 });
    expect(r.topCustomers[1]).toMatchObject({ name: "Alpha", revenue: 1500, docs: 2 });
    expect(r.topCustomers.map((c) => c.name)).not.toContain("Zeta");
  });

  it("customer grouping is case-insensitive", () => {
    const history = [
      makeDoc({ kundenname: "Müller AG", status: "bezahlt", betrag: 100 }),
      makeDoc({ kundenname: "müller ag", status: "bezahlt", betrag: 200 }),
    ];
    const r = computeInsights(history, NOW);
    expect(r.topCustomers).toHaveLength(1);
    expect(r.topCustomers[0].revenue).toBe(300);
    expect(r.topCustomers[0].docs).toBe(2);
  });
});

describe("buildMonthlySeries", () => {
  it("returns N buckets, oldest first, with the current month last", () => {
    const series = buildMonthlySeries([], NOW, 6);
    expect(series).toHaveLength(6);
    expect(series[5].key).toBe("2026-04");
    expect(series[0].key).toBe("2025-11");
  });

  it("fills zero for months without paid invoices", () => {
    const series = buildMonthlySeries(
      [makeDoc({ status: "bezahlt", betrag: 500, datum: "2026-04-10" })],
      NOW,
      6,
    );
    expect(series[5].revenue).toBe(500);
    expect(series[5].count).toBe(1);
    expect(series[0].revenue).toBe(0);
    expect(series[0].count).toBe(0);
  });

  it("ignores documents outside the window", () => {
    const series = buildMonthlySeries(
      [
        makeDoc({ status: "bezahlt", betrag: 100, datum: "2024-01-10" }),
        makeDoc({ status: "bezahlt", betrag: 200, datum: "2026-04-10" }),
      ],
      NOW,
      6,
    );
    expect(series.reduce((sum, b) => sum + b.revenue, 0)).toBe(200);
  });

  it("ignores non-paid invoices", () => {
    const series = buildMonthlySeries(
      [
        makeDoc({ status: "gesendet", betrag: 500, datum: "2026-04-10" }),
        makeDoc({ status: "entwurf", betrag: 900, datum: "2026-04-10" }),
      ],
      NOW,
      6,
    );
    expect(series.reduce((sum, b) => sum + b.revenue, 0)).toBe(0);
  });
});

describe("formatCompactCurrency", () => {
  // de-CH uses ' as thousands separator and . as decimal separator.
  it("keeps decimals below 10k", () => {
    expect(formatCompactCurrency(1234.56)).toMatch(/1.234\.56$/);
  });

  it("drops decimals at/above 10k", () => {
    expect(formatCompactCurrency(12500)).toMatch(/12.500$/);
    expect(formatCompactCurrency(12500)).not.toMatch(/\.\d\d$/);
  });

  it("uses the supplied currency label", () => {
    expect(formatCompactCurrency(50, "EUR")).toMatch(/^EUR /);
  });

  it("handles negative amounts", () => {
    expect(formatCompactCurrency(-42.5)).toContain("-42");
    expect(formatCompactCurrency(-42.5)).toMatch(/-42\.50$/);
  });
});

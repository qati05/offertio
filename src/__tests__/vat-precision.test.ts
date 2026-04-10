import { describe, expect, it } from "vitest";

/**
 * Tests for VAT calculation precision.
 *
 * The r2() rounding function (Math.round(n * 100) / 100) prevents
 * floating-point drift in invoice totals. These tests verify correctness
 * for all three DACH VAT rates.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

function calcVat(params: {
  positionen: { menge: number; preis: number }[];
  mwstSatz: number;
  preisMode: "exkl" | "inkl";
  rabatt?: { aktiv: boolean; modus: "chf" | "prozent"; wert: number };
}) {
  const { positionen, mwstSatz, preisMode, rabatt } = params;
  const grossSubtotal = r2(positionen.reduce((s, p) => s + p.menge * p.preis, 0));
  const rabattBetrag = r2(
    rabatt?.aktiv
      ? rabatt.modus === "chf"
        ? rabatt.wert
        : grossSubtotal * (rabatt.wert / 100)
      : 0,
  );
  const grossNachRabatt = r2(grossSubtotal - rabattBetrag);
  const nettoNachRabatt =
    preisMode === "exkl" ? grossNachRabatt : r2(grossNachRabatt / (1 + mwstSatz / 100));
  const mwstBetrag =
    preisMode === "exkl"
      ? r2(nettoNachRabatt * (mwstSatz / 100))
      : r2(grossNachRabatt - nettoNachRabatt);
  const total = preisMode === "exkl" ? r2(nettoNachRabatt + mwstBetrag) : grossNachRabatt;

  return { grossSubtotal, rabattBetrag, grossNachRabatt, nettoNachRabatt, mwstBetrag, total };
}

describe("VAT calculation precision", () => {
  it("CH 8.1% exkl — no rounding drift", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 100 }],
      mwstSatz: 8.1,
      preisMode: "exkl",
    });
    expect(result.nettoNachRabatt).toBe(100);
    expect(result.mwstBetrag).toBe(8.1);
    expect(result.total).toBe(108.1);
  });

  it("CH 8.1% inkl — extracts VAT cleanly", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 108.1 }],
      mwstSatz: 8.1,
      preisMode: "inkl",
    });
    expect(result.nettoNachRabatt).toBe(100);
    expect(result.mwstBetrag).toBe(8.1);
    expect(result.total).toBe(108.1);
  });

  it("CH 2.6% reduced rate exkl", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 200 }],
      mwstSatz: 2.6,
      preisMode: "exkl",
    });
    expect(result.mwstBetrag).toBe(5.2);
    expect(result.total).toBe(205.2);
  });

  it("DE 19% exkl — classic rate", () => {
    const result = calcVat({
      positionen: [{ menge: 3, preis: 49.99 }],
      mwstSatz: 19,
      preisMode: "exkl",
    });
    expect(result.grossSubtotal).toBe(149.97);
    expect(result.mwstBetrag).toBe(28.49);
    expect(result.total).toBe(178.46);
  });

  it("DE 7% reduced exkl", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 99.99 }],
      mwstSatz: 7,
      preisMode: "exkl",
    });
    expect(result.mwstBetrag).toBe(7);
    expect(result.total).toBe(106.99);
  });

  it("AT 20% inkl — extracts cleanly", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 120 }],
      mwstSatz: 20,
      preisMode: "inkl",
    });
    expect(result.nettoNachRabatt).toBe(100);
    expect(result.mwstBetrag).toBe(20);
    expect(result.total).toBe(120);
  });

  it("handles discount with VAT correctly", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 1000 }],
      mwstSatz: 8.1,
      preisMode: "exkl",
      rabatt: { aktiv: true, modus: "prozent", wert: 10 },
    });
    expect(result.rabattBetrag).toBe(100);
    expect(result.nettoNachRabatt).toBe(900);
    expect(result.mwstBetrag).toBe(72.9);
    expect(result.total).toBe(972.9);
  });

  it("handles CHF discount with 7.7% VAT", () => {
    const result = calcVat({
      positionen: [{ menge: 2, preis: 250 }],
      mwstSatz: 7.7,
      preisMode: "exkl",
      rabatt: { aktiv: true, modus: "chf", wert: 50 },
    });
    expect(result.grossSubtotal).toBe(500);
    expect(result.rabattBetrag).toBe(50);
    expect(result.nettoNachRabatt).toBe(450);
    expect(result.mwstBetrag).toBe(34.65);
    expect(result.total).toBe(484.65);
  });

  it("zero VAT rate — no tax applied", () => {
    const result = calcVat({
      positionen: [{ menge: 1, preis: 100 }],
      mwstSatz: 0,
      preisMode: "exkl",
    });
    expect(result.mwstBetrag).toBe(0);
    expect(result.total).toBe(100);
  });

  it("large invoice — no precision drift", () => {
    const result = calcVat({
      positionen: [
        { menge: 100, preis: 333.33 },
        { menge: 50, preis: 77.77 },
      ],
      mwstSatz: 8.1,
      preisMode: "exkl",
    });
    // grossSubtotal = 100*333.33 + 50*77.77 = 33333 + 3888.5 = 37221.50
    expect(result.grossSubtotal).toBe(37221.5);
    expect(result.mwstBetrag).toBe(3014.94);
    expect(result.total).toBe(40236.44);
  });
});

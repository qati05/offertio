import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mmToPt, QR_BILL_MM, QR_BILL_PT, QR_BILL_PAGE_BOTTOM_PT } from "@/lib/qr-bill-layout";

/**
 * The payment part has to be the size the standard fixes.
 *
 * Every template carried it as raw numbers, and the height was copied from the
 * millimetre figure without converting: `height: 105` is 105 pt — 37 mm, a
 * third of the 105 mm the standard requires. The width beside it (`width: 175`)
 * WAS converted from 62 mm, which is what makes the mistake so easy to miss:
 * one number in the same object was right.
 *
 * The QR code at 80 pt was the consequence, not the cause. It had to be small
 * to fit inside a strip that was two thirds too short.
 */

const TEMPLATES = [
  "src/components/OffertePDF.tsx",
  "src/components/pdf/PDFMinimal.tsx",
  "src/components/pdf/PDFModern.tsx",
  "src/components/pdf/PDFProfessionell.tsx",
  "src/components/pdf/PDFFarbig.tsx",
];

describe("millimetres convert to points correctly", () => {
  it("uses 72 points per inch and 25.4 mm per inch", () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 2);
    expect(mmToPt(210)).toBeCloseTo(595.28, 1); // A4 width
    expect(mmToPt(0)).toBe(0);
  });

  it("puts the QR code at 46 mm", () => {
    expect(QR_BILL_MM.code).toBe(46);
    expect(QR_BILL_PT.code).toBeCloseTo(130.39, 1);
  });

  it("puts the strip at 105 mm, not 105 pt", () => {
    // The bug, stated as an assertion: 105 pt would be 37 mm.
    expect(QR_BILL_PT.stripHeight).toBeCloseTo(297.64, 1);
    expect(QR_BILL_PT.stripHeight).not.toBeCloseTo(105, 0);
  });

  it("keeps receipt and payment part adding up to the page width", () => {
    expect(QR_BILL_MM.receiptWidth + QR_BILL_MM.paymentWidth).toBe(210);
    expect(QR_BILL_PT.receiptWidth + QR_BILL_PT.paymentWidth).toBeCloseTo(595.28, 1);
  });

  it("leaves room on the page for the strip", () => {
    expect(QR_BILL_PAGE_BOTTOM_PT).toBeGreaterThan(QR_BILL_PT.stripHeight);
  });
});

describe.each(TEMPLATES)("%s", (path) => {
  const source = readFileSync(path, "utf8");

  it("takes its payment-part geometry from the shared module", () => {
    expect(source).toContain("QR_BILL_PT");
  });

  it("no longer hard-codes the wrong strip height", () => {
    expect(source).not.toMatch(/height:\s*105\b/);
  });

  it("no longer renders the QR code at 80 pt", () => {
    expect(source).not.toMatch(/qrImage:\s*\{\s*width:\s*80/);
  });

  it("leaves the page enough bottom padding for the strip", () => {
    // Asserting the mere presence of the constant would pass on the import
    // line alone — this checks the page style actually uses it, which is what
    // stops the item table running underneath the strip.
    const pageStyle = source.slice(source.indexOf("page: {"), source.indexOf("page: {") + 400);
    expect(pageStyle).toMatch(/padding[^,]*QR_BILL_PAGE_BOTTOM_PT|paddingBottom:\s*QR_BILL_PAGE_BOTTOM_PT/);
  });
});

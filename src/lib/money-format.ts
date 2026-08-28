import type { Land } from "./types";

/**
 * How amounts are written on a document, by the issuer's country.
 *
 * Switzerland groups with an apostrophe and separates decimals with a point
 * (1'234.56). Germany does the opposite (1.234,56). Printing Swiss formatting
 * on a German invoice is not a cosmetic slip — the apostrophe grouping is not
 * used in Germany at all, so the amount reads as a foreign document.
 *
 * Austria shares the German format here on purpose. ICU's de-AT groups with a
 * non-breaking space (U+00A0), which is a poor fit for a PDF: invisible in
 * review, fragile under copy-paste, and dependent on the embedded font carrying
 * the glyph. Austrian invoices are conventionally written 1.234,56 as well.
 */
export function moneyLocaleFor(land: Land | string | undefined): "de-CH" | "de-DE" {
  return land === "DE" || land === "AT" ? "de-DE" : "de-CH";
}

/**
 * Format an amount for display on a document, always with two decimals.
 *
 * Unknown or missing countries fall back to the Swiss format, matching the
 * product's default country (profiles.land DEFAULT 'CH').
 */
export function formatMoney(value: number, land: Land | string | undefined): string {
  return value.toLocaleString(moneyLocaleFor(land), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

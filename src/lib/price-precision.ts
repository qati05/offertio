/**
 * Money precision for line items.
 *
 * Unit prices and quantities must carry at most two decimals, because they
 * multiply into amounts that get printed and taxed.
 *
 * The concrete reason: EN 16931 requires the header total BT-106 to equal the
 * sum of the rounded line amounts the invoice actually shows, while the PDF
 * sums the raw products. For a sub-cent unit price (2 x 0.005) the two
 * disagree by one cent — a known limitation documented in zugferd-xml.ts.
 * Rejecting the input closes that off at the source, which is far safer than
 * changing the PDF's arithmetic: that same figure feeds the Swiss QR-bill
 * amount, and Swiss banks reject a payment slip whose amount does not match
 * the printed total.
 */

/** Round to whole cents, away from zero on a tie. */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * True when the value is a finite number with at most two decimals.
 *
 * Compares against the rounded value rather than testing `value * 100 % 1`,
 * which misjudges figures like 8.1 that have no exact binary representation.
 */
export function hasAtMostTwoDecimals(value: number): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  return Math.abs(value - roundToCents(value)) < 1e-9;
}

export type PositionCheck =
  | { ok: true }
  | { ok: false; index: number; field: "menge" | "preis" | "shape"; message: string };

/**
 * Validate the money-bearing fields of a position list.
 *
 * Deliberately narrow: this checks numeric shape only. Descriptions, units and
 * whether the list may be empty are someone else's concern.
 */
export function validatePositionen(positionen: unknown): PositionCheck {
  if (!Array.isArray(positionen)) {
    return {
      ok: false,
      index: -1,
      field: "shape",
      message: "Positionen müssen eine Liste sein.",
    };
  }

  for (let index = 0; index < positionen.length; index++) {
    const position = positionen[index];
    if (!position || typeof position !== "object") {
      return {
        ok: false,
        index,
        field: "shape",
        message: `Position ${index + 1} hat ein ungültiges Format.`,
      };
    }

    const { menge, preis } = position as { menge?: unknown; preis?: unknown };

    if (typeof menge !== "number" || !Number.isFinite(menge)) {
      return {
        ok: false,
        index,
        field: "menge",
        message: `Position ${index + 1}: Menge muss eine Zahl sein.`,
      };
    }
    if (!hasAtMostTwoDecimals(menge)) {
      return {
        ok: false,
        index,
        field: "menge",
        message: `Position ${index + 1}: Menge darf höchstens zwei Nachkommastellen haben.`,
      };
    }

    if (typeof preis !== "number" || !Number.isFinite(preis)) {
      return {
        ok: false,
        index,
        field: "preis",
        message: `Position ${index + 1}: Preis muss eine Zahl sein.`,
      };
    }
    if (!hasAtMostTwoDecimals(preis)) {
      return {
        ok: false,
        index,
        field: "preis",
        message: `Position ${index + 1}: Preis darf höchstens zwei Nachkommastellen haben (kleinste Einheit ist ein Rappen bzw. Cent).`,
      };
    }
  }

  return { ok: true };
}

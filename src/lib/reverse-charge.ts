import type { Land, Profile } from "./types";
import { getKleinunternehmerHinweis } from "./dach";

/**
 * Reverse charge — §13b UStG (Germany, domestic).
 *
 * Scope, deliberately narrow: two of the twelve categories in §13b Abs. 2 are
 * implemented, both between domestic German businesses —
 *   Nr. 4  Bauleistungen
 *   Nr. 8  Reinigung von Gebäuden und Gebäudeteilen
 * They share one mechanism: the recipient owes the tax when they themselves
 * sustainably perform services of that kind (§13b Abs. 5 S. 2, evidenced by a
 * USt 1 TG certificate). Only the cited paragraph and the printed notice
 * differ, which is why the catalogue is data-driven — a further category is a
 * data change, not a rewrite. No other category is enabled without a decision.
 *
 * Also deliberately out of scope: CH as a third country from a German
 * perspective, the Austrian equivalents, and any automatic determination of
 * whether §13b applies at all. Whether the recipient sustainably performs
 * construction services (§13b Abs. 5 S. 2, evidenced by a USt 1 TG certificate)
 * is a legal judgement about a specific customer. The application must not
 * guess it; the issuer asserts it.
 */

/** The reverse-charge cases the product supports. */
export type ReverseChargeId = "reverse_charge_13b_4" | "reverse_charge_13b_8";

export type Steuerfall = "standard" | ReverseChargeId;

export interface ReverseChargeCase {
  id: ReverseChargeId;
  /** The only country this case is valid for. */
  land: Land;
  /** Short label for the document form. */
  label: string;
  /**
   * The notice printed on the invoice.
   *
   * §14a Abs. 5 UStG requires the phrase "Steuerschuldnerschaft des
   * Leistungsempfängers" literally. The paragraph reference is added for
   * clarity; the mandated phrase itself must not be paraphrased.
   */
  hinweis: string;
  /** CEF VATEX code for BT-121 in the e-invoice. */
  vatexCode: string;
}

export const REVERSE_CHARGE_CASES: Record<ReverseChargeId, ReverseChargeCase> = {
  reverse_charge_13b_4: {
    id: "reverse_charge_13b_4",
    land: "DE",
    label: "Bauleistung (§ 13b Abs. 2 Nr. 4 UStG)",
    hinweis:
      "Steuerschuldnerschaft des Leistungsempfängers (§ 13b Abs. 2 Nr. 4 i. V. m. Abs. 5 UStG)",
    vatexCode: "VATEX-EU-AE",
  },
  reverse_charge_13b_8: {
    id: "reverse_charge_13b_8",
    land: "DE",
    label: "Gebäudereinigung (§ 13b Abs. 2 Nr. 8 UStG)",
    hinweis:
      "Steuerschuldnerschaft des Leistungsempfängers (§ 13b Abs. 2 Nr. 8 i. V. m. Abs. 5 UStG)",
    // The coded reason is "reverse charge" regardless of which national
    // paragraph triggers it; the German specifics live in the text (BT-120).
    vatexCode: "VATEX-EU-AE",
  },
};

/** Every reverse-charge case available for a given country, for the UI. */
export function getReverseChargeCasesForLand(land: Land | string | undefined): ReverseChargeCase[] {
  return Object.values(REVERSE_CHARGE_CASES).filter((c) => c.land === land);
}

/** Look up a reverse-charge case, or null for the standard case / anything unknown. */
export function getReverseChargeCase(steuerfall: unknown): ReverseChargeCase | null {
  if (typeof steuerfall !== "string") return null;
  return (REVERSE_CHARGE_CASES as Record<string, ReverseChargeCase>)[steuerfall] ?? null;
}

/** True when this document shifts the tax liability to the recipient. */
export function isReverseCharge(steuerfall: unknown): boolean {
  return getReverseChargeCase(steuerfall) !== null;
}

/** The invoice notice for a reverse-charge case, or null for the standard case. */
export function getReverseChargeHinweis(steuerfall: unknown): string | null {
  return getReverseChargeCase(steuerfall)?.hinweis ?? null;
}

export type ReverseChargeRejectionCode =
  | "land_not_supported"
  | "kleinunternehmer_unsupported"
  | "seller_vat_id_required"
  | "buyer_vat_id_required";

export type ReverseChargeCheck =
  | { ok: true }
  | { ok: false; code: ReverseChargeRejectionCode; message: string };

export interface ReverseChargeEligibilityInput {
  steuerfall: unknown;
  land: Land | string | undefined;
  /** Issuer's USt-IdNr. (BT-31). */
  sellerVatId: string | null | undefined;
  /** Recipient's USt-IdNr. (BT-48). */
  buyerVatId: string | null | undefined;
  kleinunternehmer: boolean | undefined;
}

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Decide whether a document may be issued as reverse charge.
 *
 * The VAT-id requirements are not bureaucratic caution — EN 16931 enforces
 * them. BR-AE-02 requires the seller's VAT identifier and BR-AE-03/BR-AE-04
 * the same for document-level allowances and charges, with the buyer's
 * identifier needed for the recipient to be identifiable at all. Without them
 * the generated e-invoice fails validation, so a document that cannot be
 * issued validly is refused up front rather than produced and rejected later.
 */
export function checkReverseChargeEligibility(
  input: ReverseChargeEligibilityInput,
): ReverseChargeCheck {
  const rcCase = getReverseChargeCase(input.steuerfall);
  if (!rcCase) return { ok: true };

  if (input.land !== rcCase.land) {
    return {
      ok: false,
      code: "land_not_supported",
      message:
        "Reverse Charge nach § 13b UStG ist derzeit nur für deutsche Rechnungen an deutsche Geschäftskunden verfügbar.",
    };
  }

  if (input.kleinunternehmer) {
    return {
      ok: false,
      code: "kleinunternehmer_unsupported",
      message:
        "Als Kleinunternehmer nach § 19 UStG kann Reverse Charge in Offertio nicht ausgestellt werden. Bitte kläre diesen Fall mit deiner Steuerberatung.",
    };
  }

  // Seller first: the issuer can fix their own profile immediately, whereas a
  // missing customer VAT id needs a call to the customer.
  if (!present(input.sellerVatId)) {
    return {
      ok: false,
      code: "seller_vat_id_required",
      message:
        "Für Reverse Charge brauchst du deine eigene USt-IdNr. im Profil. Eine Steuernummer allein genügt hier nicht.",
    };
  }

  if (!present(input.buyerVatId)) {
    return {
      ok: false,
      code: "buyer_vat_id_required",
      message:
        "Für Reverse Charge muss die USt-IdNr. des Empfängers auf der Rechnung stehen. Bitte beim Kunden erfragen und im Dokument eintragen.",
    };
  }

  return { ok: true };
}

// ── PDF rendering helpers ────────────────────────────────────────────────────
// All five PDF templates duplicate the same totals block. These two functions
// are the single place that decides which tax notice a document carries and at
// which rate it is printed, so a reverse-charge invoice cannot come out correct
// in one layout and wrong in another.

/**
 * The tax notice printed instead of a VAT line, or null for an ordinary
 * invoice.
 *
 * Reverse charge takes precedence over the Kleinunternehmer notice. The
 * combination is refused before a document is saved, so this only decides how
 * a pre-existing record renders — and naming the party who owes the tax is
 * safer than a §19 notice that would suggest nobody does.
 */
export function getSteuerHinweis(
  profil: Pick<Profile, "land" | "kleinunternehmer">,
  steuerfall: unknown,
): string | null {
  const rcCase = getReverseChargeCase(steuerfall);
  if (rcCase) return rcCase.hinweis;
  if (profil.kleinunternehmer) return getKleinunternehmerHinweis(profil.land);
  return null;
}

/**
 * The VAT rate a document is actually printed at.
 *
 * Forced to 0 for reverse charge and for Kleinunternehmer. For reverse charge
 * this is not cosmetic: §14a Abs. 5 UStG disapplies the separate tax statement,
 * and an invoice claiming reverse charge while showing VAT makes the issuer
 * liable for that VAT under §14c UStG.
 */
export function getEffektiverMwstSatz(
  mwstSatz: number,
  profil: Pick<Profile, "kleinunternehmer">,
  steuerfall: unknown,
): number {
  if (isReverseCharge(steuerfall)) return 0;
  if (profil.kleinunternehmer) return 0;
  return mwstSatz;
}

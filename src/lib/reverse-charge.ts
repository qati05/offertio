import type { Land } from "./types";

/**
 * Reverse charge — §13b UStG (Germany, domestic).
 *
 * Scope note, deliberately narrow: only §13b Abs. 2 Nr. 4 (Bauleistungen)
 * between two domestic German businesses is implemented. §13b Abs. 2 has a
 * further eleven categories; the one that is structurally identical and
 * commercially relevant here is Nr. 8 (Reinigung von Gebäuden und
 * Gebäudeteilen) — same "nachhaltig" test, same USt 1 TG evidence, only the
 * cited paragraph and the notice text differ. The catalogue below is keyed and
 * data-driven so adding it is a data change, not a rewrite, but it is NOT
 * enabled without an explicit decision.
 *
 * Also deliberately out of scope: CH as a third country from a German
 * perspective, the Austrian equivalents, and any automatic determination of
 * whether §13b applies at all. Whether the recipient sustainably performs
 * construction services (§13b Abs. 5 S. 2, evidenced by a USt 1 TG certificate)
 * is a legal judgement about a specific customer. The application must not
 * guess it; the issuer asserts it.
 */

export type Steuerfall = "standard" | "reverse_charge_13b_4";

export interface ReverseChargeCase {
  id: Steuerfall;
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

export const REVERSE_CHARGE_CASES: Record<"reverse_charge_13b_4", ReverseChargeCase> = {
  reverse_charge_13b_4: {
    id: "reverse_charge_13b_4",
    land: "DE",
    label: "Bauleistung (§ 13b Abs. 2 Nr. 4 UStG)",
    hinweis:
      "Steuerschuldnerschaft des Leistungsempfängers (§ 13b Abs. 2 Nr. 4 i. V. m. Abs. 5 UStG)",
    vatexCode: "VATEX-EU-AE",
  },
};

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

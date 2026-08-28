/**
 * Preconditions a document must meet before a ZUGFeRD e-invoice may be built
 * from it.
 *
 * These are refusals, not warnings. An e-invoice that fails EN 16931 is worse
 * than no e-invoice: the PDF looks perfectly correct, so the defect only
 * surfaces when the recipient's system rejects it — by which time the invoice
 * has been sent and the issuer has no idea why nothing happened.
 */

/** Fields of the issuer's profile that can identify them to EN 16931. */
export interface SellerIdentity {
  /** USt-IdNr. — emitted as BT-31 (SpecifiedTaxRegistration, schemeID "VA"). */
  uid_mwst?: string | null;
  /** Steuernummer — emitted as schemeID "FC", which BR-CO-26 does NOT accept. */
  steuernummer?: string | null;
}

export type EligibilityCheck =
  | { ok: true }
  | { ok: false; code: "seller_not_identifiable"; message: string };

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * BR-CO-26: the invoice must carry the Seller identifier (BT-29), the Seller
 * legal registration identifier (BT-30) and/or the Seller VAT identifier
 * (BT-31).
 *
 * Of the three, only BT-31 is available here, and it is filled from the
 * USt-IdNr. A Steuernummer does not qualify: it goes out as
 * SpecifiedTaxRegistration with schemeID "FC", and the rule's test accepts only
 * schemeID "VA" in that position.
 *
 * We deliberately do NOT fall back to putting the Steuernummer into BT-29 or
 * BT-30 to satisfy the rule. BT-30 is an identifier issued by a company
 * registrar (a Handelsregisternummer), and the Steuernummer comes from the
 * Finanzamt — filling it there would make the document validate while telling
 * the recipient's system something untrue. §14 Abs. 4 Nr. 2 UStG treats the two
 * as interchangeable on a paper invoice; EN 16931 does not.
 *
 * Consequence, deliberate: a German user holding only a Steuernummer cannot
 * produce an e-invoice. They can still issue an ordinary PDF invoice, which
 * §14 Abs. 4 Nr. 2 UStG allows with a Steuernummer alone.
 */
export function checkSellerIdentifiable(seller: SellerIdentity): EligibilityCheck {
  if (present(seller.uid_mwst)) return { ok: true };

  return {
    ok: false,
    code: "seller_not_identifiable",
    message:
      "Für eine E-Rechnung (ZUGFeRD) brauchst du eine USt-IdNr. im Profil — eine Steuernummer allein genügt dem europäischen Standard EN 16931 nicht. " +
      "Die USt-IdNr. bekommst du kostenlos beim Bundeszentralamt für Steuern (BZSt). " +
      "Eine normale PDF-Rechnung kannst du weiterhin mit der Steuernummer ausstellen.",
  };
}

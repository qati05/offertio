import type { Land } from "./types";
import { getDachConfig } from "./dach";

/**
 * Mandatory invoice fields, per country, in one place.
 *
 * These rules previously sat inline in /api/dokument/save, added one country at
 * a time. Collecting them made the gap obvious: Austria had two rules, Germany
 * one, and Switzerland none — even though Art. 26 MWSTG is as explicit as
 * §11 UStG about the supplier's VAT number.
 *
 * Scope of this module: fields that must be PRESENT on an invoice. It does not
 * decide tax treatment (see reverse-charge.ts), whether an e-invoice can be
 * built (see e-rechnung-eligibility.ts), or whether a document may still be
 * changed (see dokument-immutability.ts). Keeping those four apart is what lets
 * a further country be added as data rather than as another branch in a route
 * handler.
 *
 * An unknown country is unconstrained rather than rejected: the product only
 * ships CH/DE/AT, and refusing an unrecognised value here would turn a
 * configuration mistake into a total outage.
 */

export type InvoiceRequirementCode =
  | "leistungsdatum_required"
  | "ch_seller_uid_required"
  | "at_seller_uid_required"
  | "at_recipient_uid_required";

export type InvoiceRequirementCheck =
  | { ok: true }
  | { ok: false; code: InvoiceRequirementCode; message: string };

export interface InvoiceRequirementInput {
  typ: string;
  land: Land | string | undefined;
  /** Gross total, used for the Austrian EUR 10 000 threshold. */
  betrag: number;
  mwstSatz: number;
  leistungsdatum: string | null | undefined;
  /** Issuer's UID / USt-IdNr. */
  sellerUid: string | null | undefined;
  /** Recipient's UID / USt-IdNr. */
  recipientUid: string | null | undefined;
  kleinunternehmer: boolean | null | undefined;
}

/** Austrian threshold above which the recipient's UID is mandatory (gross). */
export const AT_RECIPIENT_UID_THRESHOLD = 10_000;

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function checkInvoiceRequirements(
  input: InvoiceRequirementInput,
): InvoiceRequirementCheck {
  // None of these statutes apply to a quotation.
  if (input.typ !== "rechnung") return { ok: true };

  const config = getDachConfig(input.land);

  // §14 Abs. 4 Nr. 6 UStG (DE) / §11 Abs. 1 Z 6 UStG (AT).
  // Switzerland is deliberately absent: Art. 26 Abs. 2 lit. c MWSTG asks for
  // the service date only where it differs from the invoice date.
  if (config.leistungsdatumRequired && !present(input.leistungsdatum)) {
    return {
      ok: false,
      code: "leistungsdatum_required",
      message: "Leistungsdatum ist für Rechnungen in DE/AT gesetzlich erforderlich.",
    };
  }

  // Art. 26 Abs. 2 lit. a MWSTG: a Swiss supplier charging MWST must state
  // their UID. Without it the recipient cannot deduct the input tax, so the
  // invoice is worthless to them while the issuer still owes the tax.
  // A Kleinunternehmer charges no MWST and has no UID to state.
  if (
    input.land === "CH" &&
    input.mwstSatz > 0 &&
    !input.kleinunternehmer &&
    !present(input.sellerUid)
  ) {
    return {
      ok: false,
      code: "ch_seller_uid_required",
      message:
        "Für Schweizer Rechnungen mit MWST ist die eigene UID-Nummer erforderlich (Art. 26 Abs. 2 lit. a MWSTG). Ohne sie kann dein Kunde die Vorsteuer nicht abziehen. Trage sie im Profil ein — oder setze den MWST-Satz auf 0 %, falls du nicht MWST-pflichtig bist.",
    };
  }

  // §11 Abs. 1 Z 6 UStG (AT): the supplier's UID is mandatory on every invoice
  // unless they qualify as Kleinunternehmer (§6 Abs. 1 Z 27 UStG).
  if (input.land === "AT" && !input.kleinunternehmer && !present(input.sellerUid)) {
    return {
      ok: false,
      code: "at_seller_uid_required",
      message:
        "Für österreichische Rechnungen ist die eigene UID-Nummer im Profil gesetzlich erforderlich (§11 UStG).",
    };
  }

  // §11 Abs. 1 Z 8 UStG (AT): from EUR 10 000 gross the recipient's UID is
  // mandatory.
  if (
    input.land === "AT" &&
    input.betrag >= AT_RECIPIENT_UID_THRESHOLD &&
    !present(input.recipientUid)
  ) {
    return {
      ok: false,
      code: "at_recipient_uid_required",
      message:
        "Für österreichische Rechnungen ab EUR 10.000 ist die UID des Empfängers gesetzlich erforderlich.",
    };
  }

  return { ok: true };
}

import type { DokumentTyp } from "./types";

/**
 * Immutability of issued invoices.
 *
 * Once an invoice has left the building, the recipient holds a copy. Changing
 * its amount, positions, number or customer afterwards means two parties hold
 * different documents bearing the same number — which is precisely what
 * record-keeping rules exist to prevent (GoBD / §146 AO in Germany; Art. 957a
 * OR and the MWSTG retention rules in Switzerland). A correction is made by
 * cancelling and issuing anew, never by rewriting the original.
 *
 * Two deliberate boundaries:
 *
 *  - Offerten are NOT locked. A quotation creates no tax liability, and
 *    revising one before it is accepted is ordinary business.
 *  - Everything here fails CLOSED. An unrecognised status locks the document
 *    rather than unlocking it, so adding a status elsewhere can never silently
 *    make issued invoices editable again.
 */

export type DokumentStatus =
  | "entwurf"
  | "gesendet"
  | "angenommen"
  | "bezahlt"
  | "abgelaufen"
  | "ueberfaellig"
  | "storniert";

/** The only status in which a document is still being written. */
export const DRAFT_STATUS = "entwurf" as const;

/** Statuses that mean the document has been issued. Informational — the check
 *  below is "not a draft", so a new status is locked by default. */
export const ISSUED_STATUSES: readonly DokumentStatus[] = [
  "gesendet",
  "angenommen",
  "bezahlt",
  "abgelaufen",
  "ueberfaellig",
  "storniert",
];

/**
 * Has this document been issued?
 *
 * Anything that is not exactly the draft status counts as issued, including
 * unknown values and null. That asymmetry is intentional: the cost of wrongly
 * locking a document is an error message, the cost of wrongly unlocking one is
 * a silently altered invoice.
 */
export function isIssued(status: unknown): boolean {
  return status !== DRAFT_STATUS;
}

export type ImmutabilityCode = "invoice_issued" | "invoice_cancelled";

export type ImmutabilityCheck =
  | { ok: true }
  | { ok: false; code: ImmutabilityCode; message: string };

export interface ContentEditInput {
  typ: DokumentTyp | string;
  /** Status of the row being overwritten; null when creating a new document. */
  currentStatus: unknown;
}

/**
 * May the content of this document be overwritten?
 *
 * `currentStatus: null` means there is no existing row — nothing to protect.
 */
export function checkContentEdit(input: ContentEditInput): ImmutabilityCheck {
  if (input.currentStatus === null || input.currentStatus === undefined) {
    return { ok: true };
  }
  if (input.typ !== "rechnung") return { ok: true };
  if (!isIssued(input.currentStatus)) return { ok: true };

  if (input.currentStatus === "storniert") {
    return {
      ok: false,
      code: "invoice_cancelled",
      message:
        "Diese Rechnung wurde storniert und kann nicht mehr geändert werden. Erstelle eine neue Rechnung.",
    };
  }

  return {
    ok: false,
    code: "invoice_issued",
    message:
      "Diese Rechnung wurde bereits gestellt und darf nachträglich nicht mehr geändert werden. Storniere sie und erstelle eine neue Rechnung.",
  };
}

export type StornoCode = "not_an_invoice" | "not_issued" | "already_cancelled";

export type StornoCheck = { ok: true } | { ok: false; code: StornoCode; message: string };

export interface StornoInput {
  typ: DokumentTyp | string;
  currentStatus: unknown;
}

/**
 * May this document be cancelled?
 *
 * Cancellation is an invoice concept and applies only to a document that was
 * actually issued: a draft was never sent, so it is deleted rather than
 * cancelled. Cancellation is terminal — a cancelled invoice keeps its number
 * permanently, so the number can never be reused for different content.
 */
export function checkStornoTransition(input: StornoInput): StornoCheck {
  if (input.typ !== "rechnung") {
    return {
      ok: false,
      code: "not_an_invoice",
      message: "Nur Rechnungen können storniert werden. Offerten laufen ab oder werden zurückgezogen.",
    };
  }
  if (input.currentStatus === "storniert") {
    return {
      ok: false,
      code: "already_cancelled",
      message: "Diese Rechnung ist bereits storniert.",
    };
  }
  if (!isIssued(input.currentStatus)) {
    return {
      ok: false,
      code: "not_issued",
      message:
        "Ein Entwurf wurde nie gestellt und muss nicht storniert werden — du kannst ihn direkt löschen.",
    };
  }
  return { ok: true };
}

import { isIssued } from "./dokument-immutability";

/**
 * Which status changes a document may still make.
 *
 * THE HOLE THIS CLOSES
 *
 * /api/dokument/update-status validated only the TARGET status against a
 * whitelist. It never looked at where the document was coming from, and
 * "entwurf" was in that whitelist. So one PATCH — or one click in the archive's
 * status dropdown, which offers "Entwurf" like any other option — moved an
 * issued invoice back to draft.
 *
 * That is not a cosmetic problem. checkContentEdit() decides whether an invoice
 * may still be rewritten by reading the CURRENT status out of the database:
 * isIssued("entwurf") is false, so the very next save accepts a new Betrag, a
 * new Nummer, a new Kunde. Two ordinary requests, no database access, no special
 * knowledge — and because the dropdown offers the option in plain sight, a user
 * can do it by accident and never know what they switched off.
 *
 * §14 UStG and §146 AO (DE) and Art. 957a OR (CH) all require an issued invoice
 * to stay unchanged. The rule therefore belongs on the transition itself, not
 * only on the edit that follows it.
 *
 * WHY A SEPARATE MODULE
 *
 * dokument-immutability.ts answers "may this document's CONTENT change". This
 * answers "may its STATUS change". They share isIssued() so there is one
 * definition of "issued" rather than two that can drift apart, but they guard
 * different routes: content edits go through /api/dokument/save, status changes
 * through /api/dokument/update-status, /mark-paid and /mahnung.
 *
 * SCOPE, DELIBERATELY NARROW
 *
 * Only two transitions are refused, and only for invoices:
 *
 *   1. Anything → "entwurf" once the invoice has been issued. This is the hole
 *      above.
 *   2. Anything out of "storniert". Cancellation is terminal: the number stays
 *      permanently taken so it can never be reused for different content.
 *
 * Everything else stays allowed on purpose. "bezahlt" → "gesendet" looks like a
 * step backwards but is a legitimate correction — a payment can be reversed —
 * and no statute forbids it.
 *
 * Quotations are NOT covered. checkContentEdit already exempts them, they stay
 * editable after sending by design, and no statute governs their status. Adding
 * a restriction there would be a product decision, not a legal requirement.
 */

export type StatusTransitionCode = "cancelled_is_final" | "issued_invoice_cannot_reopen";

export type StatusTransitionCheck =
  | { ok: true }
  | { ok: false; code: StatusTransitionCode; message: string };

export interface StatusTransitionInput {
  typ: string;
  /** The status currently stored for this document. */
  currentStatus: unknown;
  /** The status the caller wants to set. */
  nextStatus: string;
}

export function checkStatusTransition(input: StatusTransitionInput): StatusTransitionCheck {
  // Quotations are unrestricted — see the scope note above.
  if (input.typ !== "rechnung") return { ok: true };

  // Setting the status it already has changes nothing and must stay harmless:
  // two tabs doing the same thing should not produce an error.
  if (input.currentStatus === input.nextStatus) return { ok: true };

  if (input.currentStatus === "storniert") {
    return {
      ok: false,
      code: "cancelled_is_final",
      message:
        "Diese Rechnung wurde storniert. Eine Stornierung lässt sich nicht rückgängig machen — erstelle bei Bedarf eine neue Rechnung.",
    };
  }

  if (input.nextStatus === "entwurf" && isIssued(input.currentStatus)) {
    return {
      ok: false,
      code: "issued_invoice_cannot_reopen",
      message:
        "Diese Rechnung wurde bereits gestellt und kann nicht zurück in den Entwurf gesetzt werden. Storniere sie und erstelle eine neue Rechnung.",
    };
  }

  return { ok: true };
}

/**
 * The question asked before an invoice is cancelled.
 *
 * Cancellation is the one terminal transition in the product: the number stays
 * permanently taken, and checkStatusTransition above refuses every way back
 * out. That deserves a question, and the question has to say so plainly —
 * "storniert" alone does not tell a cleaning company that nothing can be undone.
 *
 * Kept next to the transition rules rather than in its own file so the wording
 * and the rule it describes stay in one place, and pure so the wording can be
 * asserted without rendering the archive.
 */
export function getStornoConfirmation(nummer: string, kundenname?: string | null): string {
  const empfaenger =
    typeof kundenname === "string" && kundenname.trim().length > 0
      ? ` an ${kundenname.trim()}`
      : "";
  return (
    `Rechnung ${nummer}${empfaenger} stornieren?\n\n` +
    "Die Stornierung lässt sich nicht rückgängig machen. Die Rechnungsnummer bleibt " +
    "dauerhaft vergeben und kann nicht neu verwendet werden.\n\n" +
    "Grund (optional):"
  );
}

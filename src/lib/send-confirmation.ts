/**
 * The confirmation shown before a document is sent.
 *
 * Sending is the moment a document stops being a draft. For an invoice that is
 * irreversible: the row is written with status "gesendet", and from then on
 * checkContentEdit (src/lib/dokument-immutability.ts) refuses every change to
 * its content. The only correction route left is a Storno plus a new invoice —
 * which is exactly what §14 UStG / GoBD require, and exactly what a user who
 * mis-clicked would not expect.
 *
 * A quotation is deliberately NOT covered. checkContentEdit exempts anything
 * that is not `typ === "rechnung"`, so an Offerte stays editable after it is
 * sent. Asking "are you sure, this becomes unchangeable" there would be a lie,
 * and a confirmation on the most frequent flow is friction for nothing.
 *
 * Kept as a pure function so the wording can be asserted without rendering the
 * form: a confirmation that overstates what happens is its own kind of defect.
 */

export interface SendConfirmationInput {
  typ: string;
  nummer: string;
  /** Shown so the user can see WHICH document they are about to freeze. */
  kundenname?: string | null;
}

export interface SendConfirmation {
  /** False when sending needs no confirmation — quotations. */
  required: boolean;
  message: string;
}

export function getSendConfirmation(input: SendConfirmationInput): SendConfirmation {
  if (input.typ !== "rechnung") {
    return { required: false, message: "" };
  }

  const empfaenger =
    typeof input.kundenname === "string" && input.kundenname.trim().length > 0
      ? ` an ${input.kundenname.trim()}`
      : "";

  return {
    required: true,
    message:
      `Rechnung ${input.nummer}${empfaenger} jetzt senden?\n\n` +
      "Sie gilt damit als gestellt und kann danach nicht mehr geändert werden. " +
      "Eine Korrektur ist nur noch über eine Stornierung und eine neue Rechnung möglich.",
  };
}

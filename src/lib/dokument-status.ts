import type { DokumentHistorie } from "./types";

/**
 * Compute the effective display status of a document.
 *
 * The stored status is authoritative for manually-set states (bezahlt,
 * angenommen). However we auto-derive:
 *  - "ueberfaellig": Rechnung that was gesendet and past zahlungsfrist days
 *  - "abgelaufen":   Offerte that was gesendet and past 30 days (default validity)
 *
 * We only override when the stored status is "gesendet" — if the user already
 * manually set it to bezahlt/angenommen we never revert it.
 */
export function computeDocumentStatus(
  doc: DokumentHistorie,
  zahlungsfristTage: number = 30,
): DokumentHistorie {
  if (doc.status !== "gesendet") return doc;

  const now = Date.now();
  const docDate = new Date(doc.datum).getTime();
  const daysSince = (now - docDate) / (1000 * 60 * 60 * 24);

  if (doc.typ === "rechnung" && daysSince > zahlungsfristTage) {
    return { ...doc, status: "ueberfaellig" };
  }

  if (doc.typ === "offerte" && daysSince > 30) {
    return { ...doc, status: "abgelaufen" };
  }

  return doc;
}

/**
 * Count documents that need attention (sent but not yet resolved).
 */
export function countOpenActions(docs: DokumentHistorie[], zahlungsfristTage = 30): number {
  return docs.filter((doc) => {
    const effective = computeDocumentStatus(doc, zahlungsfristTage);
    return ["gesendet", "ueberfaellig"].includes(effective.status);
  }).length;
}

import type { DokumentHistorie } from "@/lib/types";

function escapeCsv(value: string | number | undefined) {
  const stringValue = String(value ?? "");
  // Quote values that require it: contain commas/quotes/newlines,
  // OR start with formula-injection characters (=, +, -, @) per OWASP CSV injection guidance.
  if (/[",\n]/.test(stringValue) || /^[=+\-@]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildDokumentCsv(
  docs: DokumentHistorie[],
  currency: string,
): string {
  const header = [
    "Typ",
    "Nummer",
    "Quelle",
    "Kunde",
    "Objekt",
    "Datum",
    "Leistungsdatum",
    "Status",
    "Betrag",
    "Waehrung",
  ];

  const rows = docs.map((doc) => [
    doc.typ,
    doc.nummer,
    doc.source_document_nummer || "",
    doc.kundenname,
    doc.objekt,
    doc.datum,
    doc.leistungsdatum || "",
    doc.status,
    doc.betrag.toFixed(2),
    currency,
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

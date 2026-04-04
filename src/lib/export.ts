import type { DokumentHistorie } from "@/lib/types";

function escapeCsv(value: string | number) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
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
    doc.status,
    doc.betrag.toFixed(2),
    currency,
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

import { buildDokumentCsv } from "@/lib/export";
import type { DokumentHistorie } from "@/lib/types";

export type CustomerExportRow = {
  display_name?: string | null;
  email?: string | null;
  adresse?: string | null;
  adresse2?: string | null;
  plz?: string | null;
  ort?: string | null;
  uid_mwst?: string | null;
  created_at?: string | null;
};

export type ExportPdf = {
  name: string;
  bytes: Uint8Array;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let crc = n;
    for (let k = 0; k < 8; k += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[n] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeCustomerCsv(value: string): string {
  const cleaned = value.replace(/[\t\r]/g, " ");
  if (/[",\n]/.test(cleaned) || /^[=+\-@]/.test(cleaned)) {
    const escaped = cleaned.replace(/"/g, '""');
    return /^[=+\-@]/.test(cleaned) ? `"'${escaped}"` : `"${escaped}"`;
  }
  return cleaned;
}

export function buildCustomersCsv(rows: CustomerExportRow[]): string {
  const header = ["Name", "E-Mail", "Adresse", "Adresszeile2", "PLZ", "Ort", "UID", "Erstellt"];
  const body = rows.map((row) => [
    row.display_name ?? "",
    row.email ?? "",
    row.adresse ?? "",
    row.adresse2 ?? "",
    row.plz ?? "",
    row.ort ?? "",
    row.uid_mwst ?? "",
    row.created_at ?? "",
  ]);
  return [header, ...body].map((line) => line.map(escapeCustomerCsv).join(",")).join("\n");
}

export function documentsToHistorie(rows: Array<Record<string, unknown>>): DokumentHistorie[] {
  return rows
    .filter((row) => row.typ === "offerte" || row.typ === "rechnung")
    .map((row) => {
      const amount = typeof row.betrag === "number" ? row.betrag : Number(row.betrag);
      return {
        typ: row.typ as DokumentHistorie["typ"],
        nummer: String(row.nummer ?? ""),
        objekt: typeof row.objekt === "string" ? row.objekt : "",
        kundenname: String(row.kundenname ?? ""),
        betrag: Number.isFinite(amount) ? amount : 0,
        datum: String(row.datum ?? ""),
        leistungsdatum: typeof row.leistungsdatum === "string" ? row.leistungsdatum : "",
        status: (typeof row.status === "string" ? row.status : "gesendet") as DokumentHistorie["status"],
        source_document_nummer:
          typeof row.source_document_nummer === "string" ? row.source_document_nummer : "",
      };
    });
}

/**
 * Storage object keys are `{userId}/{file}`. Anything else is refused so a
 * tampered pdf_url cannot pull another account's file, even if storage RLS
 * were misconfigured.
 */
export function isOwnedPdfPath(userId: string, pdfUrl: string | null | undefined): boolean {
  if (!userId || !pdfUrl) return false;
  if (pdfUrl.startsWith("/") || pdfUrl.includes("\\") || pdfUrl.includes("..")) return false;
  const parts = pdfUrl.split("/");
  if (parts.length < 2) return false;
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) return false;
  return parts[0] === userId;
}

export function pdfArchiveName(typ: string, nummer: string, used: Set<string>): string {
  const kind = typ === "rechnung" ? "rechnung" : "offerte";
  const safeNummer = nummer.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 80) || "dokument";
  let name = `pdfs/${kind}-${safeNummer}.pdf`;
  let suffix = 2;
  while (used.has(name)) {
    name = `pdfs/${kind}-${safeNummer}-${suffix}.pdf`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

function zipLocal(name: string, data: Uint8Array, offset: number): { local: Buffer; central: Buffer; next: number } {
  const nameBytes = Buffer.from(name, "utf8");
  const crc = crc32(data);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);
  nameBytes.copy(local, 30);

  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(offset, 42);
  nameBytes.copy(central, 46);

  return { local, central, next: offset + local.length + data.length };
}

/** Uncompressed ZIP (STORE). PDF bytes are already compressed. */
export function buildZip(files: Array<{ name: string; data: Uint8Array }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    if (file.name.includes("..") || file.name.startsWith("/") || file.name.includes("\\")) {
      throw new Error(`Unsicherer ZIP-Name: ${file.name}`);
    }
    const entry = zipLocal(file.name, file.data, offset);
    locals.push(entry.local, Buffer.from(file.data));
    centrals.push(entry.central);
    offset = entry.next;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, end]);
}

export function buildAccountZip(input: {
  documents: Array<Record<string, unknown>>;
  customers: CustomerExportRow[];
  currency: string;
  pdfs: ExportPdf[];
  missing: string[];
}): Buffer {
  const dokumenteCsv = buildDokumentCsv(documentsToHistorie(input.documents), input.currency);
  const kundenCsv = buildCustomersCsv(input.customers);
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: "dokumente.csv", data: Buffer.from(dokumenteCsv, "utf8") },
    { name: "kunden.csv", data: Buffer.from(kundenCsv, "utf8") },
  ];
  for (const pdf of input.pdfs) {
    files.push({ name: pdf.name, data: pdf.bytes });
  }
  if (input.missing.length > 0) {
    const note = [
      "Diese PDF-Pfade konnten nicht exportiert werden.",
      ...input.missing,
    ].join("\n");
    files.push({ name: "pdfs/fehlende-dateien.txt", data: Buffer.from(note, "utf8") });
  }
  return buildZip(files);
}

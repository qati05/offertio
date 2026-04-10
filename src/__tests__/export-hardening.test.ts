/**
 * Export Hardening — CSV injection, German umlauts, edge values
 *
 * The CSV export is the ONLY place betrag legitimately appears.
 * These tests verify the export is both correct AND injection-safe.
 */

import { describe, it, expect } from "vitest";
import { buildDokumentCsv } from "@/lib/export";
import type { DokumentHistorie } from "@/lib/types";

function makeDoc(overrides: Partial<DokumentHistorie> = {}): DokumentHistorie {
  return {
    id: "test-id",
    typ: "offerte",
    nummer: "OF-2026-001",
    kundenname: "Muster AG",
    datum: "2026-04-05",
    status: "gesendet",
    betrag: 1234.56,
    objekt: "Testauftrag",
    ...overrides,
  };
}

describe("buildDokumentCsv — correctness", () => {
  it("generates correct header row", () => {
    const csv = buildDokumentCsv([], "CHF");
    const header = csv.split("\n")[0];
    expect(header).toBe("Typ,Nummer,Quelle,Kunde,Objekt,Datum,Leistungsdatum,Status,Betrag,Waehrung");
  });

  it("generates correct data row", () => {
    const doc = makeDoc();
    const csv = buildDokumentCsv([doc], "CHF");
    const rows = csv.split("\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe("offerte,OF-2026-001,,Muster AG,Testauftrag,2026-04-05,,gesendet,1234.56,CHF");
  });

  it("formats betrag with exactly 2 decimal places", () => {
    const csv = buildDokumentCsv([makeDoc({ betrag: 100 })], "CHF");
    expect(csv).toContain("100.00");
  });

  it("formats zero betrag as 0.00", () => {
    const csv = buildDokumentCsv([makeDoc({ betrag: 0 })], "CHF");
    expect(csv).toContain("0.00");
  });

  it("handles very large betrag correctly", () => {
    const csv = buildDokumentCsv([makeDoc({ betrag: 999_999.99 })], "CHF");
    expect(csv).toContain("999999.99");
  });

  it("includes source_document_nummer in Quelle column", () => {
    const csv = buildDokumentCsv(
      [makeDoc({ source_document_nummer: "OF-2026-001" })],
      "CHF",
    );
    expect(csv).toContain("OF-2026-001");
  });

  it("empty Quelle column when no source_document_nummer", () => {
    const doc = makeDoc({ source_document_nummer: undefined });
    const csv = buildDokumentCsv([doc], "CHF");
    const row = csv.split("\n")[1];
    // Quelle is position 2 (index 2)
    const cols = row.split(",");
    expect(cols[2]).toBe("");
  });

  it("handles empty docs array — only header row", () => {
    const csv = buildDokumentCsv([], "EUR");
    const rows = csv.split("\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Typ");
  });

  it("handles rechnung typ correctly", () => {
    const csv = buildDokumentCsv([makeDoc({ typ: "rechnung" })], "CHF");
    expect(csv).toContain("rechnung");
  });

  it("uses provided currency in every data row", () => {
    const docs = [makeDoc(), makeDoc({ nummer: "OF-2026-002" })];
    const csv = buildDokumentCsv(docs, "EUR");
    const rows = csv.split("\n").slice(1);
    for (const row of rows) {
      expect(row.endsWith("EUR")).toBe(true);
    }
  });
});

describe("buildDokumentCsv — CSV injection prevention", () => {
  const INJECTION_PAYLOADS = [
    "=SUM(1+1)",
    "+1+1",
    "-1+1",
    "@SUM(1+1)",
    "=cmd|' /C calc'!A0",
    "=HYPERLINK(\"http://evil.com\",\"click\")",
  ];

  for (const payload of INJECTION_PAYLOADS) {
    it(`wraps injection payload in quotes with single-quote prefix: "${payload}"`, () => {
      const csv = buildDokumentCsv([makeDoc({ kundenname: payload })], "CHF");
      const row = csv.split("\n")[1];
      // The cell must start with a double-quote — verifies the cell is quoted
      // Note: internal " chars are correctly doubled per RFC 4180 (e.g. "he said ""hi""")
      const cells = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      const kundeCell = cells[3]; // Kunde is position 3
      expect(kundeCell.startsWith('"'), `Cell for "${payload}" must be quoted`).toBe(true);
      expect(kundeCell.endsWith('"'), `Cell for "${payload}" must end with quote`).toBe(true);
      // Formula-injection payloads must have a leading single-quote inside the quotes
      // to prevent spreadsheet formula execution.
      expect(kundeCell.startsWith("\"'"), `Cell for "${payload}" must have single-quote prefix`).toBe(true);
    });
  }

  it("strips tab characters from values (CSV injection vector)", () => {
    const csv = buildDokumentCsv([makeDoc({ kundenname: "Foo\tBar" })], "CHF");
    expect(csv).not.toContain("\t");
    expect(csv).toContain("Foo Bar");
  });

  it("strips carriage return characters from values", () => {
    const csv = buildDokumentCsv([makeDoc({ kundenname: "Foo\rBar" })], "CHF");
    expect(csv).not.toContain("\r");
    expect(csv).toContain("Foo Bar");
  });

  it("escapes double-quotes inside values by doubling them", () => {
    const csv = buildDokumentCsv(
      [makeDoc({ kundenname: 'Müller "GmbH"' })],
      "CHF",
    );
    expect(csv).toContain('"Müller ""GmbH"""');
  });

  it("wraps values containing commas in quotes", () => {
    const csv = buildDokumentCsv(
      [makeDoc({ kundenname: "Schmidt, Karl" })],
      "CHF",
    );
    expect(csv).toContain('"Schmidt, Karl"');
  });

  it("wraps values containing newlines in quotes", () => {
    const csv = buildDokumentCsv(
      [makeDoc({ kundenname: "Line1\nLine2" })],
      "CHF",
    );
    expect(csv).toContain('"Line1\nLine2"');
  });
});

describe("buildDokumentCsv — German & international characters", () => {
  const GERMAN_CHARS = [
    { name: "Müller AG",         desc: "ü umlaut" },
    { name: "Schäfer & Söhne",   desc: "ä, ö, & symbol" },
    { name: "Küchen GmbH",       desc: "ü in compound" },
    { name: "Weiß & Partner",    desc: "ß eszett" },
    { name: "Björk Design",      desc: "Nordic ö" },
    { name: "Tanaka Corp. 日本", desc: "Japanese kanji" },
  ];

  for (const { name, desc } of GERMAN_CHARS) {
    it(`preserves special characters: ${desc}`, () => {
      const csv = buildDokumentCsv([makeDoc({ kundenname: name })], "CHF");
      expect(csv).toContain(name);
    });
  }

  it("handles objekt with umlauts", () => {
    const csv = buildDokumentCsv(
      [makeDoc({ objekt: "Büroausstattung für Küche" })],
      "CHF",
    );
    expect(csv).toContain("Büroausstattung für Küche");
  });
});

describe("buildDokumentCsv — boundary conditions", () => {
  it("handles very long customer name (200 chars)", () => {
    const longName = "A".repeat(200);
    const csv = buildDokumentCsv([makeDoc({ kundenname: longName })], "CHF");
    expect(csv).toContain(longName);
  });

  it("handles undefined objekt gracefully", () => {
    const csv = buildDokumentCsv([makeDoc({ objekt: undefined })], "CHF");
    // Should not throw — objekt column should be empty
    const row = csv.split("\n")[1];
    expect(row).toBeDefined();
    // The undefined becomes empty string
    const cols = row.split(",");
    expect(cols[4]).toBe(""); // objekt is index 4
  });

  it("multi-document export produces correct row count", () => {
    const docs = Array.from({ length: 50 }, (_, i) =>
      makeDoc({ nummer: `OF-2026-${String(i + 1).padStart(3, "0")}` }),
    );
    const csv = buildDokumentCsv(docs, "CHF");
    const rows = csv.split("\n");
    expect(rows).toHaveLength(51); // 1 header + 50 data
  });

  it("all status values are preserved verbatim in CSV", () => {
    const statuses = ["entwurf", "gesendet", "bezahlt", "angenommen", "abgelaufen", "ueberfaellig"];
    for (const status of statuses) {
      const csv = buildDokumentCsv([makeDoc({ status })], "CHF");
      expect(csv).toContain(status);
    }
  });
});

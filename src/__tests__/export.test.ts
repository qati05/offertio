import { describe, expect, it } from "vitest";
import { buildDokumentCsv } from "@/lib/export";
import type { DokumentHistorie } from "@/lib/types";

describe("document export", () => {
  it("builds CSV rows for documents", () => {
    const docs: DokumentHistorie[] = [
      {
        typ: "offerte",
        nummer: "OF-1",
        source_document_nummer: "OF-0",
        objekt: "Objekt",
        kundenname: "Muster AG",
        betrag: 123.45,
        datum: "2026-04-03",
        status: "gesendet",
      },
    ];

    const csv = buildDokumentCsv(docs, "CHF");
    expect(csv).toContain("Typ,Nummer,Quelle,Kunde,Objekt,Datum,Status,Betrag,Waehrung");
    expect(csv).toContain("offerte,OF-1,OF-0,Muster AG,Objekt,2026-04-03,gesendet,123.45,CHF");
  });
});

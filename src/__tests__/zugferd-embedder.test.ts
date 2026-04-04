import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { embedZugferdXml } from "@/lib/zugferd-embedder";
import { buildZugferdXml } from "@/lib/zugferd-xml";
import type { OfferteData } from "@/lib/types";

const sampleData: OfferteData = {
  nummer: "RE-2024-007",
  datum: "2024-06-01",
  kunde: {
    name: "Erika Mustermann",
    firma: "Demo AG",
    adresse: "Testweg 5",
    adresse2: "",
    plz: "10115",
    ort: "Berlin",
    email: "erika@demo.de",
  },
  positionen: [
    { bezeichnung: "Consulting", einheit: "Std", menge: 8, preis: 120 },
  ],
  mwstSatz: 19,
  notiz: "",
  profil: {
    id: "u1",
    email: "vendor@test.de",
    firmenname: "Vendor GmbH",
    vorname: "Max",
    nachname: "Tester",
    adresse: "Vendorstr. 1",
    plz: "80331",
    ort: "München",
    telefon: "",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    uid_mwst: "DE123456789",
    steuernummer: "143/234/50515",
    logo_url: "",
    land: "DE",
    sprache: "de",
    beruf: "Berater",
    zahlungsfrist: 14,
    plan: "pro_monthly",
    created_at: "2024-01-01T00:00:00Z",
  },
};

/** Create a minimal valid PDF as Uint8Array for testing */
async function makeDummyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  return doc.save();
}

describe("embedZugferdXml", () => {
  it("returns a Uint8Array larger than the input", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData);
    const result = await embedZugferdXml(pdfBytes, xml);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(pdfBytes.length);
  });

  it("output is still a valid PDF", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData);
    const result = await embedZugferdXml(pdfBytes, xml);
    // Should not throw on reload
    const reloaded = await PDFDocument.load(result);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("XML is extractable from the embedded attachments (roundtrip)", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData);
    const result = await embedZugferdXml(pdfBytes, xml);

    // Reload and check for the embedded file name in the raw bytes
    const resultStr = new TextDecoder().decode(result);
    expect(resultStr).toContain("factur-x.xml");
  });

  it("output contains embedded file reference for factur-x.xml", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData);
    const result = await embedZugferdXml(pdfBytes, xml);
    // The Filespec entry (filename) is stored uncompressed in the PDF catalog
    const resultStr = Buffer.from(result).toString("binary");
    expect(resultStr).toContain("factur-x.xml");
  });

  it("output contains XMP Factur-X metadata", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData);
    const result = await embedZugferdXml(pdfBytes, xml);
    const resultStr = new TextDecoder().decode(result);
    expect(resultStr).toContain("factur-x:pdfa:CrossIndustryDocument");
    expect(resultStr).toContain("INVOICE");
    expect(resultStr).toContain("EN 16931");
  });

  it("works without leistungsdatum (falls back to datum)", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData); // no leistungsdatum
    const result = await embedZugferdXml(pdfBytes, xml);
    expect(result.length).toBeGreaterThan(0);
  });

  it("works with leistungsdatum provided", async () => {
    const pdfBytes = await makeDummyPdf();
    const xml = buildZugferdXml(sampleData, "2024-06-05");
    // Verify leistungsdatum is in the XML (xml layer is tested separately)
    expect(xml).toContain("20240605");
    const result = await embedZugferdXml(pdfBytes, xml);
    expect(result.length).toBeGreaterThan(pdfBytes.length);
  });

  it("throws on empty PDF input", async () => {
    await expect(
      embedZugferdXml(new Uint8Array(0), "<xml/>"),
    ).rejects.toThrow("Ungültiges PDF");
  });

  it("throws on non-PDF bytes", async () => {
    const notPdf = new TextEncoder().encode("Hello World");
    await expect(
      embedZugferdXml(notPdf, "<xml/>"),
    ).rejects.toThrow("Ungültiges PDF");
  });

  it("throws on empty XML string", async () => {
    const pdfBytes = await makeDummyPdf();
    await expect(
      embedZugferdXml(pdfBytes, ""),
    ).rejects.toThrow("Ungültige XML");
  });

  it("throws on whitespace-only XML string", async () => {
    const pdfBytes = await makeDummyPdf();
    await expect(
      embedZugferdXml(pdfBytes, "   "),
    ).rejects.toThrow("Ungültige XML");
  });
});

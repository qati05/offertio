import { createElement } from "react";
import { describe, it, expect } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import OffertePDF from "@/components/OffertePDF";
import { generateQrBillData } from "@/lib/qr-bill";
import { parseQrSvg } from "@/components/pdf/QrCodeSvg";
import type { Profile } from "@/lib/types";

// The QR code has to be IN the PDF, not just in the SVG the library hands back.
//
// qr-payload-conformance.test.ts decodes that SVG, and it passes — but all five
// templates passed the SVG to react-pdf's <Image>, which only reads PNG and
// JPEG, so the finished invoice carried an empty square where the code belongs.
// Nothing noticed because nothing opened the PDF. This does: it reads the page's
// drawing commands back out of the file and counts the rectangles.

const TEMPLATES = ["classic", "modern", "minimal", "professionell", "farbig"] as const;

const profil = {
  id: "u1", email: "a@b.ch", firmenname: "Muster Reinigung GmbH", vorname: "Max", nachname: "Muster",
  adresse: "Bahnhofstrasse 12", plz: "8001", ort: "Zürich", telefon: "+41 79 123 45 67", land: "CH",
  sprache: "de", uid_mwst: "CHE-123.456.789 MWST", zahlungsfrist: 30, logo_url: "",
} as unknown as Profile;

const IBAN = "CH5604835012345678009";
const QR_IBAN = "CH4431999123000889012";

async function renderInvoice(template: (typeof TEMPLATES)[number], iban: string, withQr: boolean, svgOverride?: string) {
  const p = { ...profil, iban } as Profile;
  const qr = withQr ? await generateQrBillData(p, 1050.19, "RE-2026-0001") : null;
  const element = createElement(OffertePDF as any, {
    profil: p, template,
    kunde: { name: "Hans Keller", firma: "Keller AG", adresse: "Marktgasse 1", adresse2: "", plz: "3011", ort: "Bern", email: "k@example.ch" },
    positionen: [{ bezeichnung: "Unterhaltsreinigung", einheit: "Std.", menge: 12, preis: 58 }],
    nummer: "RE-2026-0001", datum: "2026-10-04", leistungsdatum: "2026-10-01", gueltigBis: "", mwstSatz: 8.1, notiz: "",
    dokumentTyp: "rechnung", currency: "CHF", preisMode: "exkl",
    qrCodeDataUrl: svgOverride ?? qr?.dataUrl ?? null, qrReference: qr?.qrReference ?? null,
  });
  const stream = await pdf(element as any).toBuffer();
  const chunks: Buffer[] = [];
  for await (const c of stream as any) chunks.push(Buffer.from(c));
  return { bytes: Buffer.concat(chunks), svg: qr?.dataUrl ?? null };
}

/**
 * Number of filled shapes on the first page.
 *
 * react-pdf writes an SVG <rect> as a path (`m l l l l f`), not as a `re`
 * operator — counting `re` finds one in a page that carries the whole code, which
 * is how this helper was first written wrong. Every module is a filled path, so
 * the number of `f` operators is what grows when the code is on the page.
 */
async function filledShapes(bytes: Buffer): Promise<number> {
  const doc = await PDFDocument.load(new Uint8Array(bytes));
  const contents = doc.getPage(0).node.Contents();
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => doc.context.lookup(ref))
    : [contents];
  let text = "";
  for (const s of streams) {
    if (s instanceof PDFRawStream) text += Buffer.from(decodePDFRawStream(s).decode()).toString("latin1");
  }
  return (text.match(/^f$/gm) ?? []).length;
}

describe("the Swiss QR code is drawn into the PDF", () => {
  for (const template of TEMPLATES) {
    for (const [label, iban] of [["IBAN", IBAN], ["QR-IBAN", QR_IBAN]] as const) {
      it(`${template} · ${label}: every module of the code is on the page`, async () => {
        const { bytes, svg } = await renderInvoice(template, iban, true);
        const expected = parseQrSvg(svg!).rects.length;
        expect(expected).toBeGreaterThan(1000);
        // Measured across all five templates: the count equals the SVG's rectangles
        // plus a handful of shapes the template draws itself (1691 for 1690, never
        // below). A page without the code has exactly 1.
        expect(await filledShapes(bytes)).toBeGreaterThanOrEqual(expected);
      });
    }
  }

  it("control: an invoice without a QR code has nowhere near that many rectangles", async () => {
    // Without this the count above would pass for any page that happens to be busy.
    const { bytes } = await renderInvoice("classic", IBAN, false);
    expect(await filledShapes(bytes)).toBeLessThan(100);
  });
});

describe("a QR code that cannot be drawn stops the PDF instead of being left out", () => {
  it("rejects when the SVG is not usable", async () => {
    const broken = "data:image/svg+xml;base64," + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64");
    // react-pdf re-wraps an error thrown while rendering a component, so the
    // message is not ours ("Cannot read properties of null"). What matters is
    // that producing the PDF fails at all, rather than yielding a payment part
    // with an empty square.
    await expect(renderInvoice("classic", IBAN, true, broken)).rejects.toThrow();
  });

  it("rejects something that is not an SVG at all", () => {
    expect(() => parseQrSvg("data:image/png;base64,AAAA")).toThrow(/SVG data URL/);
  });
});

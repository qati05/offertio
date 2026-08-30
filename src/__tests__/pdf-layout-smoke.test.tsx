/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import OffertePDF from "@/components/OffertePDF";
import PDFMinimal from "@/components/pdf/PDFMinimal";
import PDFModern from "@/components/pdf/PDFModern";
import PDFProfessionell from "@/components/pdf/PDFProfessionell";
import PDFFarbig from "@/components/pdf/PDFFarbig";
import { QR_BILL_PT } from "@/lib/qr-bill-layout";
import type { Profile } from "@/lib/types";

/**
 * The payment strip grew from 105 pt to 297.64 pt — nearly a third of an A4
 * page. That is the correct height, but it takes the room away from the item
 * table, and nobody had looked at a resulting document.
 *
 * These render real PDFs through @react-pdf/renderer and read the output back
 * with pdf-lib. They cannot tell whether the result looks good — only a person
 * can — but they can catch the failures that would be obvious on paper: a
 * document that no longer renders, a page that is not A4, or a long invoice
 * that silently loses its content.
 */

const TEMPLATES = [
  ["OffertePDF", OffertePDF],
  ["PDFMinimal", PDFMinimal],
  ["PDFModern", PDFModern],
  ["PDFProfessionell", PDFProfessionell],
  ["PDFFarbig", PDFFarbig],
] as const;

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

const profil: Profile = {
  id: "u1", email: "info@reinigung.ch", firmenname: "Muster Reinigung GmbH",
  vorname: "Anna", nachname: "Muster", adresse: "Bahnhofstrasse 12", plz: "8001",
  ort: "Zürich", telefon: "+41 44 111 22 33", iban: "CH5604835012345678009",
  uid_mwst: "CHE-123.456.789 MWST", steuernummer: "", logo_url: "", land: "CH",
  sprache: "de", beruf: "Reinigung", zahlungsfrist: 30, plan: "pro_monthly",
  created_at: new Date().toISOString(),
};

function props(positionCount: number) {
  return {
    profil,
    kunde: {
      name: "Immobilienverwaltung Seefeld und Umgebung AG",
      firma: "Immobilienverwaltung Seefeld und Umgebung AG",
      adresse: "Seefeldstrasse 200", adresse2: "", plz: "8008", ort: "Zürich",
      email: "buchhaltung@seefeld.example", uid_mwst: "",
    },
    positionen: Array.from({ length: positionCount }, (_, i) => ({
      bezeichnung: `Unterhaltsreinigung Treppenhaus und Nebenräume, Position ${i + 1}`,
      einheit: "Std", menge: 4.5, preis: 62.5,
    })),
    nummer: "RE-2026-0042", datum: "2026-08-30", gueltigBis: "2026-09-30",
    leistungsdatum: "2026-08-29", mwstSatz: 8.1, notiz: "",
    dokumentTyp: "rechnung" as const, currency: "CHF", preisMode: "exkl" as const,
    qrCodeDataUrl: undefined,
  };
}

async function render(Template: unknown, positionCount: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(Template as any, props(positionCount) as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await pdf(element as any).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of buffer as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
  return PDFDocument.load(Buffer.concat(chunks));
}

describe.each(TEMPLATES)("%s renders on A4 with the taller payment strip", (_name, Template) => {
  it("produces an A4 page for a short invoice", async () => {
    const doc = await render(Template, 3);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(A4_WIDTH_PT, 0);
    expect(height).toBeCloseTo(A4_HEIGHT_PT, 0);
  }, 30_000);

  it("still renders a long invoice that has to break across pages", async () => {
    // 25 positions cannot fit above a 297 pt strip on one page. The document
    // must paginate rather than silently drop rows or fail to render.
    const doc = await render(Template, 25);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  }, 30_000);
});

describe("the strip leaves usable room on the page", () => {
  it("takes less than half of A4", () => {
    // 105 mm of 297 mm. If a future change pushed this past half the page the
    // item table would have less space than the payment slip.
    expect(QR_BILL_PT.stripHeight).toBeLessThan(A4_HEIGHT_PT / 2);
    expect(QR_BILL_PT.stripHeight / A4_HEIGHT_PT).toBeCloseTo(0.354, 2);
  });
});

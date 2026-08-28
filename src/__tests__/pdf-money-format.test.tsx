/** @vitest-environment node */

import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import OffertePDF from "@/components/OffertePDF";
import PDFMinimal from "@/components/pdf/PDFMinimal";
import PDFModern from "@/components/pdf/PDFModern";
import PDFProfessionell from "@/components/pdf/PDFProfessionell";
import PDFFarbig from "@/components/pdf/PDFFarbig";
import type { Land, Profile } from "@/lib/types";

/**
 * Amounts must be written the way the recipient's country writes them, in every
 * layout. A German customer reading "1'234.56" sees a Swiss document — that
 * grouping is not used in Germany at all.
 */

const TEMPLATES = [
  ["OffertePDF", OffertePDF],
  ["PDFMinimal", PDFMinimal],
  ["PDFModern", PDFModern],
  ["PDFProfessionell", PDFProfessionell],
  ["PDFFarbig", PDFFarbig],
] as const;

function profile(land: Land): Profile {
  return {
    id: "user-1",
    email: "info@example.com",
    firmenname: "Muster AG",
    vorname: "Max",
    nachname: "Muster",
    adresse: "Hauptstrasse 1",
    plz: land === "CH" ? "8000" : "10115",
    ort: land === "CH" ? "Zürich" : "Berlin",
    telefon: "+41 79 123 45 67",
    iban: land === "CH" ? "CH9300762011623852957" : "DE02120300000000202051",
    uid_mwst: land === "CH" ? "CHE-123.456.789 MWST" : "DE123456789",
    logo_url: "",
    land,
    sprache: "de",
    beruf: "Reinigung",
    zahlungsfrist: 30,
    plan: "pro_monthly",
    created_at: new Date().toISOString(),
  };
}

function props(land: Land) {
  return {
    profil: profile(land),
    kunde: {
      name: "Kunde AG",
      firma: "Kunde AG",
      adresse: "Weg 2",
      adresse2: "",
      plz: "80331",
      ort: "München",
      email: "kunde@example.com",
    },
    // 1 x 1234.50 -> a four-digit amount, so grouping is actually exercised.
    positionen: [{ bezeichnung: "Unterhaltsreinigung", einheit: "pauschal", menge: 1, preis: 1234.5 }],
    nummer: "R-2026-200",
    datum: "2026-03-01",
    gueltigBis: "2026-03-31",
    leistungsdatum: "2026-02-28",
    mwstSatz: 0,
    notiz: "",
    dokumentTyp: "rechnung" as const,
    currency: land === "CH" ? "CHF" : "EUR",
    preisMode: "exkl" as const,
  };
}

function collectText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const element = node as { props?: { children?: ReactNode } };
  return element.props ? collectText(element.props.children) : "";
}

function render(Template: unknown, land: Land): string {
  return collectText((Template as (x: unknown) => ReactNode)(props(land)));
}

describe.each(TEMPLATES)("%s · amount formatting", (_name, Template) => {
  it("writes German invoices as 1.234,50", () => {
    const text = render(Template, "DE");
    expect(text).toContain("1.234,50");
    expect(text).not.toContain("1'234.50");
  });

  it("writes Austrian invoices as 1.234,50 without a non-breaking space", () => {
    const text = render(Template, "AT");
    expect(text).toContain("1.234,50");
    // ICU's de-AT would group with U+00A0, which is invisible in review and
    // fragile in a PDF.
    expect(text).not.toContain("1 234,50");
  });

  it("leaves Swiss invoices as 1'234.50", () => {
    const text = render(Template, "CH");
    expect(text).toContain("1'234.50");
    expect(text).not.toContain("1.234,50");
  });
});

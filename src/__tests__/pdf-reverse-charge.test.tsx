/** @vitest-environment node */

import { describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { pdf } from "@react-pdf/renderer";
import OffertePDF from "@/components/OffertePDF";
import PDFMinimal from "@/components/pdf/PDFMinimal";
import PDFModern from "@/components/pdf/PDFModern";
import PDFProfessionell from "@/components/pdf/PDFProfessionell";
import PDFFarbig from "@/components/pdf/PDFFarbig";
import type { Profile } from "@/lib/types";

/**
 * A reverse-charge invoice must never print a VAT line, and must print the
 * §14a Abs. 5 UStG notice. Offertio has five PDF layouts, so this is checked
 * for every one of them — a document that renders correctly in one layout and
 * charges VAT in another is exactly the kind of defect that only shows up at a
 * customer.
 *
 * The assertion walks the component's returned element tree rather than
 * parsing a rendered PDF, which would need an extra dependency for no extra
 * confidence: the text either is in the tree or it is not.
 */

const TEMPLATES = [
  ["OffertePDF", OffertePDF],
  ["PDFMinimal", PDFMinimal],
  ["PDFModern", PDFModern],
  ["PDFProfessionell", PDFProfessionell],
  ["PDFFarbig", PDFFarbig],
] as const;

const profil: Profile = {
  id: "user-1",
  email: "bau@example.de",
  firmenname: "Bau GmbH",
  vorname: "Max",
  nachname: "Muster",
  adresse: "Hauptstrasse 1",
  plz: "10115",
  ort: "Berlin",
  telefon: "+49 30 1234567",
  iban: "DE02120300000000202051",
  uid_mwst: "DE123456789",
  steuernummer: "13/123/12345",
  logo_url: "",
  land: "DE",
  sprache: "de",
  beruf: "Handwerk / Bau",
  zahlungsfrist: 30,
  plan: "pro_monthly",
  created_at: new Date().toISOString(),
};

function props(overrides: Record<string, unknown> = {}) {
  return {
    profil,
    kunde: {
      name: "General Bau AG",
      firma: "General Bau AG",
      adresse: "Weg 2",
      adresse2: "",
      plz: "80331",
      ort: "München",
      email: "kunde@example.de",
      uid_mwst: "DE987654321",
    },
    positionen: [{ bezeichnung: "Trockenbau", einheit: "pauschal", menge: 1, preis: 4000 }],
    nummer: "R-2026-013",
    datum: "2026-03-01",
    gueltigBis: "2026-03-31",
    leistungsdatum: "2026-02-28",
    mwstSatz: 19,
    notiz: "",
    dokumentTyp: "rechnung" as const,
    currency: "EUR",
    preisMode: "exkl" as const,
    ...overrides,
  };
}

/** Every string that appears anywhere in the rendered element tree. */
function collectText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const element = node as { props?: { children?: ReactNode } };
  return element.props ? collectText(element.props.children) : "";
}

function renderText(Template: (p: never) => ReactNode, p: Record<string, unknown>): string {
  return collectText((Template as (x: unknown) => ReactNode)(p));
}

describe.each(TEMPLATES)("%s · §13b reverse charge", (_name, Template) => {
  const p = props({ steuerfall: "reverse_charge_13b_4" });

  it("prints the notice §14a Abs. 5 UStG requires", () => {
    expect(renderText(Template as never, p)).toContain(
      "Steuerschuldnerschaft des Leistungsempfängers",
    );
  });

  it("prints no VAT line", () => {
    const text = renderText(Template as never, p);
    // 19% was passed in deliberately: showing it anyway would make the issuer
    // liable for that VAT under §14c UStG.
    expect(text).not.toContain("19%");
    expect(text).not.toContain("(19");
  });

  it("charges the net amount as the total, in German format", () => {
    // A German invoice must not print Swiss grouping (4'000.00).
    const text = renderText(Template as never, p);
    expect(text).toContain("4.000,00");
    expect(text).not.toContain("4'000.00");
  });
});

describe.each(TEMPLATES)("%s · ordinary invoices are unaffected", (_name, Template) => {
  it("still shows the VAT rate", () => {
    const text = renderText(Template as never, props());
    expect(text).toContain("19");
    expect(text).not.toContain("Steuerschuldnerschaft");
  });

  it("still shows the Kleinunternehmer notice when applicable", () => {
    const text = renderText(
      Template as never,
      props({ profil: { ...profil, kleinunternehmer: true } }),
    );
    expect(text).toContain("19 UStG");
    expect(text).not.toContain("Steuerschuldnerschaft");
  });
});

describe("reverse-charge PDF renders end to end", () => {
  it("produces a PDF buffer without throwing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(OffertePDF as any, props({ steuerfall: "reverse_charge_13b_4" }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = pdf(element as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });
});

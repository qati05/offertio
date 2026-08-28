import { describe, it, expect } from "vitest";
import { buildZugferdXml } from "@/lib/zugferd-xml";
import type { OfferteData } from "@/lib/types";

const RAM =
  "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100";

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error(`XML parse error: ${err.textContent}`);
  return doc;
}
const tags = (scope: Element | Document, name: string): Element[] =>
  Array.from((scope as Element).getElementsByTagNameNS(RAM, name));
const one = (scope: Element | Document, name: string): Element | null =>
  tags(scope, name)[0] ?? null;
const text = (scope: Element | Document, name: string): string | null =>
  one(scope, name)?.textContent ?? null;
const num = (scope: Element | Document, name: string): number =>
  Number(text(scope, name));

const settlement = (doc: Document) =>
  one(doc, "ApplicableHeaderTradeSettlement")!;
const summation = (doc: Document) =>
  one(doc, "SpecifiedTradeSettlementHeaderMonetarySummation")!;
/** The BG-23 VAT breakdown lives directly under the header settlement. */
const headerTax = (doc: Document) =>
  Array.from(settlement(doc).children).filter(
    (el) => el.localName === "ApplicableTradeTax",
  );
const lineTaxes = (doc: Document) =>
  tags(doc, "SpecifiedLineTradeSettlement").map((el) => one(el, "ApplicableTradeTax")!);

const seller = {
  firmenname: "Bau GmbH",
  adresse: "Hauptstrasse 1",
  plz: "10115",
  ort: "Berlin",
  land: "DE",
  steuernummer: "13/123/12345",
  uid_mwst: "DE123456789",
  iban: "DE02120300000000202051",
  zahlungsfrist: 30,
};

function rcInvoice(overrides: Record<string, unknown> = {}): OfferteData {
  return {
    nummer: "R-2026-013",
    datum: "2026-03-01",
    // A reverse-charge invoice shows no VAT: the rate is 0 by law, not by choice.
    mwstSatz: 0,
    steuerfall: "reverse_charge_13b_4",
    profil: { ...seller },
    kunde: {
      name: "General Bau AG",
      adresse: "Weg 2",
      plz: "80331",
      ort: "München",
      uid_mwst: "DE987654321",
    },
    positionen: [
      { bezeichnung: "Trockenbau Obergeschoss", menge: 1, preis: 4000 },
      { bezeichnung: "Malerarbeiten", menge: 2, preis: 750 },
    ],
    ...overrides,
  } as unknown as OfferteData;
}

/**
 * EN 16931 rules for VAT category AE (reverse charge), from the official CEF
 * Schematron. The full-document check against the real validator lives in
 * en16931-schematron.test.ts; these assertions pin the individual mappings so a
 * failure says which BT went wrong, not just "invalid".
 *
 *   BR-AE-01  exactly one VAT breakdown entry with category AE
 *   BR-AE-02  seller VAT identifier required
 *   BR-AE-03  same for document-level allowances
 *   BR-AE-05  line VAT rate must be 0
 *   BR-AE-06  allowance VAT rate must be 0
 *   BR-AE-08  breakdown basis = AE lines − allowances + charges
 *   BR-AE-09  breakdown VAT amount must be 0
 *   BR-AE-10  exemption reason (text or code) required
 */
describe("ZUGFeRD · §13b reverse charge", () => {
  const xml = () => buildZugferdXml(rcInvoice(), "2026-02-28");

  it("marks every line as category AE at a zero rate (BR-AE-05)", () => {
    const doc = parse(xml());
    const taxes = lineTaxes(doc);
    expect(taxes).toHaveLength(2);
    for (const tax of taxes) {
      expect(text(tax, "CategoryCode")).toBe("AE");
      expect(num(tax, "RateApplicablePercent")).toBe(0);
    }
  });

  it("emits exactly one AE breakdown with zero tax (BR-AE-01, BR-AE-09)", () => {
    const doc = parse(xml());
    const breakdown = headerTax(doc);
    expect(breakdown).toHaveLength(1);
    expect(text(breakdown[0], "CategoryCode")).toBe("AE");
    expect(num(breakdown[0], "CalculatedAmount")).toBe(0);
    expect(num(breakdown[0], "RateApplicablePercent")).toBe(0);
  });

  it("states the exemption reason as text and as a VATEX code (BR-AE-10)", () => {
    const breakdown = headerTax(parse(xml()))[0];
    expect(text(breakdown, "ExemptionReason")).toContain(
      "Steuerschuldnerschaft des Leistungsempfängers",
    );
    expect(text(breakdown, "ExemptionReasonCode")).toBe("VATEX-EU-AE");
  });

  it("bases the breakdown on the full net amount (BR-AE-08)", () => {
    const doc = parse(xml());
    expect(num(headerTax(doc)[0], "BasisAmount")).toBe(5500);
    expect(num(summation(doc), "TaxBasisTotalAmount")).toBe(5500);
  });

  it("charges no VAT: total equals the net amount", () => {
    const sum = summation(parse(xml()));
    expect(num(sum, "LineTotalAmount")).toBe(5500);
    expect(num(sum, "TaxTotalAmount")).toBe(0);
    expect(num(sum, "GrandTotalAmount")).toBe(5500);
    expect(num(sum, "DuePayableAmount")).toBe(5500);
  });

  it("carries both VAT identifiers (BR-AE-02, buyer identification)", () => {
    const doc = parse(xml());
    const sellerVat = tags(one(doc, "SellerTradeParty")!, "SpecifiedTaxRegistration")
      .map((el) => one(el, "ID"))
      .find((el) => el?.getAttribute("schemeID") === "VA");
    const buyerVat = tags(one(doc, "BuyerTradeParty")!, "SpecifiedTaxRegistration")
      .map((el) => one(el, "ID"))
      .find((el) => el?.getAttribute("schemeID") === "VA");
    expect(sellerVat?.textContent).toBe("DE123456789");
    expect(buyerVat?.textContent).toBe("DE987654321");
  });

  it("never prints a VAT rate above zero even if one is passed in", () => {
    // Defence in depth: the UI locks the rate to 0, but a stale draft or a
    // direct API call must not be able to produce a reverse-charge invoice that
    // also shows 19% — that is a §14c UStG liability for the issuer.
    const doc = parse(buildZugferdXml(rcInvoice({ mwstSatz: 19 }), "2026-02-28"));
    expect(num(headerTax(doc)[0], "RateApplicablePercent")).toBe(0);
    expect(num(headerTax(doc)[0], "CalculatedAmount")).toBe(0);
    expect(num(summation(doc), "TaxTotalAmount")).toBe(0);
    expect(num(summation(doc), "GrandTotalAmount")).toBe(5500);
    for (const tax of lineTaxes(doc)) {
      expect(num(tax, "RateApplicablePercent")).toBe(0);
    }
  });
});

describe("ZUGFeRD · §13b reverse charge with a discount", () => {
  const xml = () =>
    buildZugferdXml(
      rcInvoice({ rabatt: { aktiv: true, modus: "prozent", wert: 10 } }),
      "2026-02-28",
    );

  it("taxes the allowance at category AE, rate 0 (BR-AE-03, BR-AE-06)", () => {
    const allowance = one(parse(xml()), "SpecifiedTradeAllowanceCharge")!;
    const catTax = one(allowance, "CategoryTradeTax")!;
    expect(text(catTax, "CategoryCode")).toBe("AE");
    expect(num(catTax, "RateApplicablePercent")).toBe(0);
  });

  it("keeps the totals consistent (BR-CO-10, BR-AE-08)", () => {
    const doc = parse(xml());
    const sum = summation(doc);
    expect(num(sum, "LineTotalAmount")).toBe(5500);
    expect(num(sum, "AllowanceTotalAmount")).toBe(550);
    expect(num(sum, "TaxBasisTotalAmount")).toBe(4950);
    expect(num(headerTax(doc)[0], "BasisAmount")).toBe(4950);
    expect(num(sum, "TaxTotalAmount")).toBe(0);
    expect(num(sum, "GrandTotalAmount")).toBe(4950);
  });
});

describe("ZUGFeRD · standard invoices are unaffected", () => {
  it("still uses category S at the given rate", () => {
    const doc = parse(
      buildZugferdXml(rcInvoice({ steuerfall: "standard", mwstSatz: 19 }), "2026-02-28"),
    );
    const breakdown = headerTax(doc)[0];
    expect(text(breakdown, "CategoryCode")).toBe("S");
    expect(num(breakdown, "RateApplicablePercent")).toBe(19);
    expect(num(summation(doc), "TaxTotalAmount")).toBe(1045);
    expect(one(breakdown, "ExemptionReasonCode")).toBeNull();
  });

  it("treats a missing steuerfall as standard", () => {
    const data = rcInvoice({ mwstSatz: 19 });
    delete (data as unknown as Record<string, unknown>).steuerfall;
    const breakdown = headerTax(parse(buildZugferdXml(data, "2026-02-28")))[0];
    expect(text(breakdown, "CategoryCode")).toBe("S");
  });
});

describe("ZUGFeRD · §13b Nr. 8 (Gebäudereinigung)", () => {
  const xml = () =>
    buildZugferdXml(rcInvoice({ steuerfall: "reverse_charge_13b_8" }), "2026-02-28");

  it("maps to category AE exactly like Nr. 4", () => {
    const doc = parse(xml());
    expect(text(headerTax(doc)[0], "CategoryCode")).toBe("AE");
    expect(num(headerTax(doc)[0], "CalculatedAmount")).toBe(0);
    expect(num(summation(doc), "GrandTotalAmount")).toBe(5500);
  });

  it("cites Nr. 8 in the exemption reason, not Nr. 4", () => {
    // A cleaning invoice quoting the construction paragraph is a wrong invoice.
    const breakdown = headerTax(parse(xml()))[0];
    expect(text(breakdown, "ExemptionReason")).toContain("Nr. 8");
    expect(text(breakdown, "ExemptionReason")).not.toContain("Nr. 4");
    expect(text(breakdown, "ExemptionReasonCode")).toBe("VATEX-EU-AE");
  });
});

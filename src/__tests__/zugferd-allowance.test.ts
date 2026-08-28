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

function tags(scope: Element | Document, name: string): Element[] {
  return Array.from(
    (scope as Element).getElementsByTagNameNS
      ? (scope as Element).getElementsByTagNameNS(RAM, name)
      : [],
  );
}

function one(scope: Element | Document, name: string): Element | null {
  return tags(scope, name)[0] ?? null;
}

function num(scope: Element | Document, name: string): number {
  const el = one(scope, name);
  if (!el) throw new Error(`missing <ram:${name}>`);
  return Number(el.textContent);
}

/** The BG-22 header summation block. */
function summation(doc: Document): Element {
  const el = one(doc, "SpecifiedTradeSettlementHeaderMonetarySummation");
  if (!el) throw new Error("missing header monetary summation");
  return el;
}

/** Every BT-131 line net amount, in document order. */
function lineNetAmounts(doc: Document): number[] {
  return tags(doc, "SpecifiedTradeSettlementLineMonetarySummation").map((el) =>
    num(el, "LineTotalAmount"),
  );
}

/** Document-level allowances (BG-20), excluding any charges. */
function allowances(doc: Document): Element[] {
  return tags(doc, "SpecifiedTradeAllowanceCharge").filter((el) => {
    const ind = one(el, "ChargeIndicator");
    return ind?.textContent?.trim() === "false";
  });
}

function baseData(overrides: Partial<OfferteData> = {}): OfferteData {
  return {
    nummer: "R-2026-001",
    datum: "2026-03-01",
    mwstSatz: 19,
    profil: {
      firmenname: "Bau GmbH",
      adresse: "Hauptstrasse 1",
      plz: "10115",
      ort: "Berlin",
      land: "DE",
      steuernummer: "13/123/12345",
      iban: "DE02120300000000202051",
      zahlungsfrist: 30,
    },
    kunde: {
      name: "Kunde AG",
      adresse: "Weg 2",
      plz: "80331",
      ort: "München",
    },
    positionen: [
      { bezeichnung: "Leistung A", menge: 1, preis: 1000 },
      { bezeichnung: "Leistung B", menge: 2, preis: 500 },
    ],
    ...overrides,
  } as OfferteData;
}

/**
 * EN 16931 totals rules that a document-level discount must not break.
 *
 *   BR-CO-10  BT-106 (LineTotalAmount)      = Σ BT-131 (line net amounts)
 *   BR-CO-11  BT-107 (AllowanceTotalAmount) = Σ BT-92  (allowance amounts)
 *   BR-CO-13  BT-109 (TaxBasisTotalAmount)  = BT-106 − BT-107 + BT-108
 *   BR-CO-15  BT-112 (GrandTotalAmount)     = BT-109 + BT-110
 *   BR-CO-16  BT-115 (DuePayableAmount)     = BT-112 − BT-113
 *
 * A discount belongs in BT-107 / BG-20, never silently subtracted from BT-106 —
 * that is what makes the sum of the printed line amounts disagree with the
 * header total and gets the invoice rejected by an EN 16931 validator.
 */
function assertTotalsAreConsistent(xml: string) {
  const doc = parse(xml);
  const sum = summation(doc);

  const bt106 = num(sum, "LineTotalAmount");
  const bt107 = one(sum, "AllowanceTotalAmount")
    ? num(sum, "AllowanceTotalAmount")
    : 0;
  const bt108 = one(sum, "ChargeTotalAmount") ? num(sum, "ChargeTotalAmount") : 0;
  const bt109 = num(sum, "TaxBasisTotalAmount");
  const bt110 = num(sum, "TaxTotalAmount");
  const bt112 = num(sum, "GrandTotalAmount");
  const bt115 = num(sum, "DuePayableAmount");

  const lineSum = Number(
    lineNetAmounts(doc)
      .reduce((a, b) => a + b, 0)
      .toFixed(2),
  );
  const allowanceSum = Number(
    allowances(doc)
      .reduce((acc, el) => acc + num(el, "ActualAmount"), 0)
      .toFixed(2),
  );

  expect(bt106, "BR-CO-10: BT-106 must equal the sum of line net amounts").toBe(lineSum);
  expect(bt107, "BR-CO-11: BT-107 must equal the sum of allowance amounts").toBe(allowanceSum);
  expect(bt109, "BR-CO-13: BT-109 = BT-106 − BT-107 + BT-108").toBe(
    Number((bt106 - bt107 + bt108).toFixed(2)),
  );
  expect(bt112, "BR-CO-15: BT-112 = BT-109 + BT-110").toBe(
    Number((bt109 + bt110).toFixed(2)),
  );
  expect(bt115, "BR-CO-16: BT-115 = BT-112 (nothing prepaid)").toBe(bt112);

  // Every monetary value must be printed with exactly two decimals.
  for (const name of [
    "LineTotalAmount",
    "TaxBasisTotalAmount",
    "TaxTotalAmount",
    "GrandTotalAmount",
    "DuePayableAmount",
  ]) {
    expect(one(sum, name)!.textContent, `${name} must have 2 decimals`).toMatch(
      /^-?\d+\.\d{2}$/,
    );
  }
}

describe("ZUGFeRD · percentage discount keeps EN 16931 totals consistent", () => {
  const xml = () =>
    buildZugferdXml(
      baseData({ rabatt: { aktiv: true, modus: "prozent", wert: 10 } } as Partial<OfferteData>),
      "2026-02-28",
    );

  it("satisfies the BR-CO totals rules", () => {
    assertTotalsAreConsistent(xml());
  });

  it("keeps the line amounts undiscounted", () => {
    const doc = parse(xml());
    expect(lineNetAmounts(doc)).toEqual([1000, 1000]);
    expect(num(summation(doc), "LineTotalAmount")).toBe(2000);
  });

  it("reports the discount as a document-level allowance", () => {
    const doc = parse(xml());
    const list = allowances(doc);
    expect(list).toHaveLength(1);
    expect(num(list[0], "ActualAmount")).toBe(200);
    expect(num(summation(doc), "AllowanceTotalAmount")).toBe(200);
  });

  it("taxes the discounted basis, not the gross total", () => {
    const sum = summation(parse(xml()));
    expect(num(sum, "TaxBasisTotalAmount")).toBe(1800);
    expect(num(sum, "TaxTotalAmount")).toBe(342);
    expect(num(sum, "GrandTotalAmount")).toBe(2142);
  });

  it("gives the allowance a reason and a VAT category (BR-31 / BT-95..98)", () => {
    const allowance = allowances(parse(xml()))[0];
    expect(one(allowance, "Reason")?.textContent).toBeTruthy();
    const catTax = one(allowance, "CategoryTradeTax")!;
    expect(one(catTax, "TypeCode")?.textContent).toBe("VAT");
    expect(one(catTax, "CategoryCode")?.textContent).toBe("S");
    expect(Number(one(catTax, "RateApplicablePercent")?.textContent)).toBe(19);
  });
});

describe("ZUGFeRD · fixed-amount discount keeps EN 16931 totals consistent", () => {
  const xml = () =>
    buildZugferdXml(
      baseData({ rabatt: { aktiv: true, modus: "chf", wert: 250 } } as Partial<OfferteData>),
      "2026-02-28",
    );

  it("satisfies the BR-CO totals rules", () => {
    assertTotalsAreConsistent(xml());
  });

  it("carries the fixed amount as the allowance", () => {
    const doc = parse(xml());
    expect(num(allowances(doc)[0], "ActualAmount")).toBe(250);
    expect(num(summation(doc), "TaxBasisTotalAmount")).toBe(1750);
  });
});

describe("ZUGFeRD · no discount is unchanged", () => {
  it("satisfies the BR-CO totals rules", () => {
    assertTotalsAreConsistent(buildZugferdXml(baseData(), "2026-02-28"));
  });

  it("emits no allowance block at all", () => {
    const doc = parse(buildZugferdXml(baseData(), "2026-02-28"));
    expect(allowances(doc)).toHaveLength(0);
    expect(one(summation(doc), "AllowanceTotalAmount")).toBeNull();
    expect(num(summation(doc), "LineTotalAmount")).toBe(2000);
    expect(num(summation(doc), "GrandTotalAmount")).toBe(2380);
  });

  it("is unaffected by an inactive discount", () => {
    const xml = buildZugferdXml(
      baseData({ rabatt: { aktiv: false, modus: "prozent", wert: 10 } } as Partial<OfferteData>),
      "2026-02-28",
    );
    assertTotalsAreConsistent(xml);
    expect(allowances(parse(xml))).toHaveLength(0);
  });
});

describe("ZUGFeRD · discount under a zero-rate / exempt category", () => {
  it("stays consistent for a Kleinunternehmer invoice", () => {
    const data = baseData({
      mwstSatz: 0,
      rabatt: { aktiv: true, modus: "prozent", wert: 10 },
    } as Partial<OfferteData>);
    (data.profil as unknown as { kleinunternehmer: boolean }).kleinunternehmer = true;

    const xml = buildZugferdXml(data, "2026-02-28");
    assertTotalsAreConsistent(xml);

    const doc = parse(xml);
    const catTax = one(allowances(doc)[0], "CategoryTradeTax")!;
    expect(one(catTax, "CategoryCode")?.textContent).toBe("E");
    expect(num(summation(doc), "TaxTotalAmount")).toBe(0);
    expect(num(summation(doc), "GrandTotalAmount")).toBe(1800);
  });
});

describe("ZUGFeRD · rounding stays exact", () => {
  it("keeps totals consistent for amounts that do not divide evenly", () => {
    const xml = buildZugferdXml(
      baseData({
        positionen: [
          { bezeichnung: "A", menge: 3, preis: 33.33 },
          { bezeichnung: "B", menge: 7, preis: 1.11 },
        ],
        rabatt: { aktiv: true, modus: "prozent", wert: 7.5 },
      } as Partial<OfferteData>),
      "2026-02-28",
    );
    assertTotalsAreConsistent(xml);
  });
});

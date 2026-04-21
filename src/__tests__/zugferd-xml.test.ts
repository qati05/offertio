import { describe, it, expect } from "vitest";
import { buildZugferdXml } from "@/lib/zugferd-xml";
import type { OfferteData } from "@/lib/types";

const baseData: OfferteData = {
  nummer: "RE-2024-001",
  datum: "2024-03-15",
  kunde: {
    name: "Max Mustermann",
    firma: "Musterfirma GmbH",
    adresse: "Musterstraße 1",
    adresse2: "",
    plz: "10115",
    ort: "Berlin",
    email: "max@musterfirma.de",
  },
  positionen: [
    { bezeichnung: "Webentwicklung", einheit: "Std", menge: 10, preis: 100 },
    { bezeichnung: "Beratung", einheit: "Std", menge: 5, preis: 150 },
  ],
  mwstSatz: 19,
  notiz: "Vielen Dank für Ihren Auftrag.",
  profil: {
    id: "user-1",
    email: "test@example.de",
    firmenname: "Test GmbH",
    vorname: "Hans",
    nachname: "Müller",
    adresse: "Hauptstraße 10",
    plz: "80331",
    ort: "München",
    telefon: "089-12345678",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    uid_mwst: "DE123456789",
    steuernummer: "143/234/50515",
    logo_url: "",
    land: "DE",
    sprache: "de",
    beruf: "Webentwickler",
    zahlungsfrist: 14,
    plan: "pro_monthly",
    created_at: "2024-01-01T00:00:00Z",
  },
};

describe("buildZugferdXml", () => {
  it("returns a string", () => {
    const xml = buildZugferdXml(baseData);
    expect(typeof xml).toBe("string");
  });

  it("starts with XML declaration", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"/);
  });

  it("contains CrossIndustryInvoice root element", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("rsm:CrossIndustryInvoice");
  });

  it("contains CII namespaces", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain(
      "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
    );
    expect(xml).toContain(
      "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
    );
    expect(xml).toContain(
      "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
    );
  });

  it("contains ZUGFeRD BASIC guideline ID", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain(
      "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic",
    );
  });

  it("contains invoice number (BT-1)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("RE-2024-001");
  });

  it("contains invoice type code 380", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
  });

  it("formats invoice date as YYYYMMDD (BT-2)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("20240315");
  });

  it("uses leistungsdatum when provided (BT-72)", () => {
    const xml = buildZugferdXml(baseData, "2024-03-20");
    expect(xml).toContain("20240320");
  });

  it("falls back to datum when leistungsdatum is not provided", () => {
    const xml = buildZugferdXml(baseData);
    // datum = 2024-03-15 → 20240315 should appear for delivery
    expect(xml).toContain("ActualDeliverySupplyChainEvent");
    expect(xml).toContain("20240315");
  });

  it("contains seller name (BT-27)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("Test GmbH");
  });

  it("contains seller Steuernummer with schemeID FC (BT-32)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain('schemeID="FC"');
    expect(xml).toContain("143/234/50515");
  });

  it("contains seller VAT ID with schemeID VA (BT-31)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain('schemeID="VA"');
    expect(xml).toContain("DE123456789");
  });

  it("contains seller IBAN (BT-84)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("DE89370400440532013000");
  });

  it("contains seller BIC (BT-86)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("COBADEFFXXX");
  });

  it("contains buyer name (BT-44)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("Musterfirma GmbH");
  });

  it("falls back to kunde.name when firma is empty", () => {
    const dataNoFirma = {
      ...baseData,
      kunde: { ...baseData.kunde, firma: "" },
    };
    const xml = buildZugferdXml(dataNoFirma);
    expect(xml).toContain("Max Mustermann");
  });

  it("contains buyer VAT ID when provided (BT-48)", () => {
    const dataWithBuyerVat = {
      ...baseData,
      kunde: { ...baseData.kunde, uid_mwst: "DE987654321" },
    };
    const xml = buildZugferdXml(dataWithBuyerVat);
    expect(xml).toContain("DE987654321");
  });

  it("does not contain buyer VAT ID when not provided", () => {
    const dataWithoutBuyerVat = {
      ...baseData,
      kunde: { ...baseData.kunde, uid_mwst: undefined },
    };
    // The buyer tax registration block should be absent
    const xml = buildZugferdXml(dataWithoutBuyerVat);
    // Only seller schemeID="VA" should appear (not an extra buyer one)
    const vaMatches = (xml.match(/schemeID="VA"/g) ?? []).length;
    expect(vaMatches).toBe(1); // only seller VAT
  });

  it("contains all line items (BG-25)", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("Webentwicklung");
    expect(xml).toContain("Beratung");
  });

  it("contains correct line totals", () => {
    // line 1: 10 * 100 = 1000.00, line 2: 5 * 150 = 750.00
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("1000.00");
    expect(xml).toContain("750.00");
  });

  it("contains correct monetary summary (BG-22)", () => {
    // lineTotalAmount = 1750.00, tax = 1750 * 0.19 = 332.50, grand = 2082.50
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("1750.00");
    expect(xml).toContain("332.50");
    expect(xml).toContain("2082.50");
  });

  it("contains EUR currency code", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("EUR");
  });

  it("uses VAT category S for standard rate", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("<ram:CategoryCode>S</ram:CategoryCode>");
  });

  it("uses VAT category Z for zero rate", () => {
    const zeroRateData = { ...baseData, mwstSatz: 0 };
    const xml = buildZugferdXml(zeroRateData);
    expect(xml).toContain("<ram:CategoryCode>Z</ram:CategoryCode>");
  });

  it("uses VAT category E and emits ExemptionReason for Kleinunternehmer §19 UStG (EN 16931 BT-120)", () => {
    const kleinunternehmerData: OfferteData = {
      ...baseData,
      mwstSatz: 0,
      profil: { ...baseData.profil, kleinunternehmer: true },
    };
    const xml = buildZugferdXml(kleinunternehmerData);
    // Line-level tax
    expect(xml).toContain("<ram:CategoryCode>E</ram:CategoryCode>");
    // Human-readable exemption reason must be present on both line and header levels
    expect(xml).toContain("<ram:ExemptionReason>Steuerbefreit nach §19 UStG (Kleinunternehmer)</ram:ExemptionReason>");
    // There are 3 line items + 1 header breakdown in baseData → 3 occurrences expected
    const occurrences = xml.match(/<ram:ExemptionReason>/g)?.length ?? 0;
    expect(occurrences).toBe(baseData.positionen.length + 1);
  });

  it("does NOT emit ExemptionReason for standard-rated invoices", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).not.toContain("<ram:ExemptionReason>");
  });

  it("emits ExemptionReason for zero-rated non-Kleinunternehmer invoices", () => {
    const zeroRateData = { ...baseData, mwstSatz: 0 };
    const xml = buildZugferdXml(zeroRateData);
    expect(xml).toContain("<ram:ExemptionReason>Nullsatz</ram:ExemptionReason>");
  });

  it("computes dueDate via local-time arithmetic (no TZ drift across month boundary)", () => {
    // datum 2026-03-30 + 2 day Zahlungsfrist = 2026-04-01 (not 2026-03-31 in UTC-)
    const drift = {
      ...baseData,
      datum: "2026-03-30",
      profil: { ...baseData.profil, zahlungsfrist: 2 },
    };
    const xml = buildZugferdXml(drift);
    expect(xml).toContain("<udt:DateTimeString format=\"102\">20260401</udt:DateTimeString>");
  });

  it("contains SEPA payment type code 58", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("<ram:TypeCode>58</ram:TypeCode>");
  });

  it("skips payment means when IBAN is empty", () => {
    const dataNoIban = {
      ...baseData,
      profil: { ...baseData.profil, iban: "" },
    };
    const xml = buildZugferdXml(dataNoIban);
    expect(xml).not.toContain("SpecifiedTradeSettlementPaymentMeans");
  });

  it("contains country code DE for seller", () => {
    const xml = buildZugferdXml(baseData);
    expect(xml).toContain("<ram:CountryID>DE</ram:CountryID>");
  });
});

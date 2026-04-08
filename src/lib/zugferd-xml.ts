/**
 * ZUGFeRD 2.3.2 BASIC CII-XML Generator
 *
 * Produces a valid Factur-X / ZUGFeRD 2.3.2 BASIC XML string
 * conforming to EN 16931 (Cross Industry Invoice, CII).
 *
 * Only relevant for: land === "DE" && dokumentTyp === "rechnung"
 */

import { create } from "xmlbuilder2";
import type { OfferteData } from "./types";

/** Format a YYYY-MM-DD string to YYYYMMDD for CII date fields */
function toCiiDate(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

/** Round to 2 decimal places and return as string */
function money(value: number): string {
  return value.toFixed(2);
}

/**
 * Build a ZUGFeRD 2.3.2 BASIC CII-XML string from OfferteData.
 *
 * @param data           The invoice data (OfferteData)
 * @param leistungsdatum ISO date string for the delivery/service date (BT-72).
 *                       Falls back to data.datum if omitted.
 */
export function buildZugferdXml(data: OfferteData, leistungsdatum?: string): string {
  const { profil, kunde, positionen, mwstSatz, nummer, datum, rabatt } = data;

  // ── Monetary totals ──────────────────────────────────────────────────────
  const grossLineTotal = positionen.reduce((sum, p) => sum + p.menge * p.preis, 0);

  // Apply discount so the XML totals match the PDF exactly.
  const rabattBetrag = rabatt?.aktiv
    ? rabatt.modus === "chf"
      ? rabatt.wert
      : grossLineTotal * (rabatt.wert / 100)
    : 0;

  const lineTotal = grossLineTotal - rabattBetrag;
  const taxBasis = lineTotal;
  const taxAmount = taxBasis * (mwstSatz / 100);
  const grandTotal = taxBasis + taxAmount;

  const deliveryDate = leistungsdatum ?? datum;
  const buyerName = (kunde.firma?.trim() || kunde.name) ?? "";

  // ── Payment due date (BT-9) ──────────────────────────────────────────────
  // Derived from invoice date + payment terms days (profil.zahlungsfrist, default 30)
  const zahlungsfristTage = profil.zahlungsfrist ?? 30;
  const dueDateObj = new Date(datum);
  dueDateObj.setDate(dueDateObj.getDate() + zahlungsfristTage);
  const dueDate = dueDateObj.toISOString().split("T")[0];

  // ── Country codes ────────────────────────────────────────────────────────
  // Seller country always matches the profile land (DE for ZUGFeRD invoices)
  const sellerCountryID = profil.land ?? "DE";
  // Buyer country: KundenInfo does not carry a country field — default to seller country
  // as the vast majority of DACH B2B transactions are domestic. Add a buyerLand field
  // to KundenInfo in a future migration if cross-border support is needed.
  const buyerCountryID = sellerCountryID;

  // ── XML document ─────────────────────────────────────────────────────────
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele(
    "rsm:CrossIndustryInvoice",
    {
      "xmlns:rsm": "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
      "xmlns:ram": "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
      "xmlns:udt": "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
    },
  );

  // ── ExchangedDocumentContext ─────────────────────────────────────────────
  root
    .ele("rsm:ExchangedDocumentContext")
    .ele("ram:GuidelineSpecifiedDocumentContextParameter")
    .ele("ram:ID")
    .txt("urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic");

  // ── ExchangedDocument ────────────────────────────────────────────────────
  const doc = root.ele("rsm:ExchangedDocument");
  doc.ele("ram:ID").txt(nummer);
  doc.ele("ram:TypeCode").txt("380"); // 380 = commercial invoice
  doc
    .ele("ram:IssueDateTime")
    .ele("udt:DateTimeString", { format: "102" })
    .txt(toCiiDate(datum));

  // ── SupplyChainTradeTransaction ──────────────────────────────────────────
  const tx = root.ele("rsm:SupplyChainTradeTransaction");

  // ── Line items (BG-25) ───────────────────────────────────────────────────
  positionen.forEach((pos, index) => {
    const lineNetAmount = pos.menge * pos.preis;
    const line = tx.ele("ram:IncludedSupplyChainTradeLineItem");

    line
      .ele("ram:AssociatedDocumentLineDocument")
      .ele("ram:LineID")
      .txt(String(index + 1));

    line.ele("ram:SpecifiedTradeProduct").ele("ram:Name").txt(pos.bezeichnung);

    line
      .ele("ram:SpecifiedLineTradeAgreement")
      .ele("ram:NetPriceProductTradePrice")
      .ele("ram:ChargeAmount")
      .txt(money(pos.preis));

    line
      .ele("ram:SpecifiedLineTradeDelivery")
      .ele("ram:BilledQuantity", { unitCode: "C62" }) // C62 = unit/piece
      .txt(String(pos.menge));

    const lineSettlement = line.ele("ram:SpecifiedLineTradeSettlement");
    const lineTax = lineSettlement.ele("ram:ApplicableTradeTax");
    lineTax.ele("ram:TypeCode").txt("VAT");
    // "E" = exempt (§19 UStG Kleinunternehmer, no right of input deduction for buyer)
    // "Z" = zero-rated (taxable but at 0%, e.g. exports)
    // "S" = standard-rated
    lineTax.ele("ram:CategoryCode").txt(profil.kleinunternehmer ? "E" : mwstSatz === 0 ? "Z" : "S");
    lineTax.ele("ram:RateApplicablePercent").txt(String(mwstSatz));

    lineSettlement
      .ele("ram:SpecifiedTradeSettlementLineMonetarySummation")
      .ele("ram:LineTotalAmount")
      .txt(money(lineNetAmount));
  });

  // ── ApplicableHeaderTradeAgreement ───────────────────────────────────────
  const agreement = tx.ele("ram:ApplicableHeaderTradeAgreement");

  // Seller (BT-27, BT-31, BT-32, seller address)
  const seller = agreement.ele("ram:SellerTradeParty");
  seller.ele("ram:Name").txt(profil.firmenname);

  // Seller postal address (required in BASIC)
  const sellerAddr = seller.ele("ram:PostalTradeAddress");
  sellerAddr.ele("ram:PostcodeCode").txt(profil.plz);
  sellerAddr.ele("ram:LineOne").txt(profil.adresse);
  sellerAddr.ele("ram:CityName").txt(profil.ort);
  sellerAddr.ele("ram:CountryID").txt(sellerCountryID);

  // Seller Steuernummer (BT-32, schemeID FC)
  if (profil.steuernummer) {
    seller
      .ele("ram:SpecifiedTaxRegistration")
      .ele("ram:ID", { schemeID: "FC" })
      .txt(profil.steuernummer);
  }

  // Seller VAT ID / USt-IdNr. (BT-31, schemeID VA)
  const sellerVatId = profil.uid_mwst;
  if (sellerVatId) {
    seller
      .ele("ram:SpecifiedTaxRegistration")
      .ele("ram:ID", { schemeID: "VA" })
      .txt(sellerVatId);
  }

  // Buyer (BT-44, BT-48, buyer address)
  const buyer = agreement.ele("ram:BuyerTradeParty");
  buyer.ele("ram:Name").txt(buyerName);

  // Buyer postal address
  const buyerAddr = buyer.ele("ram:PostalTradeAddress");
  buyerAddr.ele("ram:PostcodeCode").txt(kunde.plz);
  buyerAddr.ele("ram:LineOne").txt(kunde.adresse);
  buyerAddr.ele("ram:CityName").txt(kunde.ort);
  buyerAddr.ele("ram:CountryID").txt(buyerCountryID);

  // Buyer VAT ID (BT-48) — optional
  if (kunde.uid_mwst) {
    buyer
      .ele("ram:SpecifiedTaxRegistration")
      .ele("ram:ID", { schemeID: "VA" })
      .txt(kunde.uid_mwst);
  }

  // ── ApplicableHeaderTradeDelivery ────────────────────────────────────────
  tx
    .ele("ram:ApplicableHeaderTradeDelivery")
    .ele("ram:ActualDeliverySupplyChainEvent")
    .ele("ram:OccurrenceDateTime")
    .ele("udt:DateTimeString", { format: "102" })
    .txt(toCiiDate(deliveryDate));

  // ── ApplicableHeaderTradeSettlement ─────────────────────────────────────
  const settlement = tx.ele("ram:ApplicableHeaderTradeSettlement");
  // ZUGFeRD is DE-only; DE uses EUR. Use profil currency as canonical source.
  const currencyCode = "EUR"; // DE always EUR; future: derive from getDachConfig(profil.land).currency
  settlement.ele("ram:InvoiceCurrencyCode").txt(currencyCode);

  // Payment means: SEPA credit transfer (BT-81, BT-84, BT-86)
  if (profil.iban) {
    const paymentMeans = settlement.ele("ram:SpecifiedTradeSettlementPaymentMeans");
    paymentMeans.ele("ram:TypeCode").txt("58"); // 58 = SEPA credit transfer
    paymentMeans
      .ele("ram:PayeePartyCreditorFinancialAccount")
      .ele("ram:IBANID")
      .txt(profil.iban);
    if (profil.bic) {
      paymentMeans
        .ele("ram:PayeeSpecifiedCreditorFinancialInstitution")
        .ele("ram:BICID")
        .txt(profil.bic);
    }
  }

  // VAT breakdown (BG-23)
  const tradeTax = settlement.ele("ram:ApplicableTradeTax");
  tradeTax.ele("ram:CalculatedAmount").txt(money(taxAmount));
  tradeTax.ele("ram:TypeCode").txt("VAT");
  tradeTax.ele("ram:BasisAmount").txt(money(taxBasis));
  tradeTax.ele("ram:CategoryCode").txt(profil.kleinunternehmer ? "E" : mwstSatz === 0 ? "Z" : "S");
  tradeTax.ele("ram:RateApplicablePercent").txt(String(mwstSatz));

  // Payment terms — BT-9 (due date) + human-readable description
  const paymentTerms = settlement.ele("ram:SpecifiedTradePaymentTerms");
  paymentTerms
    .ele("ram:Description")
    .txt(`Zahlbar innerhalb von ${zahlungsfristTage} Tagen.`);
  paymentTerms
    .ele("ram:DueDateDateTime")
    .ele("udt:DateTimeString", { format: "102" })
    .txt(toCiiDate(dueDate));

  // Monetary summation (BG-22)
  const summation = settlement.ele("ram:SpecifiedTradeSettlementHeaderMonetarySummation");
  summation.ele("ram:LineTotalAmount").txt(money(lineTotal));
  summation.ele("ram:TaxBasisTotalAmount").txt(money(taxBasis));
  summation.ele("ram:TaxTotalAmount", { currencyID: currencyCode }).txt(money(taxAmount));
  summation.ele("ram:GrandTotalAmount").txt(money(grandTotal));
  summation.ele("ram:DuePayableAmount").txt(money(grandTotal));

  return root.end({ prettyPrint: true });
}

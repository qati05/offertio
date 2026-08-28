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
import { addDaysIso } from "./dates";
import { getReverseChargeCase } from "./reverse-charge";

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
  const { profil, kunde, positionen, nummer, datum, rabatt } = data;

  // ── Reverse charge (§13b UStG) ───────────────────────────────────────────
  // The recipient owes the tax, so the invoice carries none. The rate is forced
  // to 0 rather than trusted from the caller: §14a Abs. 5 UStG disapplies the
  // separate tax statement entirely, and an invoice that both claims reverse
  // charge and shows VAT makes the issuer liable for that VAT under §14c UStG.
  // A stale draft or a direct API call must not be able to produce that.
  const reverseChargeCase = getReverseChargeCase(data.steuerfall);
  const mwstSatz = reverseChargeCase ? 0 : data.mwstSatz;

  // ── Monetary totals ──────────────────────────────────────────────────────
  // Line net amounts (BT-131) as they are actually printed on each line. The
  // header total is summed from these rounded values, so BT-106 can never
  // disagree with the lines by a rounding cent (BR-CO-10).
  //
  // KNOWN LIMITATION: the PDF (OffertePDF.tsx) sums the raw, unrounded line
  // products instead. The two agree for any price with at most 2 decimals. For
  // sub-cent unit prices (e.g. 2 × 0.005) the XML total can be one cent above
  // the printed PDF total, because EN 16931 forces BT-106 to match the rounded
  // line amounts the invoice actually shows. Deliberately not "fixed" here:
  // aligning the PDF would change the amount handed to the Swiss QR-bill, which
  // is outside this change. Constrain unit prices to 2 decimals on input to
  // make the case unreachable.
  const lineNetAmounts = positionen.map((p) => Number(money(p.menge * p.preis)));
  const lineTotal = Number(money(lineNetAmounts.reduce((sum, v) => sum + v, 0))); // BT-106

  // A discount is a document-level allowance (BG-20), NOT a silent deduction
  // from BT-106. EN 16931 requires BT-106 to equal the sum of the line amounts
  // (BR-CO-10) and the discount to be reported separately in BT-107 (BR-CO-11);
  // the tax basis then follows from BT-109 = BT-106 − BT-107 + BT-108
  // (BR-CO-13). Subtracting it from BT-106 instead makes every discounted
  // invoice fail validation while still looking correct in the PDF.
  const rabattBetrag = rabatt?.aktiv
    ? Number(money(rabatt.modus === "chf" ? rabatt.wert : lineTotal * (rabatt.wert / 100)))
    : 0; // BT-92 / BT-107
  const hasAllowance = rabattBetrag > 0;

  const taxBasis = Number(money(lineTotal - rabattBetrag)); // BT-109
  const taxAmount = Number(money(taxBasis * (mwstSatz / 100))); // BT-110
  const grandTotal = Number(money(taxBasis + taxAmount)); // BT-112

  const deliveryDate = leistungsdatum ?? datum;
  const buyerName = (kunde.firma?.trim() || kunde.name) ?? "";

  // ── VAT category code + exemption reason (BT-120 / BT-121) ───────────────
  // "AE" = reverse charge, the recipient owes the tax (§13b UStG)
  // "E"  = exempt (§19 UStG Kleinunternehmer, no input deduction for the buyer)
  // "Z"  = zero-rated (taxable but at 0%)
  // "S"  = standard-rated
  //
  // BR-AE-10 and BR-E-10 require an exemption reason for AE and E. Reverse
  // charge additionally gets the coded form BT-121, using the CEF VATEX code
  // list value for reverse charge, so a recipient's system can act on it
  // without parsing German prose.
  const vatCategoryCode = reverseChargeCase
    ? "AE"
    : profil.kleinunternehmer
      ? "E"
      : mwstSatz === 0
        ? "Z"
        : "S";
  const vatExemptionReason = reverseChargeCase
    ? reverseChargeCase.hinweis
    : profil.kleinunternehmer
      ? "Steuerbefreit nach §19 UStG (Kleinunternehmer)"
      : mwstSatz === 0
        ? "Nullsatz"
        : null;
  const vatExemptionReasonCode = reverseChargeCase?.vatexCode ?? null;

  // ── Payment due date (BT-9) ──────────────────────────────────────────────
  // Derived from invoice date + payment terms days (profil.zahlungsfrist,
  // default 30). addDaysIso keeps the calculation in local-time components
  // so `2025-03-30 + 2 days` stays `2025-04-01` regardless of the server's
  // TZ (a plain `new Date(datum)` would parse as UTC midnight and a later
  // toISOString() could silently drop a day).
  const zahlungsfristTage = profil.zahlungsfrist ?? 30;
  const dueDate = addDaysIso(datum, zahlungsfristTage);

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
    const lineNetAmount = lineNetAmounts[index];
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
    lineTax.ele("ram:CategoryCode").txt(vatCategoryCode);
    // Reverse charge states its reason once, in the BG-23 breakdown, which is
    // where BR-AE-10 asks for it. Line level stays bare.
    if (vatExemptionReason && !reverseChargeCase) {
      lineTax.ele("ram:ExemptionReason").txt(vatExemptionReason);
    }
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
  if (vatExemptionReason) {
    tradeTax.ele("ram:ExemptionReason").txt(vatExemptionReason);
  }
  tradeTax.ele("ram:BasisAmount").txt(money(taxBasis));
  tradeTax.ele("ram:CategoryCode").txt(vatCategoryCode);
  // BT-121, the coded exemption reason. The CII sequence places
  // ExemptionReasonCode after CategoryCode and before RateApplicablePercent.
  if (vatExemptionReasonCode) {
    tradeTax.ele("ram:ExemptionReasonCode").txt(vatExemptionReasonCode);
  }
  tradeTax.ele("ram:RateApplicablePercent").txt(String(mwstSatz));

  // Document-level allowance (BG-20) — the discount.
  // Position matters: the CII schema sequence for ApplicableHeaderTradeSettlement
  // puts SpecifiedTradeAllowanceCharge after ApplicableTradeTax and before
  // SpecifiedTradePaymentTerms. Emitting it elsewhere fails schema validation
  // before any business rule is even evaluated.
  if (hasAllowance) {
    const allowance = settlement.ele("ram:SpecifiedTradeAllowanceCharge");
    // false = allowance (deduction); true would mark a surcharge.
    allowance.ele("ram:ChargeIndicator").ele("udt:Indicator").txt("false");
    if (rabatt?.modus !== "chf") {
      // Only a percentage discount has a meaningful rate and basis.
      allowance.ele("ram:CalculationPercent").txt(String(rabatt?.wert ?? 0)); // BT-94
      allowance.ele("ram:BasisAmount").txt(money(lineTotal)); // BT-93
    }
    allowance.ele("ram:ActualAmount").txt(money(rabattBetrag)); // BT-92
    // BR-31: a document-level allowance must carry a reason.
    allowance.ele("ram:Reason").txt("Rabatt"); // BT-97
    // BT-95/BT-96: the allowance is taxed at the same category and rate as the
    // invoice, otherwise the VAT breakdown no longer adds up.
    const allowanceTax = allowance.ele("ram:CategoryTradeTax");
    allowanceTax.ele("ram:TypeCode").txt("VAT");
    allowanceTax.ele("ram:CategoryCode").txt(vatCategoryCode);
    allowanceTax.ele("ram:RateApplicablePercent").txt(String(mwstSatz));
  }

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
  summation.ele("ram:LineTotalAmount").txt(money(lineTotal)); // BT-106
  // BT-107. Sequence: LineTotal → ChargeTotal → AllowanceTotal → TaxBasisTotal.
  // BT-108 (ChargeTotalAmount) is omitted; EN 16931 reads an absent charge
  // total as 0, which is what BR-CO-13 needs here.
  if (hasAllowance) {
    summation.ele("ram:AllowanceTotalAmount").txt(money(rabattBetrag));
  }
  summation.ele("ram:TaxBasisTotalAmount").txt(money(taxBasis)); // BT-109
  summation.ele("ram:TaxTotalAmount", { currencyID: currencyCode }).txt(money(taxAmount));
  summation.ele("ram:GrandTotalAmount").txt(money(grandTotal));
  summation.ele("ram:DuePayableAmount").txt(money(grandTotal));

  return root.end({ prettyPrint: true });
}

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Profile, Position, KundenInfo, RabattInfo, DokumentTyp } from "@/lib/types";
import { getDachConfig } from "@/lib/dach";
import { formatMoney } from "@/lib/money-format";
import { getSteuerHinweis, getEffektiverMwstSatz, type Steuerfall } from "@/lib/reverse-charge";
import { formatSwissDate } from "@/lib/dates";
import { resolveAccentPalette } from "@/lib/pdf-colors";
import { QR_BILL_PT, QR_BILL_PAGE_BOTTOM_PT } from "@/lib/qr-bill-layout";

function fmtIBAN(iban: string) {
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export interface PDFFarbigProps {
  profil: Profile;
  kunde: KundenInfo;
  positionen: Position[];
  nummer: string;
  datum: string;
  gueltigBis: string;
  leistungsdatum?: string;
  objekt?: string;
  mwstSatz: number;
  /** Tax treatment; a §13b case suppresses the VAT line and prints the notice. */
  steuerfall?: Steuerfall;
  notiz: string;
  rabatt?: RabattInfo;
  qrCodeDataUrl?: string | null;
  qrReference?: string | null;
  logoDataUrl?: string | null;
  dokumentTyp?: DokumentTyp;
  currency?: string;
  preisMode?: "exkl" | "inkl";
}

/**
 * "Farbig" template — bold, color-forward layout with a left accent bar and
 * full-color header. The accent color is driven by `profil.pdf_accent_color`
 * (6-digit hex) with the offertio orange as default. Designed for brands that
 * want a more distinctive look than Classic/Modern without losing legal
 * clarity.
 */
export default function PDFFarbig({
  profil, kunde, positionen, nummer, datum, gueltigBis, leistungsdatum,
  objekt, mwstSatz: mwstSatzInput, steuerfall, notiz, rabatt, qrCodeDataUrl, qrReference, logoDataUrl,
  dokumentTyp = "offerte", currency = "CHF", preisMode = "exkl",
}: PDFFarbigProps) {
  // Reverse charge and Kleinunternehmer both print at 0%. Derived before any
  // totals are computed so every downstream amount uses the effective rate.
  const mwstSatz = getEffektiverMwstSatz(mwstSatzInput, profil, steuerfall);
  // Amounts follow the issuer's country: 1'234.56 in CH, 1.234,56 in
  // DE/AT. Bound here rather than module-level because the format
  // depends on the document being rendered.
  const fmt = (n: number) => formatMoney(n, profil.land);
  const { accent, accentDark, accentSoft, accentOnWhite } = resolveAccentPalette(profil.pdf_accent_color ?? null);

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const grossSubtotal = r2(positionen.reduce((s, p) => s + p.menge * p.preis, 0));
  const rabattBetrag = r2(
    rabatt?.aktiv ? (rabatt.modus === "chf" ? rabatt.wert : grossSubtotal * (rabatt.wert / 100)) : 0,
  );
  const grossNachRabatt = r2(grossSubtotal - rabattBetrag);
  const nettoNachRabatt = preisMode === "exkl" ? grossNachRabatt : r2(grossNachRabatt / (1 + mwstSatz / 100));
  const mwstBetrag = preisMode === "exkl" ? r2(nettoNachRabatt * (mwstSatz / 100)) : r2(grossNachRabatt - nettoNachRabatt);
  const total = preisMode === "exkl" ? r2(nettoNachRabatt + mwstBetrag) : grossNachRabatt;

  const datumF = formatSwissDate(datum);
  const gueltigBisF = gueltigBis ? formatSwissDate(gueltigBis) : "";

  const dachConfig = getDachConfig(profil.land);
  const { mwstTermLabel, pdfUidLabel, pdfMwstNrLabel, leistungsdatumRequired, hasQrBill: landHasQrBill } = dachConfig;
  const hasQR = landHasQrBill && !!qrCodeDataUrl;
  // A reverse-charge invoice shows no VAT and carries the §13b notice
  // instead. One helper decides this for all five templates, so the same
  // document cannot render correctly in one layout and wrongly in another.
  const steuerHinweis = getSteuerHinweis(profil, steuerfall);
  const zeigtSteuerHinweis = steuerHinweis !== null;
  const typLabel = dokumentTyp === "rechnung" ? "Rechnung" : "Offerte";
  const dateEndLabel = dokumentTyp === "rechnung" ? "Zahlbar bis" : "Gültig bis";
  const displayUid = profil.land === "DE" ? (profil.steuernummer || "") : (profil.uid_mwst || "");
  const displayMwst = profil.land === "AT" ? (profil.fn_nr || "") : profil.land === "DE" ? (profil.uid_mwst || "") : "";
  const creditorName = profil.firmenname || `${profil.vorname} ${profil.nachname}`.trim();
  const showLeistungsdatum = dokumentTyp === "rechnung" && leistungsdatumRequired;
  const leistungsdatumF = leistungsdatum ? formatSwissDate(leistungsdatum) : `${datumF} (= Rechnungsdatum)`;

  // Styles are derived inline to pick up the dynamic accent color.
  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, color: "#1A1916" , paddingBottom: QR_BILL_PAGE_BOTTOM_PT },
    // Wide colored header band — covers the top of the page.
    headerBand: {
      backgroundColor: accent,
      padding: "32 48 18 48",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    // Secondary darker band below the main one; holds document meta.
    subBand: {
      backgroundColor: accentDark,
      padding: "10 48",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logo: { width: 44, height: 44, objectFit: "contain" as const, marginRight: 14 },
    firma: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
    firmaDetail: { fontSize: 8, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 },
    docTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 1 },
    docMeta: { fontSize: 8.5, color: "rgba(255,255,255,0.82)" },
    // The left accent bar runs down the whole content area.
    bodyWrap: { flexDirection: "row", paddingTop: 20, paddingBottom: 12, paddingRight: 48 },
    accentBar: { width: 6, backgroundColor: accent, marginRight: 18 },
    content: { flex: 1 },
    // Kunde
    kundeLabel: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 1,
      textTransform: "uppercase" as const,
      color: accentOnWhite,
      marginBottom: 4,
    },
    kundeName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1A1916", marginBottom: 2 },
    kundeDetail: { fontSize: 9, color: "#444", lineHeight: 1.4 },
    kundeBlock: { marginBottom: 22 },
    // Table
    tableHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      padding: "8 10",
      borderRadius: 3,
      marginBottom: 2,
    },
    thText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#FFFFFF",
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    row: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10 },
    rowShaded: { backgroundColor: accentSoft },
    colBez: { flex: 3 },
    colMenge: { width: 48, textAlign: "center" as const },
    colEinheit: { width: 50, textAlign: "center" as const },
    colPreis: { width: 70, textAlign: "right" as const },
    colTotal: { width: 80, textAlign: "right" as const },
    // Summary
    summaryBlock: { marginTop: 16, alignItems: "flex-end" },
    summaryRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2.5, width: 230 },
    sLabel: { flex: 1, textAlign: "right" as const, color: "#555", fontSize: 9, paddingRight: 14 },
    sValue: { width: 92, textAlign: "right" as const, fontSize: 9 },
    totalBox: {
      flexDirection: "row",
      justifyContent: "flex-end",
      width: 230,
      backgroundColor: accent,
      borderRadius: 3,
      padding: "9 14",
      marginTop: 10,
    },
    totalLabel: {
      flex: 1,
      textAlign: "right" as const,
      paddingRight: 14,
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: "#FFFFFF",
    },
    totalValue: {
      width: 92,
      textAlign: "right" as const,
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: "#FFFFFF",
    },
    // Notiz
    notiz: {
      marginTop: 22,
      padding: "12 14",
      borderLeftWidth: 3,
      borderLeftColor: accent,
      backgroundColor: "#F8F7F4",
      fontSize: 9,
      color: "#444",
      lineHeight: 1.5,
    },
    notizLabel: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
      color: accentOnWhite,
      marginBottom: 4,
    },
    // QR (reuses the Modern layout so the dashed-line Swiss QR receipt renders
    // the same across templates — changing only the Zahlteil title color).
    qrSection: {
      position: "absolute" as const, bottom: 0, left: 0, right: 0, height: QR_BILL_PT.stripHeight,
      borderTopWidth: 1, borderTopColor: "#000", borderTopStyle: "dashed" as const,
      flexDirection: "row",
    },
    qrReceipt: {
      width: QR_BILL_PT.receiptWidth, padding: "8 10",
      borderRightWidth: 1, borderRightColor: "#000", borderRightStyle: "dashed" as const,
    },
    qrPayment: { flex: 1, padding: "8 16", flexDirection: "row" },
    qrTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: accentOnWhite },
    qrSecLabel: {
      fontSize: 6, fontFamily: "Helvetica-Bold", letterSpacing: 0.3,
      textTransform: "uppercase" as const, marginBottom: 2, marginTop: 4, color: "#1A1916",
    },
    qrSecVal: { fontSize: 7, lineHeight: 1.3, color: "#1A1916" },
    qrAmtRow: { flexDirection: "row", marginTop: 6 },
    qrAmtCol: { marginRight: 16 },
    qrImage: {
    width: QR_BILL_PT.code,
    height: QR_BILL_PT.code, marginRight: 12 },
    qrPayInfo: { flex: 1 },
    qrPlaceholder: {
      position: "absolute" as const, bottom: 40, left: 48, right: 48,
      borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 12,
    },
    qrPlaceholderText: { fontSize: 7, color: "#999", textAlign: "center" as const },
  });

  return (
    <Document>
      <Page size="A4" style={[s.page, { paddingBottom: hasQR ? 115 : 40 }]}>

        {/* Colored header band */}
        <View style={s.headerBand}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {logoDataUrl && <Image src={logoDataUrl} style={s.logo} />}
            <View>
              <Text style={s.firma}>{profil.firmenname || creditorName}</Text>
              {(profil.vorname || profil.nachname) && (
                <Text style={s.firmaDetail}>{profil.vorname} {profil.nachname}</Text>
              )}
              {profil.adresse && <Text style={s.firmaDetail}>{profil.adresse}</Text>}
              {(profil.plz || profil.ort) && <Text style={s.firmaDetail}>{profil.plz} {profil.ort}</Text>}
              {profil.telefon && <Text style={s.firmaDetail}>{profil.telefon}</Text>}
              {displayUid && <Text style={s.firmaDetail}>{pdfUidLabel}: {displayUid}</Text>}
              {displayMwst && <Text style={s.firmaDetail}>{pdfMwstNrLabel}: {displayMwst}</Text>}
            </View>
          </View>
          <Text style={s.docTitle}>{typLabel}</Text>
        </View>

        {/* Darker meta band */}
        <View style={s.subBand}>
          <Text style={s.docMeta}>Nr. {nummer}</Text>
          <Text style={s.docMeta}>Datum: {datumF}</Text>
          {gueltigBisF ? <Text style={s.docMeta}>{dateEndLabel}: {gueltigBisF}</Text> : <Text style={s.docMeta}> </Text>}
          {showLeistungsdatum ? (
            <Text style={s.docMeta}>Leistungsdatum: {leistungsdatumF}</Text>
          ) : objekt ? (
            <Text style={s.docMeta}>{objekt}</Text>
          ) : <Text style={s.docMeta}> </Text>}
        </View>

        {/* Body with left accent bar */}
        <View style={s.bodyWrap}>
          <View style={s.accentBar} />
          <View style={s.content}>
            {/* Kunde */}
            <View style={s.kundeBlock}>
              <Text style={s.kundeLabel}>Kunde</Text>
              {kunde.firma && <Text style={s.kundeName}>{kunde.firma}</Text>}
              {kunde.name && <Text style={kunde.firma ? s.kundeDetail : s.kundeName}>{kunde.name}</Text>}
              {kunde.adresse && <Text style={s.kundeDetail}>{kunde.adresse}</Text>}
              {kunde.adresse2 && <Text style={s.kundeDetail}>{kunde.adresse2}</Text>}
              {(kunde.plz || kunde.ort) && <Text style={s.kundeDetail}>{kunde.plz} {kunde.ort}</Text>}
            </View>

            {/* Table */}
            <View style={s.tableHeader}>
              <Text style={[s.thText, s.colBez]}>Bezeichnung</Text>
              <Text style={[s.thText, s.colMenge]}>Menge</Text>
              <Text style={[s.thText, s.colEinheit]}>Einheit</Text>
              <Text style={[s.thText, s.colPreis]}>
                {preisMode === "exkl" ? `Preis exkl. ${mwstTermLabel}` : `Preis inkl. ${mwstTermLabel}`}
              </Text>
              <Text style={[s.thText, s.colTotal]}>Total</Text>
            </View>
            {positionen.map((pos, i) => (
              <View key={i} style={[s.row, i % 2 !== 0 ? s.rowShaded : {}]}>
                <Text style={s.colBez}>{pos.bezeichnung}</Text>
                <Text style={s.colMenge}>{pos.menge % 1 === 0 ? pos.menge : pos.menge.toFixed(1)}</Text>
                <Text style={s.colEinheit}>{pos.einheit}</Text>
                <Text style={s.colPreis}>{fmt(pos.preis)}</Text>
                <Text style={s.colTotal}>{fmt(pos.menge * pos.preis)}</Text>
              </View>
            ))}

            {/* Summary */}
            <View style={s.summaryBlock}>
              {preisMode === "exkl" ? (
                <>
                  <View style={s.summaryRow}>
                    <Text style={s.sLabel}>Subtotal</Text>
                    <Text style={s.sValue}>{currency} {fmt(grossSubtotal)}</Text>
                  </View>
                  {rabatt?.aktiv && rabattBetrag > 0 && (
                    <View style={s.summaryRow}>
                      <Text style={s.sLabel}>{rabatt.label}</Text>
                      <Text style={[s.sValue, { color: "#22c55e" }]}>−{currency} {fmt(rabattBetrag)}</Text>
                    </View>
                  )}
                  {zeigtSteuerHinweis ? (
                    <View style={[s.summaryRow, { marginTop: 4 }]}>
                      <Text style={[s.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{steuerHinweis}</Text>
                    </View>
                  ) : mwstSatz > 0 ? (
                    <View style={s.summaryRow}>
                      <Text style={s.sLabel}>{mwstTermLabel} ({mwstSatz}%)</Text>
                      <Text style={s.sValue}>{currency} {fmt(mwstBetrag)}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={s.summaryRow}>
                    <Text style={s.sLabel}>Bruttototal</Text>
                    <Text style={s.sValue}>{currency} {fmt(grossSubtotal)}</Text>
                  </View>
                  {rabatt?.aktiv && rabattBetrag > 0 && (
                    <View style={s.summaryRow}>
                      <Text style={s.sLabel}>{rabatt.label}</Text>
                      <Text style={[s.sValue, { color: "#22c55e" }]}>−{currency} {fmt(rabattBetrag)}</Text>
                    </View>
                  )}
                  {zeigtSteuerHinweis ? (
                    <View style={[s.summaryRow, { marginTop: 4 }]}>
                      <Text style={[s.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{steuerHinweis}</Text>
                    </View>
                  ) : mwstSatz > 0 ? (
                    <View style={s.summaryRow}>
                      <Text style={[s.sLabel, { color: "#999" }]}>davon {mwstTermLabel} ({mwstSatz}%)</Text>
                      <Text style={[s.sValue, { color: "#999" }]}>{currency} {fmt(mwstBetrag)}</Text>
                    </View>
                  ) : null}
                </>
              )}
              <View style={s.totalBox}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValue}>{currency} {fmt(total)}</Text>
              </View>
            </View>

            {/* Notiz */}
            {notiz && (
              <View style={s.notiz}>
                <Text style={s.notizLabel}>Bemerkungen</Text>
                <Text>{notiz}</Text>
              </View>
            )}
          </View>
        </View>

        {/* QR / bank strip — identical layout to Modern, tinted with accent. */}
        {hasQR ? (
          <View style={s.qrSection}>
            <View style={s.qrReceipt}>
              <Text style={s.qrTitle}>Empfangsschein</Text>
              <Text style={s.qrSecLabel}>Konto / Zahlbar an</Text>
              <Text style={s.qrSecVal}>{fmtIBAN(profil.iban)}</Text>
              <Text style={s.qrSecVal}>{creditorName}</Text>
              {profil.adresse && <Text style={s.qrSecVal}>{profil.adresse}</Text>}
              {(profil.plz || profil.ort) && <Text style={s.qrSecVal}>{profil.plz} {profil.ort}</Text>}
              <Text style={s.qrSecLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
              <Text style={s.qrSecVal}>{qrReference ?? nummer}</Text>
              <View style={s.qrAmtRow}>
                <View style={s.qrAmtCol}><Text style={s.qrSecLabel}>Währung</Text><Text style={s.qrSecVal}>CHF</Text></View>
                <View><Text style={s.qrSecLabel}>Betrag</Text><Text style={s.qrSecVal}>{fmt(total)}</Text></View>
              </View>
              <Text style={[s.qrSecLabel, { position: "absolute" as const, bottom: 8, right: 10 }]}>Annahmestelle</Text>
            </View>
            <View style={s.qrPayment}>
              <View>
                <Text style={s.qrTitle}>Zahlteil</Text>
                <Image src={qrCodeDataUrl!} style={s.qrImage} />
                <View style={s.qrAmtRow}>
                  <View style={s.qrAmtCol}><Text style={s.qrSecLabel}>Währung</Text><Text style={s.qrSecVal}>CHF</Text></View>
                  <View><Text style={s.qrSecLabel}>Betrag</Text><Text style={s.qrSecVal}>{fmt(total)}</Text></View>
                </View>
              </View>
              <View style={s.qrPayInfo}>
                <Text style={s.qrSecLabel}>Konto / Zahlbar an</Text>
                <Text style={s.qrSecVal}>{fmtIBAN(profil.iban)}</Text>
                <Text style={s.qrSecVal}>{creditorName}</Text>
                {profil.adresse && <Text style={s.qrSecVal}>{profil.adresse}</Text>}
                {(profil.plz || profil.ort) && <Text style={s.qrSecVal}>{profil.plz} {profil.ort}</Text>}
                <Text style={s.qrSecLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
                <Text style={s.qrSecVal}>{qrReference ?? nummer}</Text>
              </View>
            </View>
          </View>
        ) : landHasQrBill ? (
          <View style={s.qrPlaceholder}>
            <Text style={s.qrPlaceholderText}>
              {profil.iban
                ? `Swiss QR-Rechnung · IBAN: ${profil.iban} · Betrag: CHF ${fmt(total)}`
                : "IBAN in Profil hinterlegen für Swiss QR-Rechnung"}
            </Text>
          </View>
        ) : profil.iban && dokumentTyp === "rechnung" ? (
          <View style={s.qrPlaceholder}>
            <Text style={[s.qrSecLabel, { marginBottom: 3 }]}>Bankverbindung</Text>
            <Text style={s.qrPlaceholderText}>
              IBAN: {fmtIBAN(profil.iban)}{profil.bic ? `  ·  BIC: ${profil.bic}` : ""}{"  ·  "}{creditorName}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

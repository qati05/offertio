import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Profile, Position, KundenInfo, RabattInfo, DokumentTyp } from "@/lib/types";
import { getDachConfig, getKleinunternehmerHinweis } from "@/lib/dach";

function fmt(n: number) {
  return n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtIBAN(iban: string) {
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

const m = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1A1916" },
  // Full-width dark header — no horizontal padding on page, handled inside
  header: {
    backgroundColor: "#1A1916",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "28 48 26 48",
  },
  logo: { width: 40, height: 40, objectFit: "contain" as const, marginRight: 12 },
  firma: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginBottom: 3 },
  firmaDetail: { fontSize: 7.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.5 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#C8793D", marginBottom: 4 },
  docMeta: { fontSize: 8.5, color: "rgba(255,255,255,0.72)", marginTop: 1 },
  content: { padding: "28 48 0 48" },
  // Kunde
  kundeBlock: {
    marginBottom: 26,
    padding: "13 18",
    borderLeftWidth: 3,
    borderLeftColor: "#C8793D",
    backgroundColor: "#F8F7F4",
  },
  kundeLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    color: "#C8793D",
    marginBottom: 5,
  },
  kundeName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1A1916", marginBottom: 2 },
  kundeDetail: { fontSize: 9, color: "#555", lineHeight: 1.4 },
  // Table
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 7,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1A1916",
    marginBottom: 1,
  },
  thText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#1A1916",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  row: { flexDirection: "row", paddingVertical: 6.5 },
  rowShaded: { backgroundColor: "#F2F0EC" },
  colBez: { flex: 3 },
  colMenge: { width: 48, textAlign: "center" as const },
  colEinheit: { width: 50, textAlign: "center" as const },
  colPreis: { width: 70, textAlign: "right" as const },
  colTotal: { width: 80, textAlign: "right" as const },
  // Summary
  summaryBlock: { marginTop: 14, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2.5, width: 220 },
  sLabel: { flex: 1, textAlign: "right" as const, color: "#666", fontSize: 9, paddingRight: 14 },
  sValue: { width: 88, textAlign: "right" as const, fontSize: 9 },
  totalBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    backgroundColor: "rgba(200,121,61,0.10)",
    borderRadius: 4,
    padding: "7 12",
    marginTop: 8,
  },
  totalLabel: { flex: 1, textAlign: "right" as const, paddingRight: 14, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1A1916" },
  totalValue: { width: 88, textAlign: "right" as const, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#C8793D" },
  // Notiz
  notiz: { marginTop: 26, padding: "10 14", backgroundColor: "#F2F0EC", borderRadius: 4, fontSize: 8, color: "#555", lineHeight: 1.5 },
  notizLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase" as const, color: "#999", marginBottom: 4 },
  // QR
  qrSection: { position: "absolute" as const, bottom: 0, left: 0, right: 0, height: 105, borderTopWidth: 1, borderTopColor: "#000", borderTopStyle: "dashed" as const, flexDirection: "row" },
  qrReceipt: { width: 175, padding: "8 10", borderRightWidth: 1, borderRightColor: "#000", borderRightStyle: "dashed" as const },
  qrPayment: { flex: 1, padding: "8 16", flexDirection: "row" },
  qrTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  qrSecLabel: { fontSize: 6, fontFamily: "Helvetica-Bold", letterSpacing: 0.3, textTransform: "uppercase" as const, marginBottom: 2, marginTop: 4 },
  qrSecVal: { fontSize: 7, lineHeight: 1.3 },
  qrAmtRow: { flexDirection: "row", marginTop: 6 },
  qrAmtCol: { marginRight: 16 },
  qrImage: { width: 80, height: 80, marginRight: 12 },
  qrPayInfo: { flex: 1 },
  qrPlaceholder: { position: "absolute" as const, bottom: 40, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 12 },
  qrPlaceholderText: { fontSize: 7, color: "#999", textAlign: "center" as const },
});

export interface PDFTemplateProps {
  profil: Profile;
  kunde: KundenInfo;
  positionen: Position[];
  nummer: string;
  datum: string;
  gueltigBis: string;
  leistungsdatum?: string;
  objekt?: string;
  mwstSatz: number;
  notiz: string;
  rabatt?: RabattInfo;
  qrCodeDataUrl?: string | null;
  /**
   * 27-digit QRR reference, present only when the profile IBAN is a QR-IBAN.
   * When set, the QR section shows "Referenz" instead of "Mitteilung".
   */
  qrReference?: string | null;
  logoDataUrl?: string | null;
  dokumentTyp?: DokumentTyp;
  currency?: string;
  preisMode?: "exkl" | "inkl";
}

export default function PDFModern({
  profil, kunde, positionen, nummer, datum, gueltigBis, leistungsdatum,
  objekt, mwstSatz, notiz, rabatt, qrCodeDataUrl, qrReference, logoDataUrl,
  dokumentTyp = "offerte", currency = "CHF", preisMode = "exkl",
}: PDFTemplateProps) {
  const grossSubtotal = positionen.reduce((s, p) => s + p.menge * p.preis, 0);
  const rabattBetrag = rabatt?.aktiv ? (rabatt.modus === "chf" ? rabatt.wert : grossSubtotal * (rabatt.wert / 100)) : 0;
  const grossNachRabatt = grossSubtotal - rabattBetrag;
  const nettoNachRabatt = preisMode === "exkl" ? grossNachRabatt : grossNachRabatt / (1 + mwstSatz / 100);
  const mwstBetrag = preisMode === "exkl" ? nettoNachRabatt * (mwstSatz / 100) : grossNachRabatt - nettoNachRabatt;
  const total = preisMode === "exkl" ? nettoNachRabatt + mwstBetrag : grossNachRabatt;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const datumF = fmtDate(datum);
  const gueltigBisF = gueltigBis ? fmtDate(gueltigBis) : "";

  const dachConfig = getDachConfig(profil.land);
  const { mwstTermLabel, pdfUidLabel, pdfMwstNrLabel, leistungsdatumRequired, hasQrBill: landHasQrBill } = dachConfig;
  const hasQR = landHasQrBill && !!qrCodeDataUrl;
  const isKleinunternehmer = !!profil.kleinunternehmer;
  const kleinunternehmerHinweis = isKleinunternehmer ? getKleinunternehmerHinweis(profil.land) : null;
  const typLabel = dokumentTyp === "rechnung" ? "Rechnung" : "Offerte";
  const dateEndLabel = dokumentTyp === "rechnung" ? "Zahlbar bis" : "Gültig bis";
  const displayUid = profil.land === "DE" ? (profil.steuernummer || "") : (profil.uid_mwst || "");
  const displayMwst = profil.land === "AT" ? (profil.fn_nr || "") : profil.land === "DE" ? (profil.uid_mwst || "") : "";
  const creditorName = profil.firmenname || `${profil.vorname} ${profil.nachname}`.trim();
  const showLeistungsdatum = dokumentTyp === "rechnung" && leistungsdatumRequired;
  const leistungsdatumF = leistungsdatum ? fmtDate(leistungsdatum) : `${datumF} (= Rechnungsdatum)`;

  return (
    <Document>
      <Page size="A4" style={[m.page, { paddingBottom: hasQR ? 115 : 40 }]}>

        {/* Dark header — full width */}
        <View style={m.header}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {logoDataUrl && <Image src={logoDataUrl} style={m.logo} />}
            <View>
              <Text style={m.firma}>{profil.firmenname}</Text>
              {(profil.vorname || profil.nachname) && (
                <Text style={m.firmaDetail}>{profil.vorname} {profil.nachname}</Text>
              )}
              {profil.adresse && <Text style={m.firmaDetail}>{profil.adresse}</Text>}
              {(profil.plz || profil.ort) && <Text style={m.firmaDetail}>{profil.plz} {profil.ort}</Text>}
              {profil.telefon && <Text style={m.firmaDetail}>{profil.telefon}</Text>}
              {displayUid && <Text style={m.firmaDetail}>{pdfUidLabel}: {displayUid}</Text>}
              {displayMwst && <Text style={m.firmaDetail}>{pdfMwstNrLabel}: {displayMwst}</Text>}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={m.docTitle}>{typLabel}</Text>
            <Text style={m.docMeta}>{nummer}</Text>
            <Text style={m.docMeta}>Datum: {datumF}</Text>
            {gueltigBisF && <Text style={m.docMeta}>{dateEndLabel}: {gueltigBisF}</Text>}
            {showLeistungsdatum && <Text style={m.docMeta}>Leistungsdatum: {leistungsdatumF}</Text>}
            {objekt && <Text style={[m.docMeta, { marginTop: 3 }]}>{objekt}</Text>}
          </View>
        </View>

        {/* Content */}
        <View style={m.content}>
          {/* Kunde */}
          <View style={m.kundeBlock}>
            <Text style={m.kundeLabel}>Kunde</Text>
            {kunde.firma && <Text style={m.kundeName}>{kunde.firma}</Text>}
            {kunde.name && <Text style={kunde.firma ? m.kundeDetail : m.kundeName}>{kunde.name}</Text>}
            {kunde.adresse && <Text style={m.kundeDetail}>{kunde.adresse}</Text>}
            {kunde.adresse2 && <Text style={m.kundeDetail}>{kunde.adresse2}</Text>}
            {(kunde.plz || kunde.ort) && <Text style={m.kundeDetail}>{kunde.plz} {kunde.ort}</Text>}
          </View>

          {/* Table */}
          <View style={m.tableHeader}>
            <Text style={[m.thText, m.colBez]}>Bezeichnung</Text>
            <Text style={[m.thText, m.colMenge]}>Menge</Text>
            <Text style={[m.thText, m.colEinheit]}>Einheit</Text>
            <Text style={[m.thText, m.colPreis]}>{preisMode === "exkl" ? `Preis exkl. ${mwstTermLabel}` : `Preis inkl. ${mwstTermLabel}`}</Text>
            <Text style={[m.thText, m.colTotal]}>Total</Text>
          </View>
          {positionen.map((pos, i) => (
            <View key={i} style={[m.row, i % 2 !== 0 ? m.rowShaded : {}]}>
              <Text style={m.colBez}>{pos.bezeichnung}</Text>
              <Text style={m.colMenge}>{pos.menge % 1 === 0 ? pos.menge : pos.menge.toFixed(1)}</Text>
              <Text style={m.colEinheit}>{pos.einheit}</Text>
              <Text style={m.colPreis}>{fmt(pos.preis)}</Text>
              <Text style={m.colTotal}>{fmt(pos.menge * pos.preis)}</Text>
            </View>
          ))}

          {/* Summary */}
          <View style={m.summaryBlock}>
            {preisMode === "exkl" ? (
              <>
                <View style={m.summaryRow}>
                  <Text style={m.sLabel}>Subtotal</Text>
                  <Text style={m.sValue}>{currency} {fmt(grossSubtotal)}</Text>
                </View>
                {rabatt?.aktiv && rabattBetrag > 0 && (
                  <View style={m.summaryRow}>
                    <Text style={m.sLabel}>{rabatt.label}</Text>
                    <Text style={[m.sValue, { color: "#22c55e" }]}>−{currency} {fmt(rabattBetrag)}</Text>
                  </View>
                )}
                {isKleinunternehmer ? (
                  <View style={[m.summaryRow, { marginTop: 4 }]}>
                    <Text style={[m.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{kleinunternehmerHinweis}</Text>
                  </View>
                ) : mwstSatz > 0 ? (
                  <View style={m.summaryRow}>
                    <Text style={m.sLabel}>{mwstTermLabel} ({mwstSatz}%)</Text>
                    <Text style={m.sValue}>{currency} {fmt(mwstBetrag)}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={m.summaryRow}>
                  <Text style={m.sLabel}>Bruttototal</Text>
                  <Text style={m.sValue}>{currency} {fmt(grossSubtotal)}</Text>
                </View>
                {rabatt?.aktiv && rabattBetrag > 0 && (
                  <View style={m.summaryRow}>
                    <Text style={m.sLabel}>{rabatt.label}</Text>
                    <Text style={[m.sValue, { color: "#22c55e" }]}>−{currency} {fmt(rabattBetrag)}</Text>
                  </View>
                )}
                {isKleinunternehmer ? (
                  <View style={[m.summaryRow, { marginTop: 4 }]}>
                    <Text style={[m.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{kleinunternehmerHinweis}</Text>
                  </View>
                ) : mwstSatz > 0 ? (
                  <View style={m.summaryRow}>
                    <Text style={[m.sLabel, { color: "#999" }]}>davon {mwstTermLabel} ({mwstSatz}%)</Text>
                    <Text style={[m.sValue, { color: "#999" }]}>{currency} {fmt(mwstBetrag)}</Text>
                  </View>
                ) : null}
              </>
            )}
            <View style={m.totalBox}>
              <Text style={m.totalLabel}>Total</Text>
              <Text style={m.totalValue}>{currency} {fmt(total)}</Text>
            </View>
          </View>

          {/* Notiz */}
          {notiz && (
            <View style={m.notiz}>
              <Text style={m.notizLabel}>Bemerkungen</Text>
              <Text>{notiz}</Text>
            </View>
          )}
        </View>

        {/* QR-Rechnung */}
        {hasQR ? (
          <View style={m.qrSection}>
            <View style={m.qrReceipt}>
              <Text style={m.qrTitle}>Empfangsschein</Text>
              <Text style={m.qrSecLabel}>Konto / Zahlbar an</Text>
              <Text style={m.qrSecVal}>{fmtIBAN(profil.iban)}</Text>
              <Text style={m.qrSecVal}>{creditorName}</Text>
              {profil.adresse && <Text style={m.qrSecVal}>{profil.adresse}</Text>}
              {(profil.plz || profil.ort) && <Text style={m.qrSecVal}>{profil.plz} {profil.ort}</Text>}
              <Text style={m.qrSecLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
              <Text style={m.qrSecVal}>{qrReference ?? nummer}</Text>
              <View style={m.qrAmtRow}>
                <View style={m.qrAmtCol}><Text style={m.qrSecLabel}>Währung</Text><Text style={m.qrSecVal}>CHF</Text></View>
                <View><Text style={m.qrSecLabel}>Betrag</Text><Text style={m.qrSecVal}>{fmt(total)}</Text></View>
              </View>
              <Text style={[m.qrSecLabel, { position: "absolute" as const, bottom: 8, right: 10 }]}>Annahmestelle</Text>
            </View>
            <View style={m.qrPayment}>
              <View>
                <Text style={m.qrTitle}>Zahlteil</Text>
                <Image src={qrCodeDataUrl!} style={m.qrImage} />
                <View style={m.qrAmtRow}>
                  <View style={m.qrAmtCol}><Text style={m.qrSecLabel}>Währung</Text><Text style={m.qrSecVal}>CHF</Text></View>
                  <View><Text style={m.qrSecLabel}>Betrag</Text><Text style={m.qrSecVal}>{fmt(total)}</Text></View>
                </View>
              </View>
              <View style={m.qrPayInfo}>
                <Text style={m.qrSecLabel}>Konto / Zahlbar an</Text>
                <Text style={m.qrSecVal}>{fmtIBAN(profil.iban)}</Text>
                <Text style={m.qrSecVal}>{creditorName}</Text>
                {profil.adresse && <Text style={m.qrSecVal}>{profil.adresse}</Text>}
                {(profil.plz || profil.ort) && <Text style={m.qrSecVal}>{profil.plz} {profil.ort}</Text>}
                <Text style={m.qrSecLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
                <Text style={m.qrSecVal}>{qrReference ?? nummer}</Text>
              </View>
            </View>
          </View>
        ) : landHasQrBill ? (
          <View style={m.qrPlaceholder}>
            <Text style={m.qrPlaceholderText}>
              {profil.iban ? `Swiss QR-Rechnung · IBAN: ${profil.iban} · Betrag: CHF ${fmt(total)}` : "IBAN in Profil hinterlegen für Swiss QR-Rechnung"}
            </Text>
          </View>
        ) : profil.iban && dokumentTyp === "rechnung" ? (
          <View style={m.qrPlaceholder}>
            <Text style={[m.qrSecLabel, { marginBottom: 3 }]}>Bankverbindung</Text>
            <Text style={m.qrPlaceholderText}>
              IBAN: {fmtIBAN(profil.iban)}{profil.bic ? `  ·  BIC: ${profil.bic}` : ""}{"  ·  "}{creditorName}
            </Text>
            {profil.land === "DE" && (
              <Text style={[m.qrPlaceholderText, { marginTop: 4, fontSize: 8, opacity: 0.6 }]}>
                E-Rechnung (XRechnung) — demnächst verfügbar
              </Text>
            )}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

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
import type { PDFTemplateProps } from "./PDFModern";

function fmt(n: number) {
  return n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtIBAN(iban: string) {
  return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1A1916", padding: "40 48 80 48" },
  // Two-column header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 },
  headerLeft: { flex: 1, paddingRight: 20 },
  logo: { width: 44, height: 44, objectFit: "contain" as const, marginBottom: 8 },
  firma: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#1A1916", marginBottom: 4 },
  firmaDetail: { fontSize: 8, color: "#666", lineHeight: 1.5 },
  // Doc info card (right side)
  docCard: {
    width: 168,
    padding: "14 16",
    backgroundColor: "rgba(200,121,61,0.05)",
    borderWidth: 0.75,
    borderColor: "rgba(200,121,61,0.30)",
    borderRadius: 6,
  },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#C8793D", marginBottom: 10 },
  docMetaRow: { flexDirection: "row", marginBottom: 3 },
  docMetaLabel: { fontSize: 7.5, color: "#999", width: 68 },
  docMetaValue: { fontSize: 7.5, color: "#1A1916", fontFamily: "Helvetica-Bold", flex: 1 },
  // Kunde — bordered card
  kundeBlock: {
    marginBottom: 28,
    padding: "14 18",
    borderWidth: 0.75,
    borderColor: "#DDD9D4",
    borderRadius: 5,
  },
  kundeLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    color: "#AAA49C",
    marginBottom: 6,
  },
  kundeName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1A1916", marginBottom: 2 },
  kundeDetail: { fontSize: 9, color: "#555", lineHeight: 1.4 },
  // Table — dark header row
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1A1916",
    padding: "6 0",
    borderRadius: 4,
    marginBottom: 1,
  },
  thText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EAE7E2",
  },
  colBez: { flex: 3, paddingHorizontal: 0 },
  colBezHead: { flex: 3, paddingLeft: 8 },
  colMenge: { width: 48, textAlign: "center" as const },
  colEinheit: { width: 50, textAlign: "center" as const },
  colPreis: { width: 70, textAlign: "right" as const },
  colTotal: { width: 80, textAlign: "right" as const, paddingRight: 8 },
  colTotalHead: { width: 80, textAlign: "right" as const, paddingRight: 8 },
  // Summary
  summaryBlock: { marginTop: 16, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2.5, width: 220 },
  sLabel: { flex: 1, textAlign: "right" as const, color: "#666", fontSize: 9, paddingRight: 14 },
  sValue: { width: 88, textAlign: "right" as const, fontSize: 9 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    borderTopWidth: 1.5,
    borderTopColor: "#1A1916",
    paddingTop: 7,
    marginTop: 5,
  },
  totalLabel: { flex: 1, textAlign: "right" as const, paddingRight: 14, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1A1916" },
  totalValue: { width: 88, textAlign: "right" as const, fontSize: 11, fontFamily: "Helvetica-Bold", color: "#C8793D" },
  // Notiz
  notiz: { marginTop: 26, padding: "10 14", borderWidth: 0.5, borderColor: "#DDD9D4", borderRadius: 4, fontSize: 8, color: "#555", lineHeight: 1.5 },
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

export default function PDFProfessionell({
  profil, kunde, positionen, nummer, datum, gueltigBis, leistungsdatum,
  objekt, mwstSatz, notiz, rabatt, qrCodeDataUrl, qrReference, logoDataUrl,
  dokumentTyp = "offerte", currency = "CHF", preisMode = "exkl",
}: PDFTemplateProps) {
  const grossSubtotal = positionen.reduce((acc, p) => acc + p.menge * p.preis, 0);
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
      <Page size="A4" style={[s.page, hasQR ? { paddingBottom: 115 } : {}]}>

        {/* Two-column header */}
        <View style={s.header}>
          {/* Left: company info */}
          <View style={s.headerLeft}>
            {logoDataUrl && <Image src={logoDataUrl} style={s.logo} />}
            <Text style={s.firma}>{profil.firmenname}</Text>
            {(profil.vorname || profil.nachname) && (
              <Text style={s.firmaDetail}>{profil.vorname} {profil.nachname}</Text>
            )}
            {profil.adresse && <Text style={s.firmaDetail}>{profil.adresse}</Text>}
            {(profil.plz || profil.ort) && <Text style={s.firmaDetail}>{profil.plz} {profil.ort}</Text>}
            {profil.telefon && <Text style={s.firmaDetail}>{profil.telefon}</Text>}
            {displayUid && <Text style={s.firmaDetail}>{pdfUidLabel}: {displayUid}</Text>}
            {displayMwst && <Text style={s.firmaDetail}>{pdfMwstNrLabel}: {displayMwst}</Text>}
          </View>
          {/* Right: document card */}
          <View style={s.docCard}>
            <Text style={s.docTitle}>{typLabel}</Text>
            <View style={s.docMetaRow}>
              <Text style={s.docMetaLabel}>Nummer</Text>
              <Text style={s.docMetaValue}>{nummer}</Text>
            </View>
            <View style={s.docMetaRow}>
              <Text style={s.docMetaLabel}>Datum</Text>
              <Text style={s.docMetaValue}>{datumF}</Text>
            </View>
            {gueltigBisF && (
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>{dateEndLabel}</Text>
                <Text style={s.docMetaValue}>{gueltigBisF}</Text>
              </View>
            )}
            {showLeistungsdatum && (
              <View style={s.docMetaRow}>
                <Text style={s.docMetaLabel}>Leistungsdatum</Text>
                <Text style={s.docMetaValue}>{leistungsdatumF}</Text>
              </View>
            )}
            {objekt && (
              <View style={[s.docMetaRow, { marginTop: 4 }]}>
                <Text style={s.docMetaLabel}>Objekt</Text>
                <Text style={s.docMetaValue}>{objekt}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Kunde */}
        <View style={s.kundeBlock}>
          <Text style={s.kundeLabel}>Rechnungsempfänger</Text>
          {kunde.firma && <Text style={s.kundeName}>{kunde.firma}</Text>}
          {kunde.name && <Text style={kunde.firma ? s.kundeDetail : s.kundeName}>{kunde.name}</Text>}
          {kunde.adresse && <Text style={s.kundeDetail}>{kunde.adresse}</Text>}
          {kunde.adresse2 && <Text style={s.kundeDetail}>{kunde.adresse2}</Text>}
          {(kunde.plz || kunde.ort) && <Text style={s.kundeDetail}>{kunde.plz} {kunde.ort}</Text>}
        </View>

        {/* Table */}
        <View style={s.tableHeaderRow}>
          <Text style={[s.thText, s.colBezHead]}>Bezeichnung</Text>
          <Text style={[s.thText, s.colMenge]}>Menge</Text>
          <Text style={[s.thText, s.colEinheit]}>Einheit</Text>
          <Text style={[s.thText, s.colPreis]}>{preisMode === "exkl" ? `Preis exkl. ${mwstTermLabel}` : `Preis inkl. ${mwstTermLabel}`}</Text>
          <Text style={[s.thText, s.colTotalHead]}>Total</Text>
        </View>
        {positionen.map((pos, i) => (
          <View key={i} style={s.row}>
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
              {isKleinunternehmer ? (
                <View style={[s.summaryRow, { marginTop: 4 }]}>
                  <Text style={[s.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{kleinunternehmerHinweis}</Text>
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
              {isKleinunternehmer ? (
                <View style={[s.summaryRow, { marginTop: 4 }]}>
                  <Text style={[s.sLabel, { color: "#777", fontSize: 8, flex: 1 }]}>{kleinunternehmerHinweis}</Text>
                </View>
              ) : mwstSatz > 0 ? (
                <View style={s.summaryRow}>
                  <Text style={[s.sLabel, { color: "#999" }]}>davon {mwstTermLabel} ({mwstSatz}%)</Text>
                  <Text style={[s.sValue, { color: "#999" }]}>{currency} {fmt(mwstBetrag)}</Text>
                </View>
              ) : null}
            </>
          )}
          <View style={s.totalRow}>
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

        {/* QR-Rechnung */}
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
              {profil.iban ? `Swiss QR-Rechnung · IBAN: ${profil.iban} · Betrag: CHF ${fmt(total)}` : "IBAN in Profil hinterlegen für Swiss QR-Rechnung"}
            </Text>
          </View>
        ) : profil.iban && dokumentTyp === "rechnung" ? (
          <View style={s.qrPlaceholder}>
            <Text style={[s.qrSecLabel, { marginBottom: 3 }]}>Bankverbindung</Text>
            <Text style={s.qrPlaceholderText}>
              IBAN: {fmtIBAN(profil.iban)}{profil.bic ? `  ·  BIC: ${profil.bic}` : ""}{"  ·  "}{creditorName}
            </Text>
            {profil.land === "DE" && (
              <Text style={[s.qrPlaceholderText, { marginTop: 4, fontSize: 8, opacity: 0.6 }]}>
                E-Rechnung (XRechnung) — demnächst verfügbar
              </Text>
            )}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

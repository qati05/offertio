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
import { formatSwissDate } from "@/lib/dates";
import PDFModern from "./pdf/PDFModern";
import PDFMinimal from "./pdf/PDFMinimal";
import PDFProfessionell from "./pdf/PDFProfessionell";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: "40 48 80 48",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain" as const,
    marginRight: 12,
  },
  firma: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  firmaDetail: {
    fontSize: 8,
    color: "#666",
    lineHeight: 1.5,
  },
  offerteTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#C8793D",
    marginBottom: 4,
  },
  offerteNr: {
    fontSize: 9,
    color: "#666",
  },
  kundeBlock: {
    marginBottom: 32,
    padding: "16 20",
    backgroundColor: "#f8f7f6",
    borderRadius: 6,
  },
  kundeLabel: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    color: "#999",
    marginBottom: 6,
  },
  kundeName: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  kundeDetail: {
    fontSize: 9,
    color: "#444",
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    color: "#999",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  colBez: { flex: 3 },
  colMenge: { width: 50, textAlign: "center" },
  colEinheit: { width: 50, textAlign: "center" },
  colPreis: { width: 70, textAlign: "right" },
  colTotal: { width: 80, textAlign: "right" },
  summaryBlock: {
    marginTop: 16,
    alignItems: "flex-end",
    paddingRight: 0,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 3,
    width: 220,
  },
  summaryLabel: {
    flex: 1,
    textAlign: "right",
    color: "#666",
    fontSize: 9,
    paddingRight: 16,
  },
  summaryValue: {
    width: 90,
    textAlign: "right",
    fontSize: 9,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    paddingTop: 6,
    marginTop: 4,
  },
  totalLabel: {
    flex: 1,
    textAlign: "right",
    paddingRight: 16,
    fontSize: 11,
    fontWeight: 600,
  },
  totalValue: {
    width: 90,
    textAlign: "right",
    fontSize: 11,
    fontWeight: 600,
    color: "#C8793D",
  },
  notiz: {
    marginTop: 32,
    padding: "12 16",
    backgroundColor: "#f8f7f6",
    borderRadius: 4,
    fontSize: 8,
    color: "#666",
    lineHeight: 1.5,
  },
  notizLabel: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    color: "#999",
    marginBottom: 4,
  },
  // QR Payment Section
  qrSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 105,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderTopStyle: "dashed" as const,
    flexDirection: "row",
  },
  qrReceipt: {
    width: 175,
    padding: "8 10",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderRightStyle: "dashed" as const,
  },
  qrPayment: {
    flex: 1,
    padding: "8 16",
    flexDirection: "row",
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 6,
  },
  qrSectionLabel: {
    fontSize: 6,
    fontWeight: 600,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    marginBottom: 2,
    marginTop: 4,
  },
  qrSectionValue: {
    fontSize: 7,
    lineHeight: 1.3,
  },
  qrAmountRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  qrAmountCol: {
    marginRight: 16,
  },
  qrImage: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  qrPaymentInfo: {
    flex: 1,
  },
  // Fallback when no QR
  qrPlaceholderSection: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
  },
  qrPlaceholder: {
    fontSize: 7,
    color: "#999",
    textAlign: "center",
  },
});

function formatAmount(n: number) {
  return n.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIBAN(iban: string) {
  const clean = iban.replace(/\s/g, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

interface OffertePDFProps {
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
   * 27-digit QRR reference string, set only when the profile IBAN is a QR-IBAN.
   * When present, the QR payment section shows "Referenz" instead of "Mitteilung".
   */
  qrReference?: string | null;
  logoDataUrl?: string | null;
  dokumentTyp?: DokumentTyp;
  currency?: string;
  preisMode?: "exkl" | "inkl";
  template?: "classic" | "modern" | "minimal" | "professionell";
}

export default function OffertePDF(props: OffertePDFProps) {
  if (props.template === "modern") return PDFModern(props);
  if (props.template === "minimal") return PDFMinimal(props);
  if (props.template === "professionell") return PDFProfessionell(props);

  const {
    profil,
    kunde,
    positionen,
    nummer,
    datum,
    gueltigBis,
    leistungsdatum,
    objekt,
    mwstSatz,
    notiz,
    rabatt,
    qrCodeDataUrl,
    qrReference,
    logoDataUrl,
    dokumentTyp = "offerte",
    currency = "CHF",
    preisMode = "exkl",
  } = props;
  const grossSubtotal = positionen.reduce((sum, p) => sum + p.menge * p.preis, 0);
  // All intermediate monetary values rounded to 2 decimals. Without this the
  // total handed to the Swiss QR-bill (generated from profil+total upstream)
  // could diverge by 1 cent from what the PDF displays — which Swiss banks
  // reject when reconciling payment against the printed amount.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const rabattBetrag = r2(
    rabatt?.aktiv
      ? rabatt.modus === "chf"
        ? rabatt.wert
        : grossSubtotal * (rabatt.wert / 100)
      : 0,
  );
  const grossNachRabatt = r2(grossSubtotal - rabattBetrag);
  const nettoNachRabatt = preisMode === "exkl"
    ? grossNachRabatt
    : r2(grossNachRabatt / (1 + mwstSatz / 100));
  const mwstBetrag = preisMode === "exkl"
    ? r2(nettoNachRabatt * (mwstSatz / 100))
    : r2(grossNachRabatt - nettoNachRabatt);
  const total = preisMode === "exkl"
    ? r2(nettoNachRabatt + mwstBetrag)
    : grossNachRabatt;
  const subtotal = grossSubtotal; // kept for compatibility

  const fmtDate = formatSwissDate;

  const datumFormatiert = fmtDate(datum);
  const gueltigBisFormatiert = gueltigBis ? fmtDate(gueltigBis) : "";

  const dachConfig = getDachConfig(profil.land);
  const { mwstTermLabel, pdfUidLabel, pdfMwstNrLabel, leistungsdatumRequired, hasQrBill: landHasQrBill } = dachConfig;
  const isCH = profil.land === "CH";

  // Per-country primary / secondary company ID shown in the PDF header.
  // DE: primary = Steuernummer, secondary = USt-IdNr. (uid_mwst)
  // AT: primary = uid_mwst (UID), secondary = Firmenbuchnummer (fn_nr)
  // CH: primary = uid_mwst (UID)
  const displayUid =
    profil.land === "DE"
      ? (profil.steuernummer || "")
      : (profil.uid_mwst || "");
  const displayMwst =
    profil.land === "AT"
      ? (profil.fn_nr || "")
      : profil.land === "DE"
        ? (profil.uid_mwst || "")
        : "";
  const pdfMwstLabel = pdfMwstNrLabel;

  const leistungsdatumFormatiert = leistungsdatum
    ? fmtDate(leistungsdatum)
    : null;
  // For DE/AT Rechnungen, Leistungsdatum is mandatory (§14 Abs. 4 Nr. 6 UStG / §11 UStG AT).
  // If not supplied, we fall back to the document date with a note.
  // Show Leistungsdatum if mandatory (DE/AT) OR if optionally provided for CH
  const showLeistungsdatum =
    dokumentTyp === "rechnung" &&
    (leistungsdatumRequired || (profil.land === "CH" && !!leistungsdatum?.trim()));

  // Kleinunternehmer / VAT-exempt: show legal notice instead of MWST lines
  const isKleinunternehmer = !!profil.kleinunternehmer;
  const kleinunternehmerHinweis = isKleinunternehmer
    ? getKleinunternehmerHinweis(profil.land)
    : null;
  // For DE/AT: fallback to invoice date with note if not provided (mandatory field, validated before PDF gen)
  // For CH: only shown when explicitly filled — no fallback needed
  const leistungsdatumDisplay = leistungsdatumFormatiert
    ? leistungsdatumFormatiert
    : leistungsdatumRequired
      ? `${datumFormatiert} (= Rechnungsdatum)`
      : datumFormatiert;

  const creditorName =
    profil.firmenname || `${profil.vorname} ${profil.nachname}`.trim();
  const creditorAddress = [
    profil.adresse,
    `${profil.plz} ${profil.ort}`.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const hasQR = landHasQrBill && !!qrCodeDataUrl;
  const typLabel = dokumentTyp === "rechnung" ? "Rechnung" : "Offerte";
  const dateEndLabel = dokumentTyp === "rechnung" ? "Zahlbar bis" : "Gültig bis";

  return (
    <Document>
      <Page
        size="A4"
        style={[
          s.page,
          hasQR ? { paddingBottom: 115 } : {},
        ]}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoDataUrl && (
              <Image src={logoDataUrl} style={s.logo} />
            )}
            <View>
              <Text style={s.firma}>{profil.firmenname}</Text>
              <Text style={s.firmaDetail}>
                {profil.vorname} {profil.nachname}
              </Text>
              {profil.adresse && (
                <Text style={s.firmaDetail}>{profil.adresse}</Text>
              )}
              {(profil.plz || profil.ort) && (
                <Text style={s.firmaDetail}>
                  {profil.plz} {profil.ort}
                </Text>
              )}
              {profil.telefon && (
                <Text style={s.firmaDetail}>{profil.telefon}</Text>
              )}
              {displayUid ? (
                <Text style={s.firmaDetail}>{pdfUidLabel}: {displayUid}</Text>
              ) : null}
              {displayMwst ? (
                <Text style={s.firmaDetail}>{pdfMwstLabel}: {displayMwst}</Text>
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.offerteTitle}>{typLabel}</Text>
            <Text style={s.offerteNr}>{nummer}</Text>
            <Text style={s.offerteNr}>Datum: {datumFormatiert}</Text>
            {gueltigBisFormatiert && (
              <Text style={s.offerteNr}>
                {dateEndLabel}: {gueltigBisFormatiert}
              </Text>
            )}
            {showLeistungsdatum && (
              <Text style={s.offerteNr}>
                Leistungsdatum: {leistungsdatumDisplay}
              </Text>
            )}
            {objekt && (
              <Text style={[s.offerteNr, { marginTop: 4, fontStyle: "italic" }]}>
                {objekt}
              </Text>
            )}
          </View>
        </View>

        {/* Kunde */}
        <View style={s.kundeBlock}>
          <Text style={s.kundeLabel}>Kunde</Text>
          {kunde.firma && <Text style={s.kundeName}>{kunde.firma}</Text>}
          {kunde.name && (
            <Text style={kunde.firma ? s.kundeDetail : s.kundeName}>
              {kunde.name}
            </Text>
          )}
          {kunde.adresse && (
            <Text style={s.kundeDetail}>{kunde.adresse}</Text>
          )}
          {kunde.adresse2 && (
            <Text style={s.kundeDetail}>{kunde.adresse2}</Text>
          )}
          {(kunde.plz || kunde.ort) && (
            <Text style={s.kundeDetail}>
              {kunde.plz} {kunde.ort}
            </Text>
          )}
        </View>

        {/* Positionen Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colBez]}>Bezeichnung</Text>
          <Text style={[s.tableHeaderText, s.colMenge]}>Menge</Text>
          <Text style={[s.tableHeaderText, s.colEinheit]}>Einheit</Text>
          <Text style={[s.tableHeaderText, s.colPreis]}>{preisMode === "exkl" ? `Preis exkl. ${mwstTermLabel}` : `Preis inkl. ${mwstTermLabel}`}</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
        </View>
        {positionen.map((pos, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.colBez}>{pos.bezeichnung}</Text>
            <Text style={s.colMenge}>
              {pos.menge % 1 === 0 ? pos.menge : pos.menge.toFixed(1)}
            </Text>
            <Text style={s.colEinheit}>{pos.einheit}</Text>
            <Text style={s.colPreis}>{formatAmount(pos.preis)}</Text>
            <Text style={s.colTotal}>
              {formatAmount(pos.menge * pos.preis)}
            </Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summaryBlock}>
          {preisMode === "exkl" ? (
            <>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal</Text>
                <Text style={s.summaryValue}>{currency} {formatAmount(subtotal)}</Text>
              </View>
              {rabatt?.aktiv && rabattBetrag > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{rabatt.label}</Text>
                  <Text style={[s.summaryValue, { color: "#22c55e" }]}>
                    −{currency} {formatAmount(rabattBetrag)}
                  </Text>
                </View>
              )}
              {isKleinunternehmer ? (
                <View style={[s.summaryRow, { marginTop: 4 }]}>
                  <Text style={[s.summaryLabel, { color: "#777", fontSize: 8, flex: 1 }]}>
                    {kleinunternehmerHinweis}
                  </Text>
                </View>
              ) : mwstSatz > 0 ? (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{mwstTermLabel} ({mwstSatz}%)</Text>
                  <Text style={s.summaryValue}>{currency} {formatAmount(mwstBetrag)}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Bruttototal</Text>
                <Text style={s.summaryValue}>{currency} {formatAmount(grossSubtotal)}</Text>
              </View>
              {rabatt?.aktiv && rabattBetrag > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{rabatt.label}</Text>
                  <Text style={[s.summaryValue, { color: "#22c55e" }]}>
                    −{currency} {formatAmount(rabattBetrag)}
                  </Text>
                </View>
              )}
              {isKleinunternehmer ? (
                <View style={[s.summaryRow, { marginTop: 4 }]}>
                  <Text style={[s.summaryLabel, { color: "#777", fontSize: 8, flex: 1 }]}>
                    {kleinunternehmerHinweis}
                  </Text>
                </View>
              ) : mwstSatz > 0 ? (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: "#999" }]}>davon {mwstTermLabel} ({mwstSatz}%)</Text>
                  <Text style={[s.summaryValue, { color: "#999" }]}>{currency} {formatAmount(mwstBetrag)}</Text>
                </View>
              ) : null}
            </>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{currency} {formatAmount(total)}</Text>
          </View>
        </View>

        {/* Notiz */}
        {notiz && (
          <View style={s.notiz}>
            <Text style={s.notizLabel}>Bemerkungen</Text>
            <Text>{notiz}</Text>
          </View>
        )}

        {/* QR-Rechnung Section */}
        {hasQR ? (
          <View style={s.qrSection}>
            {/* Empfangsschein (Receipt) */}
            <View style={s.qrReceipt}>
              <Text style={s.qrTitle}>Empfangsschein</Text>
              <Text style={s.qrSectionLabel}>Konto / Zahlbar an</Text>
              <Text style={s.qrSectionValue}>
                {formatIBAN(profil.iban)}
              </Text>
              <Text style={s.qrSectionValue}>{creditorName}</Text>
              {profil.adresse && (
                <Text style={s.qrSectionValue}>{profil.adresse}</Text>
              )}
              {(profil.plz || profil.ort) && (
                <Text style={s.qrSectionValue}>
                  {profil.plz} {profil.ort}
                </Text>
              )}
              <Text style={s.qrSectionLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
              <Text style={s.qrSectionValue}>{qrReference ?? nummer}</Text>
              <View style={s.qrAmountRow}>
                <View>
                  <Text style={s.qrSectionLabel}>Währung</Text>
                  <Text style={s.qrSectionValue}>CHF</Text>
                </View>
                <View>
                  <Text style={s.qrSectionLabel}>Betrag</Text>
                  <Text style={s.qrSectionValue}>{formatAmount(total)}</Text>
                </View>
              </View>
              <Text
                style={[
                  s.qrSectionLabel,
                  { position: "absolute", bottom: 8, right: 10 },
                ]}
              >
                Annahmestelle
              </Text>
            </View>

            {/* Zahlteil (Payment Part) */}
            <View style={s.qrPayment}>
              <View>
                <Text style={s.qrTitle}>Zahlteil</Text>
                <Image src={qrCodeDataUrl} style={s.qrImage} />
                <View style={s.qrAmountRow}>
                  <View>
                    <Text style={s.qrSectionLabel}>Währung</Text>
                    <Text style={s.qrSectionValue}>CHF</Text>
                  </View>
                  <View>
                    <Text style={s.qrSectionLabel}>Betrag</Text>
                    <Text style={s.qrSectionValue}>{formatAmount(total)}</Text>
                  </View>
                </View>
              </View>
              <View style={s.qrPaymentInfo}>
                <Text style={s.qrSectionLabel}>Konto / Zahlbar an</Text>
                <Text style={s.qrSectionValue}>
                  {formatIBAN(profil.iban)}
                </Text>
                <Text style={s.qrSectionValue}>{creditorName}</Text>
                {profil.adresse && (
                  <Text style={s.qrSectionValue}>{profil.adresse}</Text>
                )}
                {(profil.plz || profil.ort) && (
                  <Text style={s.qrSectionValue}>
                    {profil.plz} {profil.ort}
                  </Text>
                )}
                <Text style={s.qrSectionLabel}>{qrReference ? "Referenz" : "Mitteilung"}</Text>
                <Text style={s.qrSectionValue}>{qrReference ?? nummer}</Text>
              </View>
            </View>
          </View>
        ) : landHasQrBill ? (
          <View style={s.qrPlaceholderSection}>
            <Text style={s.qrPlaceholder}>
              {profil.iban
                ? `Swiss QR-Rechnung · IBAN: ${profil.iban} · Betrag: CHF ${formatAmount(total)}`
                : "IBAN in Profil hinterlegen für Swiss QR-Rechnung"}
            </Text>
          </View>
        ) : profil.iban && dokumentTyp === "rechnung" ? (
          <View style={s.qrPlaceholderSection}>
            <Text style={[s.qrSectionLabel, { marginBottom: 3 }]}>Bankverbindung</Text>
            <Text style={s.qrPlaceholder}>
              IBAN: {formatIBAN(profil.iban)}
              {profil.bic ? `  ·  BIC: ${profil.bic}` : ""}
              {"  ·  "}
              {creditorName}
            </Text>
            {/* H10: XRechnung coming-soon note for DE invoices */}
            {profil.land === "DE" && (
              <Text style={[s.qrPlaceholder, { marginTop: 4, fontSize: 8, opacity: 0.6 }]}>
                E-Rechnung (XRechnung) — demnächst verfügbar
              </Text>
            )}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}


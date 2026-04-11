import Link from "next/link";

export const metadata = {
  title:
    "Swiss QR-Rechnung 2026: Alles für Schweizer Betriebe | Offertio",
  description:
    "Was ist die Swiss QR-Rechnung, wer braucht sie, und wie erstellt man sie korrekt? Vollständiger Guide für Schweizer Kleinbetriebe 2026.",
};

export default function QRRechnungSchweizPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Swiss QR-Rechnung 2026: Der vollständige Guide für Schweizer Betriebe",
    description:
      "Was ist die Swiss QR-Rechnung, wer braucht sie, und wie erstellt man sie korrekt? Vollständiger Guide für Schweizer Kleinbetriebe 2026.",
    author: {
      "@type": "Organization",
      name: "Offertio",
      url: "https://offertio.ch",
    },
    datePublished: "2026-04-10",
    dateModified: "2026-04-10",
    image: "https://offertio.ch/og-image.jpg",
    wordCount: 750,
  };

  return (
    <div className="px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="mx-auto max-w-2xl">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center text-sm font-medium mb-8 transition-all duration-200 hover:translate-x-1"
          style={{ color: "var(--color-primary)" }}
        >
          ← Zurück zum Blog
        </Link>

        {/* Article Header */}
        <header className="mb-10 space-y-4">
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Swiss QR-Rechnung 2026: Der vollständige Guide für Schweizer Betriebe
          </h1>
          <div
            className="flex items-center gap-4 text-sm"
            style={{ color: "var(--color-text-soft)" }}
          >
            <span>10. April 2026</span>
            <span>•</span>
            <span>6 min Lesedauer</span>
          </div>
        </header>

        {/* Article Content */}
        <article
          className="prose prose-invert max-w-none space-y-6"
          style={{ color: "var(--color-text)" }}
        >
          {/* Was ist die Swiss QR-Rechnung? */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Was ist die Swiss QR-Rechnung?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Die Swiss QR-Rechnung ist ein standardisiertes Rechnungsformat, das
              seit dem 1. Januar 2023 verbindlich in der Schweiz ist. Sie ersetzt
              die bisherigen orange und roten Zahlungsslips (ESR/OCRB-Slips) durch
              einen QR-Code, der alle wichtigen Zahlungsinformationen enthält.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Der QR-Code ist maschinenlesbar und enthält die kompletten
              Zahlungsdetails. Zahlungsempfänger können Rechnungen damit viel
              schneller und fehlerloser verarbeiten – eine Win-Win-Situation für
              Betriebe und deren Kundinnen und Kunden.
            </p>
          </section>

          {/* Wer ist betroffen? */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Wer ist betroffen?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Alle Schweizer Betriebe, die Rechnungen in CHF ausstellen, sind
              betroffen – egal ob Einzelunternehmen, KMU, Handwerker oder
              Dienstleistungsbetrieb. Die Umstellung auf QR-Rechnungen ist keine
              Option, sondern Pflicht.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Das gilt auch für Betriebe mit kleinen Rechnungsmengen. Wer bereits
              eine Rechnungssoftware nutzt, die QR-Rechnungen unterstützt, ist
              damit schnell auf den aktuellen Stand gebracht.
            </p>
          </section>

          {/* Pflichtangaben der QR-Rechnung */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Pflichtangaben der QR-Rechnung
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Eine konforme QR-Rechnung muss folgende Pflichtangaben enthalten:
            </p>
            <ul className="space-y-2 pl-5">
              {[
                "IBAN des Rechnungsempfängers (mit CH- oder Liechtenstein-Präfix)",
                "Exakter Rechnungsbetrag in CHF",
                "Name und Adresse des Rechnungsempfängers",
                "Name und Adresse des Rechnungsstellers (optional, aber empfohlen)",
                "Referenznummer (QR-Referenz oder Kreditor-Referenz-Nr.)",
                "Zahlungszweck / Rechnungsnummer",
              ].map((item) => (
                <li
                  key={item}
                  className="text-base leading-7"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  • {item}
                </li>
              ))}
            </ul>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Kleine Fehler können dazu führen, dass der QR-Code nicht
              eingelesen wird. Deshalb ist es wichtig, dass alle Daten korrekt
              und vollständig sind.
            </p>
          </section>

          {/* Wie erstellt man eine konforme QR-Rechnung? */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Wie erstellt man eine konforme QR-Rechnung?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Für Betriebe, die noch eine Rechnungslösung suchen, gibt es mehrere
              Optionen: Spezialisierte QR-Rechnungsgeneratoren online, Excel- oder
              Word-Vorlagen mit QR-Code-Plugin, oder – am sichersten und
              einfachsten – eine moderne Rechnungssoftware.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Mit <strong>Offertio</strong> erstellen Sie automatisch konforme
              QR-Rechnungen. Alle Pflichtangaben werden direkt aus Ihren
              Unternehmensangaben und der Rechnungsvorlage generiert – Fehler
              ausgeschlossen. Sie können Ihre Rechnungen direkt aus der App oder
              vom Handy aus versenden.
            </p>
          </section>

          {/* Häufige Fehler und wie man sie vermeidet */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Häufige Fehler und wie man sie vermeidet
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              <strong>1. Falsche IBAN Format:</strong> Die IBAN muss mit «CH» oder
              «LI» beginnen und genau 21 Zeichen lang sein. Ein verbreiteter Fehler
              ist, Leerzeichen in der IBAN zu vergessen.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              <strong>2. Fehlende oder ungültige Referenznummer:</strong> Nutzen Sie
              entweder eine QR-Referenz (27 Ziffern) oder ignorieren Sie das Feld.
              Ein Mix aus beiden führt zu Fehlern.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              <strong>3. Dezimaltrennzeichen:</strong> Nutzen Sie bei Frankenbeträgen
              immer einen Punkt (z.B. 1000.50) oder kein Trennzeichen
              (100050), nicht ein Komma.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              <strong>4. Zu kleine oder zu große QR-Codes:</strong> Der QR-Code sollte
              mindestens 46 × 46 mm groß sein, damit er zuverlässig eingelesen wird.
            </p>
          </section>

          {/* CTA Section */}
          <section className="space-y-6 rounded-2xl p-6 sm:p-8 mt-10" style={{
            background: "rgba(200,121,61,0.05)",
            border: "1px solid rgba(200,121,61,0.15)",
          }}>
            <div className="space-y-3">
              <h3
                className="text-xl font-bold"
                style={{ color: "var(--color-text)" }}
              >
                Jetzt professionelle QR-Rechnungen erstellen
              </h3>
              <p
                className="text-base leading-7"
                style={{ color: "var(--color-text-muted)" }}
              >
                Mit Offertio erstellen Sie automatisch konforme QR-Rechnungen,
                ZUGFeRD und E-Rechnungen. Keine Fehler, keine manuellen Schritte.
              </p>
            </div>
            <Link
              href="/#preise"
              className="inline-flex px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Kostenlos starten
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}

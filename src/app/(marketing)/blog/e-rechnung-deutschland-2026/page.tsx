import Link from "next/link";

export const metadata = {
  title:
    "E-Rechnung Pflicht Deutschland 2025/2026: Was gilt für Kleinunternehmer? | Offertio",
  description:
    "Ab 2025 gilt in Deutschland die E-Rechnungspflicht im B2B. Was bedeutet das für Kleinunternehmer und Selbstständige? Alle Fakten und Fristen.",
};

export default function ERechnungDeutschlandPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "E-Rechnung Pflicht Deutschland 2026: Was müssen Kleinunternehmer wissen?",
    description:
      "Ab 2025 gilt in Deutschland die E-Rechnungspflicht im B2B. Was bedeutet das für Kleinunternehmer und Selbstständige? Alle Fakten und Fristen.",
    author: {
      "@type": "Organization",
      name: "Offertio",
      url: "https://offertio.ch",
    },
    datePublished: "2026-04-09",
    dateModified: "2026-04-09",
    image: "https://offertio.ch/og-image.jpg",
    wordCount: 800,
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
            E-Rechnung Pflicht Deutschland 2026: Was müssen Kleinunternehmer
            wissen?
          </h1>
          <div
            className="flex items-center gap-4 text-sm"
            style={{ color: "var(--color-text-soft)" }}
          >
            <span>9. April 2026</span>
            <span>•</span>
            <span>7 min Lesedauer</span>
          </div>
        </header>

        {/* Article Content */}
        <article
          className="prose prose-invert max-w-none space-y-6"
          style={{ color: "var(--color-text)" }}
        >
          {/* Was ist eine E-Rechnung? */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Was ist eine E-Rechnung?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Eine E-Rechnung ist nicht einfach nur eine Rechnung im PDF-Format,
              die per E-Mail verschickt wird. Eine echte E-Rechnung ist ein
              strukturiertes Datenformat mit Informationen in XML-Struktur – quasi
              ein maschinenlesbarer Rechnungsbeleg, den Systeme direkt verarbeiten
              können.
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Der große Vorteil: Rechnungsprozesse können automatisiert werden,
              Fehler beim Auslesen und Erfassen entstehen nicht mehr, und die
              Verarbeitung wird deutlich schneller. Das spart beiden Seiten Zeit
              und Kosten.
            </p>
          </section>

          {/* Die gesetzliche Pflicht */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Die gesetzliche Pflicht: Wer ist ab wann betroffen?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Die E-Rechnungspflicht in Deutschland ist gestaffelt und betrifft
              unterschiedliche Unternehmensgrößen zu unterschiedlichen Zeitpunkten:
            </p>
            <ul className="space-y-2 pl-5">
              {[
                "B2B Empfangspflicht: Ab 27. November 2024 müssen alle Unternehmen elektronische Rechnungen empfangen und verarbeiten können.",
                "Ausstellungspflicht Großunternehmen: Ab 1. Januar 2025 müssen Großunternehmen (≥ 250 Mitarbeiter) E-Rechnungen ausstellen.",
                "Ausstellungspflicht KMU: Ab 1. Januar 2027 trifft die Ausstellungspflicht auch KMU und Kleinunternehmen.",
              ].map((item, idx) => (
                <li
                  key={idx}
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
              Das heißt konkret für Sie: Schon seit November 2024 sollte Ihr System
              E-Rechnungen verarbeiten können. Wenn Sie ein Kleinunternehmen sind,
              haben Sie bis spätestens Ende 2026 Zeit, auf E-Rechnungen umzustellen.
            </p>
          </section>

          {/* ZUGFeRD vs. XRechnung */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              ZUGFeRD vs. XRechnung – Was ist der Unterschied?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Bei der deutschen E-Rechnungspflicht tauchen zwei Formate auf:
            </p>
            <p
              className="text-base leading-7 font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              ZUGFeRD (Zentraler User Guide des Forums Elektronische Rechnung Deutschland)
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              ZUGFeRD ist ein hybrides Format: Die Rechnung ist weiterhin im PDF
              sichtbar (für Menschen), enthält aber zusätzlich die strukturierten
              Daten als XML-Datei eingebettet. Das macht es besonders praktisch für
              B2B-Rechnungen zwischen Privatunternehmen. Aktuell ist ZUGFeRD 2.3.2
              der Standard.
            </p>
            <p
              className="text-base leading-7 font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              XRechnung
            </p>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              XRechnung ist ein reines XML-Format ohne Humanlesbarkeit. Es wird
              hauptsächlich für Rechnungen an Behörden und öffentliche Auftraggeber
              verwendet. Für Kleinunternehmen ist ZUGFeRD die praktischere Lösung.
            </p>
          </section>

          {/* Was bedeutet das in der Praxis? */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Was bedeutet das für Selbstständige und Kleinunternehmer?
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Konkret sollten Sie folgende Schritte planen:
            </p>
            <ul className="space-y-3 pl-5">
              {[
                "System prüfen: Kontrollieren Sie, ob Ihre aktuelle Rechnungssoftware oder Buchhaltung E-Rechnungen (insbesondere ZUGFeRD) verarbeiten kann.",
                "Auf Nachrichten reagieren: Wenn wichtige Geschäftspartner E-Rechnungen von Ihnen fordern, sollten Sie reagieren und Ihre Lösung entsprechend anpassen.",
                "Migration planen: Bis spätestens Ende 2026 sollten Sie interne Prozesse umgestellt haben, um E-Rechnungen zu versenden.",
                "Software auswählen: Eine moderne Rechnungssoftware sollte ZUGFeRD 2.3.2 aus dem Kasten unterstützen.",
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="text-base leading-7"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  • {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Wie Offertio ZUGFeRD erstellt */}
          <section className="space-y-4">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Wie Offertio ZUGFeRD 2.3.2 automatisch erstellt
            </h2>
            <p
              className="text-base leading-7"
              style={{ color: "var(--color-text-muted)" }}
            >
              Mit <strong>Offertio</strong> können Sie mühelos konforme
              ZUGFeRD-Rechnungen erstellen. Die Software generiert automatisch:
            </p>
            <ul className="space-y-2 pl-5">
              {[
                "Hybrid-PDFs mit eingebettetem XML nach ZUGFeRD 2.3.2 Standard",
                "Korrekte Datenstruktur und Formatierung ohne manuelle Schritte",
                "Versand direkt aus der App – digital und effizient",
                "Zusätzlich: QR-Rechnungen für die Schweiz und E-Rechnungen mit allen erforderlichen Metadaten",
              ].map((item, idx) => (
                <li
                  key={idx}
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
              Sie können sich entspannt zurücklehnen – Compliance und Standardkonformität
              sind damit sichergestellt.
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
                Jetzt E-Rechnung-konform werden
              </h3>
              <p
                className="text-base leading-7"
                style={{ color: "var(--color-text-muted)" }}
              >
                Mit Offertio erstellen Sie automatisch konforme ZUGFeRD 2.3.2-Rechnungen
                für Deutschland, QR-Rechnungen für die Schweiz und E-Rechnungen für
                Österreich. Alles aus einer Lösung, ohne Fehler.
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

import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offerte Vorlage Schweiz 2026: Was gehört rein & kostenlose Vorlage | Offertio",
  description:
    "Was gehört in eine Schweizer Offerte? Pflichtangaben, Aufbau, Beispiel und eine kostenlose digitale Vorlage — direkt im Browser, ohne Word oder Excel.",
  alternates: {
    canonical: "https://offertio.io/blog/offerte-vorlage-schweiz",
  },
};

export default function OfferteVorlagePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Offerte Vorlage Schweiz 2026: Aufbau, Pflichtangaben und kostenlose Vorlage",
    description:
      "Was gehört in eine Schweizer Offerte? Gesetzliche Pflichtangaben, korrekter Aufbau und eine kostenlose digitale Vorlage für Kleinbetriebe.",
    author: {
      "@type": "Organization",
      name: "Offertio",
      url: "https://offertio.io",
    },
    datePublished: "2026-04-15",
    dateModified: "2026-04-15",
    wordCount: 1050,
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
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
          >
            Schweiz · Offerten
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Offerte Vorlage Schweiz: Was gehört rein — und wie du sie in zwei Minuten erstellst
          </h1>
          <div
            className="flex items-center gap-4 text-sm"
            style={{ color: "var(--color-text-soft)" }}
          >
            <span>15. April 2026</span>
            <span>•</span>
            <span>5 min Lesedauer</span>
          </div>
          <p className="text-lg leading-7" style={{ color: "var(--color-text-muted)" }}>
            Eine sauber aufgebaute Offerte ist der erste Schritt zum Auftrag.
            Dieser Guide zeigt, welche Angaben in der Schweiz zwingend sind,
            wie eine Offerte aufgebaut sein sollte — und wie du ohne Word-Vorlage
            professionelle Offerten erstellst.
          </p>
        </header>

        {/* Article Body */}
        <article className="prose-offertio space-y-10" style={{ color: "var(--color-text)" }}>

          {/* Inhaltsverzeichnis */}
          <nav
            className="rounded-xl p-6"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-soft)" }}>
              Inhalt
            </p>
            <ol className="space-y-1 text-sm" style={{ color: "var(--color-primary)" }}>
              {[
                "Was ist eine Offerte überhaupt?",
                "Pflichtangaben auf einer Schweizer Offerte",
                "Empfohlener Aufbau",
                "Häufige Fehler bei Offerten",
                "Offerte Vorlage kostenlos — digital statt Word",
              ].map((item, i) => (
                <li key={i}>
                  <span style={{ color: "var(--color-text-soft)" }}>{i + 1}. </span>
                  {item}
                </li>
              ))}
            </ol>
          </nav>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              1. Was ist eine Offerte überhaupt?
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Eine Offerte (auch Angebot, Kostenvoranschlag oder Angebotsofferte) ist ein{" "}
              <strong style={{ color: "var(--color-text)" }}>rechtlich verbindlicher Antrag</strong>{" "}
              zum Abschluss eines Vertrags. In der Schweiz gilt: Wer eine Offerte stellt,
              ist daran gebunden — sofern sie die wesentlichen Vertragspunkte enthält
              (Art. 3 OR).
            </p>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Im Alltag bedeutet das: Dein Kunde sagt «Ja» zur Offerte — du hast einen
              Auftrag. Ohne weitere Verhandlung, ohne Nachverhandlung. Deshalb lohnt es sich,
              eine Offerte sauber und vollständig zu erstellen.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              2. Pflichtangaben auf einer Schweizer Offerte
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Das Schweizer Recht schreibt keine Mindestform für eine Offerte vor —
              aber um rechtssicher und professionell zu wirken, sollten folgende
              Angaben immer drauf sein:
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "Name & Adresse des Anbieters",
                  note: "Dein Firmenname, Strasse, PLZ, Ort — für Privatpersonen dein vollständiger Name",
                },
                {
                  label: "Name & Adresse des Kunden",
                  note: "An wen richtet sich das Angebot?",
                },
                {
                  label: "Datum der Offerte",
                  note: "Wann wurde das Angebot erstellt?",
                },
                {
                  label: "Offertennummer",
                  note: "Wichtig für Buchhaltung und spätere Referenz auf der Rechnung",
                },
                {
                  label: "Gültigkeitsdatum",
                  note: "Bis wann ist das Angebot gültig? Üblich: 30 bis 60 Tage",
                },
                {
                  label: "Beschreibung der Leistungen",
                  note: "Was genau wird gemacht? Je konkreter, desto weniger Diskussion später",
                },
                {
                  label: "Positionen mit Menge, Einheit und Preis",
                  note: "z.B. «Malerarbeiten Wohnzimmer, 45 m², CHF 12.00/m²»",
                },
                {
                  label: "MwSt-Angabe (falls steuerpflichtig)",
                  note: "MwSt-Satz und Betrag, oder Hinweis auf Befreiung",
                },
                {
                  label: "Gesamtbetrag",
                  note: "Klar sichtbar, in CHF",
                },
                {
                  label: "Zahlungsbedingungen",
                  note: "Anzahlung? Zahlungsfrist nach Auftragsabschluss?",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 flex gap-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span
                    className="shrink-0 w-5 h-5 mt-0.5 rounded text-xs flex items-center justify-center font-bold"
                    style={{ background: "rgba(200,121,61,0.15)", color: "var(--color-primary)" }}
                  >
                    ✓
                  </span>
                  <div>
                    <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>{item.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              3. Empfohlener Aufbau einer Offerte
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Eine professionelle Offerte folgt einer klaren Struktur. So weiss der Kunde
              sofort, wo er was findet:
            </p>
            <ol className="space-y-4">
              {[
                {
                  step: "Kopfzeile",
                  desc: "Dein Logo links, Firmenname und Adresse rechts. Daneben Datum und Offertennummer.",
                },
                {
                  step: "Empfänger",
                  desc: "Vollständiger Name und Adresse des Kunden, gegebenenfalls mit Referenzperson.",
                },
                {
                  step: "Titel und Betreff",
                  desc: "«Offerte für Malerarbeiten Mehrfamilienhaus Musterstrasse 5» — konkret, nicht generisch.",
                },
                {
                  step: "Positionsliste",
                  desc: "Jede Leistung als eigene Zeile: Beschreibung | Menge | Einheit | Stückpreis | Total.",
                },
                {
                  step: "Subtotal, Rabatt, MwSt, Gesamttotal",
                  desc: "Klare Trennung der Posten, damit der Kunde die Preise nachvollziehen kann.",
                },
                {
                  step: "Bedingungen & Gültigkeit",
                  desc: "«Diese Offerte ist gültig bis [Datum]. Zahlbar innert 30 Tagen nach Auftragsabschluss.»",
                },
                {
                  step: "Unterschrift / Akzeptanz-Zeile",
                  desc: "Optional: Eine Zeile «Akzeptiert am ___ Unterschrift ___» macht die Annahme dokumentierbar.",
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: "rgba(200,121,61,0.12)", color: "var(--color-primary)" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{item.step}</p>
                    <p className="text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              4. Häufige Fehler bei Schweizer Offerten
            </h2>
            <div className="space-y-3">
              {[
                {
                  fehler: "Kein Gültigkeitsdatum",
                  folge: "Der Kunde kommt Monate später und besteht auf den alten Preis. Ohne Frist bist du daran gebunden.",
                },
                {
                  fehler: "Pauschalpreis ohne Leistungsbeschreibung",
                  folge: "«Malerarbeiten CHF 2 800» — und dann Streit darüber, was alles drin ist.",
                },
                {
                  fehler: "MwSt nicht korrekt ausgewiesen",
                  folge: "Entweder zu Unrecht ausgewiesen (du schuldest sie trotzdem) oder vergessen (Kunde macht Probleme).",
                },
                {
                  fehler: "Falsche oder fehlende Offertennummer",
                  folge: "Chaos in der Buchhaltung und bei der Rechnungsstellung.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{
                    background: "rgba(255, 80, 80, 0.04)",
                    border: "1px solid rgba(255, 80, 80, 0.10)",
                  }}
                >
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--color-text)" }}>
                    ✗ {item.fehler}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{item.folge}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              5. Offerte Vorlage kostenlos — digital statt Word
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Word-Vorlagen haben ein Problem: Du musst jedes Mal alles manuell
              anpassen, PDF exportieren, per E-Mail senden und hoffen, dass die
              Formatierung beim Kunden stimmt.
            </p>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Offertio ist eine kostenlose digitale Offerten-Vorlage direkt im Browser:
            </p>
            <ul className="space-y-3">
              {[
                "Kundendaten einmal erfassen — beim nächsten Mal automatisch vorgeschlagen",
                "Positionslisten als Vorlagen speichern (Stunden, m², Pauschal — beliebig kombinierbar)",
                "Swiss QR-Rechnung automatisch generiert (QR-IBAN + Referenz nach ISO 20022)",
                "PDF per WhatsApp oder E-Mail versenden — direkt aus der App",
                "Eigenes Logo und Branding auf jeder Offerte",
                "Kostenlos für bis zu 5 Dokumente pro Monat",
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Kein Download, keine Installation. Du kannst Offertio als PWA auf
              dem Homescreen speichern und wie eine App nutzen — auf iOS, Android und Desktop.
            </p>
          </section>

          {/* CTA */}
          <section
            className="rounded-2xl p-8 text-center space-y-4 mt-12"
            style={{
              background: "rgba(200,121,61,0.05)",
              border: "1px solid rgba(200,121,61,0.12)",
            }}
          >
            <h3 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              Kostenlose Offerte Vorlage — sofort loslegen
            </h3>
            <p className="text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Kein Word, kein Excel, keine Installation. Offerte in 2 Minuten,
              per WhatsApp versenden, Swiss QR-Rechnung inklusive.
            </p>
            <Link
              href="/login"
              className="inline-flex px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Jetzt kostenlos starten
            </Link>
            <p className="text-xs" style={{ color: "var(--color-text-soft)" }}>
              Keine Kreditkarte · Kein Ablaufdatum des Free-Plans
            </p>
          </section>

          {/* Related Posts */}
          <section className="space-y-4 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Weitere Artikel
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  href: "/blog/qr-rechnung-schweiz-2026",
                  title: "Swiss QR-Rechnung 2026: Der vollständige Guide",
                  time: "6 min",
                },
                {
                  href: "/blog/rechnung-ohne-mwst-schweiz",
                  title: "Rechnung ohne MwSt: Was Kleinunternehmer wissen müssen",
                  time: "5 min",
                },
              ].map((post) => (
                <Link
                  key={post.href}
                  href={post.href}
                  className="rounded-xl p-4 block transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
                    {post.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-soft)" }}>
                    {post.time} Lesedauer
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { motion } from "framer-motion";

export const metadata: Metadata = {
  title:
    "Offertensoftware für Handwerker – Offerten & Rechnungen vom Handy | Offertio",
  description:
    "Offertio ist die Offertensoftware für Handwerker in CH, DE und AT. Angebot und Rechnung in 60 Sekunden erstellen – direkt vom Handy auf der Baustelle.",
  alternates: {
    canonical: "https://offertio.io/branchen/handwerker",
  },
};

const trades = [
  "Elektriker",
  "Maler",
  "Sanitär",
  "Schreiner",
  "Gartenbau",
  "Reinigung",
];

export default function HandwerkerPage() {
  return (
    <div className="px-4 sm:px-6 pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Offertensoftware für Handwerker",
            description:
              "Mobile-first Offertensoftware für Handwerker in der Schweiz, Deutschland und Österreich. Erstelle Offerten und Rechnungen in 60 Sekunden direkt vom Handy.",
            provider: {
              "@type": "Organization",
              name: "Offertio",
              url: "https://offertio.io",
              logo: "https://offertio.io/icon-192.svg",
            },
            areaServed: ["CH", "DE", "AT"],
            serviceType:
              "InvoicingApplication, OfferManagementSoftware",
          }),
        }}
      />

      <div className="mx-auto max-w-4xl space-y-24">
        {/* Hero */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              Offertensoftware für Handwerker:{" "}
              <span style={{ color: "var(--color-primary)" }}>
                Angebot und Rechnung in 60 Sekunden
              </span>
            </h1>
            <p
              className="text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              Erstelle Offerten und Rechnungen direkt vom Handy auf der
              Baustelle – ohne Umweg ins Büro. Professional und in wenigen
              Klicks.
            </p>
          </div>
          <div>
            <Link
              href="/#preise"
              className="inline-flex px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
              style={{ background: "var(--color-primary)" }}
            >
              Kostenlos starten – kein Kreditkarte nötig
            </Link>
          </div>
        </section>

        {/* Pain Points */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Die Handwerker-Herausforderung
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
            {[
              {
                title: "Du vergisst zu rechnen",
                description:
                  "Nach dem Einsatz: nächste Baustelle, nächster Job. Die Rechnung schreibst du dann abends im Büro – wenn dir einfällt, dass du vergessen hast.",
              },
              {
                title: "Kunde fragt spontan nach der Offerte",
                description:
                  "Du stehst auf einer Leiter, Kunde fragt, was es kostet. Du kannst nicht spontan eine saubere Offerte zeigen.",
              },
              {
                title: "Papierformulare gehen verloren",
                description:
                  "Notizenblöcke und Preislisten in der Hosentasche – bis sie irgendwann weg sind oder zerrissen.",
              },
            ].map((pain, idx) => (
              <div
                key={idx}
                className="rounded-xl p-6 sm:p-8"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: "var(--color-primary)" }}
                >
                  {pain.title}
                </h3>
                <p style={{ color: "var(--color-text-muted)" }}>
                  {pain.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features for Handwerker */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Offertio für Handwerker
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Offerte direkt vom Handy",
                description:
                  "Auf der Baustelle, vor dem Kunden. Offerte erstellen, ausdrucken oder per Mail verschicken – alles vom Smartphone aus.",
              },
              {
                title: "Swiss QR-Rechnung automatisch",
                description:
                  "Erstelle eine Rechnung – die QR-Rechnung wird automatisch eingefügt. Scan-ready für deine Kunden.",
              },
              {
                title: "Dein Logo, deine Farben",
                description:
                  "Offerte und Rechnung sehen professionell aus und repräsentieren dein Handwerk. Mit deinem Logo und deinen Farben.",
              },
              {
                title: "Unterschrift & PDF per Mail",
                description:
                  "Kunde unterschreibt auf deinem Handy, PDF wird automatisch per Mail verschickt. In weniger als einer Minute.",
              },
              {
                title: "Auch offline nutzbar",
                description:
                  "Kein Internet auf der Baustelle? Kein Problem. Offertio funktioniert auch offline und synchronisiert später automatisch.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-lg p-4 sm:p-6 border-l-4"
                style={{
                  borderColor: "var(--color-primary)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <h3
                  className="font-bold text-base sm:text-lg mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm sm:text-base"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Trades */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Handwerker in der Schweiz, Deutschland und Österreich
          </h2>
          <div className="flex flex-wrap gap-3">
            {trades.map((trade) => (
              <span
                key={trade}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  background: "rgba(200, 121, 61, 0.10)",
                  color: "var(--color-primary)",
                  border: "1px solid rgba(200, 121, 61, 0.20)",
                }}
              >
                {trade}
              </span>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Preise
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div
              className="rounded-xl p-8"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--color-primary)" }}
              >
                KOSTENLOS
              </div>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--color-text)" }}
              >
                CHF 0
                <span
                  className="text-base font-normal ml-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  /Monat
                </span>
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--color-text-muted)" }}
              >
                10 Dokumente pro Monat. Zum Reinschnuppern.
              </p>
              <ul
                className="space-y-2 text-sm mb-6"
                style={{ color: "var(--color-text)" }}
              >
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Offerten & Rechnungen
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  PDF-Export
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Grundlayout
                </li>
              </ul>
              <Link
                href="/#preise"
                className="inline-block px-4 py-2 rounded-lg font-medium transition-all duration-200 w-full text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--color-text)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Kostenlos starten
              </Link>
            </div>

            <div
              className="rounded-xl p-8"
              style={{
                background: "rgba(200, 121, 61, 0.04)",
                border: "1px solid rgba(200, 121, 61, 0.16)",
              }}
            >
              <div
                className="text-sm font-semibold mb-4 inline-block px-3 py-1 rounded-md"
                style={{
                  background: "var(--color-primary)",
                  color: "white",
                }}
              >
                PRO
              </div>
              <h3
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--color-text)" }}
              >
                CHF 20
                <span
                  className="text-base font-normal ml-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  /Monat
                </span>
              </h3>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--color-text-muted)" }}
              >
                Unbegrenzte Dokumente. Für wachsende Betriebe.
              </p>
              <ul
                className="space-y-2 text-sm mb-6"
                style={{ color: "var(--color-text)" }}
              >
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Unbegrenzte Dokumente
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Swiss QR-Rechnung
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Eigenes Logo & Farben
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  Offline-Modus
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  E-Mail & PDF Versand
                </li>
              </ul>
              <Link
                href="/#preise"
                className="inline-block px-4 py-2 rounded-lg font-medium transition-all duration-200 w-full text-center text-white"
                style={{ background: "var(--color-primary)" }}
              >
                Pro freischalten
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="rounded-xl p-8 sm:p-10" style={{
          background: "rgba(200, 121, 61, 0.05)",
          border: "1px solid rgba(200, 121, 61, 0.12)",
        }}>
          <blockquote className="space-y-4">
            <p
              className="text-lg sm:text-xl font-medium italic leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              "Ich erstelle Offerten jetzt auf dem Handy, bevor ich vom Kunden
              wegfahre. Spart mir eine Stunde pro Tag. Nicht das System muss
              sich meiner Arbeit anpassen – ich passe mich nicht mehr dem System
              an."
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              Hans R., Elektriker, Zürich
            </p>
          </blockquote>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Bereit zum Ausprobieren?
          </h2>
          <p
            className="text-lg"
            style={{ color: "var(--color-text-muted)" }}
          >
            Kostenlos starten, keine Kreditkarte nötig.
          </p>
          <div className="pt-4">
            <Link
              href="/#preise"
              className="inline-flex px-8 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
              style={{ background: "var(--color-primary)" }}
            >
              Zu den Preisen
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rechnungssoftware für Gärtner & Landschaftsbau – Offerten vom Handy | Offertio",
  description:
    "Offertio ist die Rechnungssoftware für Gärtner und Landschaftsgärtner in CH, DE und AT. Offerte und Rechnung in 60 Sekunden – direkt beim Kunden im Garten.",
  alternates: {
    canonical: "https://offertio.io/branchen/gaertner",
  },
};

export default function GaertnerPage() {
  return (
    <div className="px-4 sm:px-6 pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Rechnungssoftware für Gärtner & Landschaftsbau",
            description:
              "Mobile-first Offerten- und Rechnungssoftware für Gärtner und Landschaftsgärtner in der Schweiz, Deutschland und Österreich.",
            provider: {
              "@type": "Organization",
              name: "Offertio",
              url: "https://offertio.io",
              logo: "https://offertio.io/icon-192.svg",
            },
            areaServed: ["CH", "DE", "AT"],
            serviceType: "InvoicingApplication, OfferManagementSoftware",
          }),
        }}
      />

      <div className="mx-auto max-w-4xl space-y-24">
        {/* Hero */}
        <section className="space-y-8">
          <div className="space-y-4">
            <div
              className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2"
              style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
            >
              Für Gärtner & Landschaftsbau
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              Rechnungssoftware für Gärtner:{" "}
              <span style={{ color: "var(--color-primary)" }}>
                Offerte im Garten erstellen, nicht abends am Schreibtisch
              </span>
            </h1>
            <p
              className="text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              Von der Gartenbesichtigung zur fertigen Offerte in zwei Minuten.
              Swiss QR-Rechnung, eigenes Logo und WhatsApp-Versand — alles vom
              Handy, überall wo du arbeitest.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              14 Tage gratis testen
            </Link>
            <Link
              href="/#preise"
              className="inline-flex px-6 py-3 rounded-lg font-medium transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--color-text)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Preise ansehen
            </Link>
          </div>
        </section>

        {/* Pain Points */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Was Gärtner täglich ausbremst
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Saisonhektik frisst die Bürzeit",
                description:
                  "Im Frühjahr läuft das Geschäft auf Hochtouren. Für Offerten und Rechnungen bleibt keine Zeit — und am Ende der Saison stapeln sich unbezahlte Arbeiten.",
              },
              {
                title: "Wiederkehrende Aufträge manuell tippen",
                description:
                  "Rasenpflege, Heckenschnitt, Saisonbepflanzung — dieselben Positionen immer wieder von Hand. Fehleranfällig und zeitraubend.",
              },
              {
                title: "Offerte zu spät — Auftrag weg",
                description:
                  "Kunden holen mehrere Angebote ein. Wer als Zweiter kommt, verliert. Die handschriftliche Notiz vom Besuch wird zur Nachtarbeit.",
              },
            ].map((pain, idx) => (
              <div
                key={idx}
                className="rounded-xl p-6"
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
                <p style={{ color: "var(--color-text-muted)" }} className="text-sm leading-6">
                  {pain.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="space-y-8">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Offertio für Gärtner & Landschaftsbau
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Offerte direkt nach der Gartenbesichtigung",
                description:
                  "Besichtige den Garten, erfasse Positionen in Offertio, sende die Offerte per WhatsApp — bevor du das Grundstück verlässt. Kein Papier, kein Nachtrag.",
              },
              {
                title: "Wiederverwendbare Positionen",
                description:
                  "Speichere typische Positionen (Rasenmähen pro m², Heckenschnitt pro Laufmeter, Saisonbepflanzung pauschal) als Vorlagen. Nächste Offerte: ein Tap.",
              },
              {
                title: "Stunden- und Pauschalpreise kombinieren",
                description:
                  "Manche Arbeiten rechnen sich per Stunde, andere pauschal. Offertio unterstützt beides flexibel in einer Offerte.",
              },
              {
                title: "Swiss QR-Rechnung für Schweizer Kunden",
                description:
                  "QR-Code nach ISO 20022 mit QR-IBAN wird automatisch ins PDF eingebettet. Deine Kunden zahlen per Scan im E-Banking.",
              },
              {
                title: "Funktioniert auch ohne Internet",
                description:
                  "Im Garten ohne WLAN? Kein Problem. Offertio als PWA funktioniert offline und synchronisiert, sobald du wieder verbunden bist.",
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

        {/* DACH */}
        <section
          className="rounded-xl p-8"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h2
            className="text-2xl sm:text-3xl font-bold mb-6"
            style={{ color: "var(--color-text)" }}
          >
            Für Gärtner in der Schweiz, Deutschland und Österreich
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                flag: "🇨🇭",
                land: "Schweiz",
                detail: "QR-Rechnung nach ISO 20022, QR-IBAN, Kleinunternehmer-Modus",
              },
              {
                flag: "🇩🇪",
                land: "Deutschland",
                detail: "ZUGFeRD 2.3 BASIC / Factur-X, E-Rechnungspflicht ab 2025",
              },
              {
                flag: "🇦🇹",
                land: "Österreich",
                detail: "§11 öUStG, UID-Schwellen €400/€10.000 automatisch gesetzt",
              },
            ].map((c) => (
              <div key={c.land} className="space-y-1">
                <div className="text-2xl">{c.flag}</div>
                <div className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {c.land}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {c.detail}
                </div>
              </div>
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
              <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-soft)" }}>
                Gratis
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-text)" }}>
                CHF 0 <span className="text-base font-normal" style={{ color: "var(--color-text-muted)" }}>/Monat</span>
              </div>
              <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                5 Dokumente pro Monat — zum Reinschnuppern.
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: "var(--color-text)" }}>
                {["Offerten & Rechnungen", "PDF-Export", "Swiss QR-Rechnung"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span style={{ color: "var(--color-primary)" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2.5 rounded-lg font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--color-text)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Kostenlos starten
              </Link>
            </div>

            <div
              className="rounded-xl p-8"
              style={{
                background: "rgba(200,121,61,0.04)",
                border: "1px solid rgba(200,121,61,0.16)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-4 inline-block px-2 py-0.5 rounded" style={{ background: "var(--color-primary)", color: "white" }}>
                Pro
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-primary)" }}>
                CHF 20 <span className="text-base font-normal" style={{ color: "var(--color-text-muted)" }}>/Monat</span>
              </div>
              <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                Unbegrenzte Dokumente, 14 Tage gratis testen.
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: "var(--color-text)" }}>
                {["Alles aus Free — unbegrenzt", "Eigenes Logo & Branding", "E-Mail-Versand", "Vorlagen-Bibliothek", "Offline-Modus (PWA)"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span style={{ color: "var(--color-primary)" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?plan=pro"
                className="block w-full text-center px-4 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{ background: "var(--color-primary)" }}
              >
                14 Tage gratis testen
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section
          className="rounded-xl p-8 sm:p-10"
          style={{
            background: "rgba(200,121,61,0.05)",
            border: "1px solid rgba(200,121,61,0.12)",
          }}
        >
          <blockquote className="space-y-4">
            <p
              className="text-lg sm:text-xl font-medium italic leading-relaxed"
              style={{ color: "var(--color-text)" }}
            >
              "Im Frühling kommt Auftrag auf Auftrag. Früher stapelten sich
              die Zettel und am Monatsende wusste ich nicht mehr, was ich schon
              abgerechnet hatte. Mit Offertio ist alles sofort erfasst — und
              bezahlt wird schneller."
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              Stefan B., Gartengestaltung & Unterhalt, Bern
            </p>
          </blockquote>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Jetzt kostenlos starten
          </h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            Keine Kreditkarte. Keine Installation. 14 Tage alle Pro-Funktionen.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex px-8 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Gratis loslegen
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

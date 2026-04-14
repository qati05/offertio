import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rechnungsprogramm für Maler & Lackierer – Offerten vom Handy | Offertio",
  description:
    "Offertio ist die Rechnungssoftware für Maler und Lackierer in CH, DE und AT. Angebot und Rechnung in 60 Sekunden – direkt vom Handy beim Kunden vor Ort.",
  alternates: {
    canonical: "https://offertio.io/branchen/maler",
  },
};

export default function MalerPage() {
  return (
    <div className="px-4 sm:px-6 pt-24 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Rechnungssoftware für Maler & Lackierer",
            description:
              "Mobile-first Offerten- und Rechnungssoftware für Maler und Lackierer in der Schweiz, Deutschland und Österreich.",
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
              Für Maler & Lackierer
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              Rechnungssoftware für Maler:{" "}
              <span style={{ color: "var(--color-primary)" }}>
                Offerte beim Kunden, nicht abends im Büro
              </span>
            </h1>
            <p
              className="text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              Erstelle Angebote und Rechnungen direkt nach der Besichtigung —
              noch bevor du dein Auto startest. Mit Swiss QR-Rechnung, Logo und
              PDF-Versand auf Knopfdruck.
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
            Was Maler täglich ausbremst
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Offerte zu spät",
                description:
                  "Du besichtigst am Dienstag, schreibst die Offerte am Donnerstag — der Auftrag ist schon an den Konkurrenten gegangen. Tempo zählt mehr als Perfektion.",
              },
              {
                title: "Quadratmeter schätzen ohne System",
                description:
                  "Wände, Decken, Fensterrahmen — alles aus dem Kopf gerechnet und auf einem Notizzettel. Irrtümer kosten Marge oder den Auftrag.",
              },
              {
                title: "Rechnung nach Abschluss vergessen",
                description:
                  "Nach dem letzten Pinselstrich kommt der nächste Auftrag. Die Rechnung wird aufgeschoben — manchmal wochenlang.",
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
            Offertio macht es anders
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Offerte direkt nach der Besichtigung",
                description:
                  "Öffne Offertio, tippe Positionen und Preise ein, sende das PDF per WhatsApp — noch auf dem Parkplatz des Kunden. Kein Büro, keine Wartezeit.",
              },
              {
                title: "Positionsliste mit Einheitspreisen",
                description:
                  "Speichere deine Standardpositionen (m² Wand streichen, Fensterrahmen lackieren, Grundierung) als Vorlagen. Bei der nächsten Offerte — ein Tap.",
              },
              {
                title: "Swiss QR-Rechnung automatisch",
                description:
                  "Für Schweizer Kunden erzeugt Offertio den QR-Code nach ISO 20022 automatisch. Deine Kunden scannen, du bekommst schneller Geld.",
              },
              {
                title: "ZUGFeRD für deutsche Auftraggeber",
                description:
                  "Arbeitest du für gewerbliche Kunden in Deutschland? Offertio bettet das ZUGFeRD-XML direkt ins PDF ein — E-Rechnungspflicht erfüllt.",
              },
              {
                title: "Eigenes Logo auf jeder Offerte",
                description:
                  "Lade dein Logo einmal hoch — es erscheint auf jeder Offerte und Rechnung. Professioneller Auftritt ohne Grafikprogramm.",
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
            Für Maler in der Schweiz, Deutschland und Österreich
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
                detail: "ZUGFeRD 2.3 BASIC / Factur-X, E-Rechnungspflicht, Steuernummer",
              },
              {
                flag: "🇦🇹",
                land: "Österreich",
                detail: "§11 öUStG Pflichtangaben, UID-Nummern, AT-Schwellen automatisch",
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
                5 Dokumente pro Monat — zum ersten Testen.
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
              "Früher hat eine Offerte einen halben Abend gekostet. Jetzt
              schicke ich sie noch beim Kunden ab. Der sagt oft noch am gleichen
              Tag zu — bevor er andere Offerten einholt."
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              Hans M., Malermeister, Luzern
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

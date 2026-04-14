import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preise & Pläne | Offertio — Rechnungssoftware für DACH",
  description:
    "Offertio kostenlos testen: Free-Plan dauerhaft gratis (5 Dokumente/Monat) oder Pro ab CHF 20/Monat mit unbegrenzten Dokumenten, Logo und E-Mail-Versand.",
  alternates: {
    canonical: "https://offertio.io/preise",
  },
};

const freeFeatures = [
  "5 Dokumente pro Monat",
  "Swiss QR-Rechnung (CH)",
  "ZUGFeRD Factur-X (DE)",
  "WhatsApp-Versand",
  "PDF-Export",
  "Kundenordner",
];

const proFeatures = [
  "Alles aus Free — unbegrenzt",
  "14 Tage gratis testen",
  "Eigenes Logo & Branding",
  "E-Mail-Versand aus der App",
  "Vorlagen-Bibliothek",
  "Offline-Modus (PWA)",
  "Priorisierter Support",
  "CSV-Export für Buchhaltung",
];

const faq = [
  {
    q: "Brauche ich eine Kreditkarte für die Testversion?",
    a: "Nein. Starte direkt mit der kostenlosen Registrierung. Die 14 Tage Pro-Testphase beginnt automatisch — ohne Kreditkarte, ohne automatische Abbuchung.",
  },
  {
    q: "Was passiert nach den 14 Tagen?",
    a: "Du wechselst automatisch auf den Free-Plan (5 Dokumente/Monat). Kein Verlust deiner Daten, kein erzwungenes Upgrade. Du entscheidest, wenn du bereit bist.",
  },
  {
    q: "Kann ich jederzeit kündigen?",
    a: "Ja. Pro ist monatlich kündbar. Beim Jahresplan kannst du nach dem Jahr kündigen — keine versteckten Bindungsfristen.",
  },
  {
    q: "Gibt es einen Rabatt für den Jahresplan?",
    a: "Ja. Beim Jahresplan zahlst du CHF 240 — das entspricht CHF 20/Monat statt CHF 28/Monat. Du sparst 2 Monate.",
  },
  {
    q: "Für welche Länder ist Offertio geeignet?",
    a: "Schweiz (Swiss QR-Rechnung), Deutschland (ZUGFeRD Factur-X) und Österreich (§11 öUStG, UID-Schwellen). Ein Profil, alle drei Länder.",
  },
];

export default function PreisePage() {
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Offertio",
    url: "https://offertio.io",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "CHF",
        description: "5 Dokumente pro Monat, QR-Rechnung, ZUGFeRD, WhatsApp-Versand.",
      },
      {
        "@type": "Offer",
        name: "Pro Monatlich",
        price: "28",
        priceCurrency: "CHF",
        billingDuration: "P1M",
        description: "Unbegrenzte Dokumente, Logo, E-Mail-Versand, Vorlagen, Offline-Modus.",
      },
      {
        "@type": "Offer",
        name: "Pro Jährlich",
        price: "240",
        priceCurrency: "CHF",
        billingDuration: "P1Y",
        description: "Alle Pro-Features zum Jahrespreis — 2 Monate gratis.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="px-4 sm:px-6 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-4xl space-y-20">
        {/* Header */}
        <section className="text-center space-y-4 pt-4">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
          >
            Preise & Pläne
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            14 Tage alles testen.{" "}
            <span style={{ color: "var(--color-primary)" }}>Danach du entscheidest.</span>
          </h1>
          <p
            className="text-lg max-w-xl mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            Zwei Wochen alle Pro-Funktionen. Ohne Kreditkarte.
            Danach automatisch Free — oder Pro, wenn du magst.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Free */}
          <article
            className="rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-soft)" }}
            >
              Gratis
            </div>
            <h2
              className="mt-4 text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Zum Reinschnuppern
            </h2>
            <div className="mt-4 flex items-end gap-2">
              <span
                className="text-4xl font-bold leading-none tracking-tight"
                style={{ color: "var(--color-text)" }}
              >
                CHF 0
              </span>
              <span className="mb-0.5 text-sm" style={{ color: "var(--color-text-soft)" }}>
                /Monat — dauerhaft
              </span>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Für die ersten echten Einsätze. Ohne Risiko und ohne ein neues System einzuführen.
            </p>
            <ul className="mt-6 space-y-2.5">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-text-soft)", flexShrink: 0 }}>
                    <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-8 block w-full text-center py-2.5 rounded-xl font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--color-text)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Kostenlos starten
            </Link>
          </article>

          {/* Pro */}
          <article
            className="relative rounded-2xl p-8"
            style={{
              background: "rgba(200,121,61,0.04)",
              border: "1px solid rgba(200,121,61,0.16)",
              boxShadow: "0 0 40px rgba(200,121,61,0.06)",
            }}
          >
            <div
              className="absolute right-6 top-6 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              Pro
            </div>
            <div
              className="inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(200,121,61,0.10)", color: "var(--color-primary)" }}
            >
              Für wachsende Betriebe
            </div>
            <h2
              className="mt-4 text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Mehr Volumen, mehr Auftritt
            </h2>
            <div className="mt-4 space-y-1">
              <div className="flex items-end gap-2">
                <span
                  className="text-4xl font-bold leading-none tracking-tight"
                  style={{ color: "var(--color-primary)" }}
                >
                  CHF 20
                </span>
                <span className="mb-0.5 text-sm" style={{ color: "var(--color-text-soft)" }}>
                  /Monat (jährlich)
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-soft)" }}>
                oder CHF 28/Monat bei monatlicher Zahlung
              </p>
            </div>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Sobald Offertio fester Teil deines Tages wird: mehr Volumen, besserer
              Auftritt und weniger Büro-Backlog.
            </p>
            <ul className="mt-6 space-y-2.5">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-primary)", flexShrink: 0 }}>
                    <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login?plan=pro"
              className="mt-8 block w-full text-center py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              14 Tage gratis testen
            </Link>
            <p className="mt-2 text-center text-xs" style={{ color: "var(--color-text-soft)" }}>
              Keine Kreditkarte · Upgrade jederzeit · Kündbar monatlich
            </p>
          </article>
        </section>

        {/* Feature comparison table */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center" style={{ color: "var(--color-text)" }}>
            Free vs. Pro im Vergleich
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <th className="text-left p-4 font-semibold" style={{ color: "var(--color-text)" }}>Feature</th>
                  <th className="p-4 font-semibold text-center" style={{ color: "var(--color-text-soft)" }}>Free</th>
                  <th className="p-4 font-semibold text-center" style={{ color: "var(--color-primary)" }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Dokumente pro Monat", "5", "Unbegrenzt"],
                  ["Swiss QR-Rechnung", "✓", "✓"],
                  ["ZUGFeRD Factur-X (DE)", "✓", "✓"],
                  ["WhatsApp-Versand", "✓", "✓"],
                  ["PDF-Export", "✓", "✓"],
                  ["Eigenes Logo & Branding", "—", "✓"],
                  ["E-Mail-Versand aus App", "—", "✓"],
                  ["Vorlagen-Bibliothek", "—", "✓"],
                  ["Offline-Modus (PWA)", "—", "✓"],
                  ["CSV-Export Buchhaltung", "—", "✓"],
                  ["Priorisierter Support", "—", "✓"],
                ].map(([feature, free, pro], i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <td className="p-4" style={{ color: "var(--color-text-muted)" }}>{feature}</td>
                    <td className="p-4 text-center" style={{ color: free === "✓" ? "var(--color-text)" : "var(--color-text-soft)" }}>{free}</td>
                    <td className="p-4 text-center font-medium" style={{ color: pro === "✓" || pro === "Unbegrenzt" ? "var(--color-primary)" : "var(--color-text-soft)" }}>{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Häufige Fragen zu den Preisen
          </h2>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <details
                key={i}
                className="rounded-xl overflow-hidden group"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <summary
                  className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-semibold text-sm"
                  style={{ color: "var(--color-text)" }}
                >
                  {item.q}
                  <span style={{ color: "var(--color-primary)", flexShrink: 0, marginLeft: "1rem" }}>+</span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-7" style={{ color: "var(--color-text-muted)" }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl p-10 text-center space-y-4"
          style={{
            background: "rgba(200,121,61,0.05)",
            border: "1px solid rgba(200,121,61,0.12)",
          }}
        >
          <h2 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
            Bereit loszulegen?
          </h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            14 Tage alle Pro-Features testen. Keine Kreditkarte. Kein Risiko.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href="/login?plan=pro"
              className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Pro 14 Tage gratis testen
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--color-text)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Free starten
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

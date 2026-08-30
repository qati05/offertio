import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offertio vs. sevDesk: Welche Software passt zu dir? | Offertio",
  description:
    "Offertio oder sevDesk? Vergleich für Kleinbetriebe in der DACH-Region: Preise, Funktionen, Swiss QR-Rechnung und mobile Nutzung im direkten Vergleich.",
  alternates: {
    canonical: "https://offertio.io/vergleich/offertio-vs-sevdesk",
  },
};

const rows = [
  { label: "Preis (Einstieg)", offertio: "CHF 0 – dauerhaft kostenlos", sevdesk: "ab €19.90 / Monat", offertioWin: true },
  { label: "Kostenloser Plan", offertio: "✅ Ja, dauerhaft", sevdesk: "❌ Nur 14 Tage Trial", offertioWin: true },
  { label: "Swiss QR-Rechnung", offertio: "✅ Nativ integriert", sevdesk: "❌ Nicht nativ", offertioWin: true },
  { label: "Schweiz-Support (CH)", offertio: "✅ Vollständig", sevdesk: "⚠️ Begrenzt (DE-Fokus)", offertioWin: true },
  { label: "ZUGFeRD E-Rechnung (DE)", offertio: "✅ Version 2.3.2", sevdesk: "✅ Ja", offertioWin: false },
  { label: "SEPA (Österreich)", offertio: "✅ Ja", sevdesk: "✅ Ja", offertioWin: false },
  { label: "Mobile (Handy-App)", offertio: "✅ Optimiert, offline-fähig", sevdesk: "⚠️ Eingeschränkt", offertioWin: true },
  { label: "Offline-Nutzung", offertio: "✅ Vollständig offline", sevdesk: "❌ Nein", offertioWin: true },
  { label: "Einrichtungszeit", offertio: "✅ ~5 Minuten", sevdesk: "⚠️ Stunden bis Tage", offertioWin: true },
  { label: "Buchhaltung / DATEV", offertio: "❌ Nicht enthalten", sevdesk: "✅ Vollständige Buchhaltung", offertioWin: false },
  { label: "Zielgruppe", offertio: "Kleinstbetriebe & Handwerker", sevdesk: "KMU mit Buchhaltungsbedarf", offertioWin: false },
];

const faqs = [
  {
    q: "Ist Offertio eine sevDesk Alternative für die Schweiz?",
    a: "Ja. sevDesk ist primär auf den deutschen Markt ausgerichtet und unterstützt die Swiss QR-Rechnung nicht nativ. Offertio wurde von Anfang an für die DACH-Region gebaut – mit Swiss QR-Rechnung, ZUGFeRD und SEPA in einem kostenlosen Plan.",
  },
  {
    q: "Wann ist sevDesk besser als Offertio?",
    a: "sevDesk ist besser geeignet, wenn du eine vollständige Buchhaltungssoftware mit DATEV-Export, Steuerberater-Zugang und Lohnabrechnung brauchst. Für reine Offerten und Rechnungen ist Offertio einfacher und günstiger.",
  },
  {
    q: "Kann ich von sevDesk zu Offertio wechseln?",
    a: "Ja. Offertio startet in 5 Minuten – du kannst deinen ersten Probebetrieb kostenlos machen, ohne Kreditkarte oder Kündigung bei sevDesk.",
  },
];

export default function VergleichSevDeskPage() {
  return (
    <main style={{ color: "var(--color-text)", minHeight: "100vh" }}>
      {/* JSON-LD FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* Hero */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "7rem 24px 3rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(200,121,61,0.12)",
            border: "1px solid rgba(200,121,61,0.25)",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 13,
            color: "#C8793D",
            marginBottom: 24,
          }}
        >
          Direkter Vergleich
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "clamp(1.8rem, 4.5vw, 2.75rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          Offertio vs. sevDesk — welche Software passt zu dir?
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--color-text-muted)",
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          Du suchst eine Rechnungssoftware für dein Kleinunternehmen und fragst dich, ob
          Offertio oder sevDesk die bessere Wahl ist? Hier bekommst du eine ehrliche Antwort.
        </p>
      </section>

      {/* Comparison table */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "2rem 24px 3rem",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    color: "var(--color-text-muted)",
                    fontWeight: 500,
                    borderBottom: "1px solid rgba(200,121,61,0.15)",
                  }}
                >
                  Kriterium
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    color: "#C8793D",
                    fontWeight: 700,
                    borderBottom: "1px solid rgba(200,121,61,0.15)",
                    textAlign: "center",
                  }}
                >
                  Offertio
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    color: "var(--color-text-muted)",
                    fontWeight: 500,
                    borderBottom: "1px solid rgba(200,121,61,0.15)",
                    textAlign: "center",
                  }}
                >
                  sevDesk
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      color: "var(--color-text-muted)",
                      fontWeight: 500,
                      borderBottom: "1px solid rgba(200,121,61,0.06)",
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      borderBottom: "1px solid rgba(200,121,61,0.06)",
                      color: row.offertioWin ? "#4ade80" : "var(--color-text)",
                      fontWeight: row.offertioWin ? 600 : 400,
                    }}
                  >
                    {row.offertio}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      borderBottom: "1px solid rgba(200,121,61,0.06)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {row.sevdesk}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Verdict */}
      <section
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "2rem 24px 3rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "rgba(200,121,61,0.07)",
            border: "1px solid rgba(200,121,61,0.2)",
            borderRadius: 14,
            padding: "28px",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16, color: "#C8793D" }}>
            ✅ Wann ist Offertio besser?
          </h2>
          <ul style={{ fontSize: 14, lineHeight: 2, color: "var(--color-text)", paddingLeft: 0, listStyle: "none" }}>
            <li>• Du bist in der Schweiz tätig (QR-Rechnung Pflicht)</li>
            <li>• Du willst kostenlos starten</li>
            <li>• Du brauchst eine mobile, schnelle Lösung</li>
            <li>• Du bist Einzelperson, Handwerker oder Kleinstbetrieb</li>
            <li>• Du willst keine komplexe Buchhaltungssoftware</li>
            <li>• Offline-Nutzung auf der Baustelle ist wichtig</li>
          </ul>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "28px",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
            ℹ️ Wann ist sevDesk besser?
          </h2>
          <ul style={{ fontSize: 14, lineHeight: 2, color: "var(--color-text-muted)", paddingLeft: 0, listStyle: "none" }}>
            <li>• Du brauchst vollständige Buchhaltung</li>
            <li>• Du arbeitest mit einem Steuerberater und DATEV</li>
            <li>• Dein Fokus liegt auf dem deutschen Markt</li>
            <li>• Du hast Mitarbeitende und Lohnbuchhaltung</li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "2rem 24px 3rem",
          borderTop: "1px solid rgba(200,121,61,0.1)",
        }}
      >
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 32, textAlign: "center" }}>
          Häufige Fragen
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {faqs.map((faq) => (
            <div
              key={faq.q}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(200,121,61,0.1)",
                borderRadius: 12,
                padding: "24px",
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{faq.q}</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "3rem 24px 6rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 16 }}>
          Offertio kostenlos testen — ohne Kreditkarte
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: 15, marginBottom: 28 }}>
          5 Dokumente pro Monat, Swiss QR-Rechnung, PDF-Versand — dauerhaft gratis.
        </p>
        <a
          href="/#preise"
          style={{
            background: "#C8793D",
            color: "#fff",
            padding: "16px 36px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Jetzt kostenlos starten →
        </a>
      </section>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offertio vs. bexio: Günstige bexio-Alternative für Kleinbetriebe | Offertio",
  description:
    "Offertio oder bexio? Preise, Funktionen und Eignung im Vergleich. Offertio ist die günstige bexio-Alternative für Selbstständige und Kleinstbetriebe in der Schweiz.",
  alternates: {
    canonical: "https://offertio.io/vergleich/offertio-vs-bexio",
  },
};

const rows = [
  { label: "Preis (Einstieg)", offertio: "CHF 0 – dauerhaft kostenlos", bexio: "ab CHF 39 / Monat", offertioWin: true },
  { label: "Kostenloser Plan", offertio: "✅ Ja, dauerhaft", bexio: "❌ Kein kostenloser Plan", offertioWin: true },
  { label: "Swiss QR-Rechnung", offertio: "✅ Nativ, einfach", bexio: "✅ Ja, aber komplex", offertioWin: false },
  { label: "ZUGFeRD E-Rechnung (DE)", offertio: "✅ Version 2.3.2", bexio: "⚠️ Begrenzt", offertioWin: true },
  { label: "Mobile (Handy-App)", offertio: "✅ Optimiert, offline-fähig", bexio: "⚠️ Vorhanden, weniger optimiert", offertioWin: true },
  { label: "Offline-Nutzung", offertio: "✅ Vollständig offline", bexio: "❌ Nein", offertioWin: true },
  { label: "Einrichtungszeit", offertio: "✅ ~5 Minuten", bexio: "❌ Stunden bis Tage", offertioWin: true },
  { label: "Buchhaltung / Lohn", offertio: "❌ Nicht enthalten", bexio: "✅ Vollständig (mit Lohnbuchhaltung)", offertioWin: false },
  { label: "Treuhänder-Zugang", offertio: "❌ Nicht vorhanden", bexio: "✅ Integriert", offertioWin: false },
  { label: "Komplexität", offertio: "✅ Einfach (60-Sek. Workflow)", bexio: "❌ Hoch (Lernkurve)", offertioWin: true },
  { label: "Zielgruppe", offertio: "Einzelperson & Kleinstbetrieb", bexio: "KMU mit Mitarbeitenden", offertioWin: false },
];

const faqs = [
  {
    q: "Ist Offertio eine günstige bexio-Alternative?",
    a: "Ja. bexio startet bei CHF 39 pro Monat und ist primär für KMU mit Lohnbuchhaltung und Treuhänder-Anbindung gedacht. Offertio kostet CHF 0 für 10 Dokumente pro Monat und ist auf schnelle, mobile Offerten und Rechnungen spezialisiert – ideal für Selbstständige und Kleinstbetriebe.",
  },
  {
    q: "Hat Offertio auch Swiss QR-Rechnung wie bexio?",
    a: "Ja, beide Lösungen unterstützen die Swiss QR-Rechnung. Der Unterschied: Bei Offertio ist sie in 60 Sekunden vom Handy erstellt, ohne Buchhaltungskenntnisse. bexio bietet mehr Funktionen, erfordert aber mehr Einrichtungszeit.",
  },
  {
    q: "Wann sollte ich bexio statt Offertio wählen?",
    a: "bexio ist die bessere Wahl, wenn du ein KMU mit mehreren Mitarbeitenden betreibst, Lohnbuchhaltung brauchst, einen Treuhänder einbinden möchtest oder vollständige Schweizer Buchhaltung (OR-konform) benötigst. Für reine Offerten und Rechnungen ist Offertio einfacher und günstiger.",
  },
];

export default function VergleichBexioPage() {
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
          Offertio vs. bexio — günstige Alternative für Selbstständige
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--color-text-muted)",
            maxWidth: 620,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          bexio ist mächtig — aber für viele Kleinstbetriebe zu teuer und zu komplex. Hier erfährst
          du, wann Offertio die bessere Wahl ist und wann bexio Sinn macht.
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
                  bexio
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
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
                    {row.bexio}
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
            <li>• Du bist Selbstständig oder hast wenige Mitarbeitende</li>
            <li>• Du willst kostenlos starten ohne Risiko</li>
            <li>• Du brauchst Offerten und Rechnungen, keine Buchhaltung</li>
            <li>• Mobile Nutzung auf dem Handy ist wichtig</li>
            <li>• CHF 39+/Monat für bexio ist zu viel für deinen Umsatz</li>
            <li>• Du willst in 5 Minuten startklar sein</li>
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
            ℹ️ Wann ist bexio besser?
          </h2>
          <ul style={{ fontSize: 14, lineHeight: 2, color: "var(--color-text-muted)", paddingLeft: 0, listStyle: "none" }}>
            <li>• Du hast mehrere Mitarbeitende und Lohnbuchhaltung</li>
            <li>• Du brauchst Treuhänder-Integration</li>
            <li>• Du willst vollständige OR-konforme Buchhaltung</li>
            <li>• Dein Betrieb wächst Richtung KMU</li>
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
          Die günstigere bexio-Alternative — kostenlos testen
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: 15, marginBottom: 28 }}>
          Offertio startet kostenlos. Kein Kreditkarte, keine Vertragsbindung, kein Risiko.
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

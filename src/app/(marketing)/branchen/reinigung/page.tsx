import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rechnungsprogramm für Reinigungsfirmen – Offerten & Rechnungen | Offertio",
  description:
    "Offertio: Das Rechnungsprogramm für Reinigungsfirmen und Putzfrauen in CH, DE und AT. Offerten und Rechnungen in 60 Sekunden – direkt vom Handy.",
  alternates: {
    canonical: "https://offertio.io/branchen/reinigung",
  },
};

const features = [
  {
    icon: "🔁",
    title: "Wiederkehrende Rechnungen",
    desc: "Für regelmässige Kunden Vorlage einmal anlegen – jeden Monat in Sekunden versenden.",
  },
  {
    icon: "💶",
    title: "Stunden- oder Pauschalabrechnung",
    desc: "Stundensatz oder Fixpreis – du wählst, Offertio rechnet korrekt ab.",
  },
  {
    icon: "📱",
    title: "Direkt nach dem Putzjob",
    desc: "Rechnung auf dem Handy erstellen, bevor du das Objekt verlässt. Sofort professionell.",
  },
  {
    icon: "🇨🇭",
    title: "Swiss QR-Rechnung",
    desc: "Für Schweizer Kunden automatisch QR-Code auf der Rechnung – bankkonform.",
  },
  {
    icon: "🖼️",
    title: "Eigenes Logo & Farben",
    desc: "Dein Logo auf jeder Rechnung. Professioneller Auftritt, der Vertrauen schafft.",
  },
  {
    icon: "📧",
    title: "PDF per Mail versenden",
    desc: "Direkt aus der App mailen – kein Ausdrucken, kein Scannen, kein Papier.",
  },
];

const painPoints = [
  {
    problem: "Du vergisst wiederkehrende Rechnungen",
    solution: "Vorlagen speichern, monatlich in 10 Sekunden versenden",
  },
  {
    problem: "Kunden fragen nach Angeboten, du hast keine Zeit",
    solution: "Offerte in 60 Sekunden vom Handy – noch bevor du den Kunden verlässt",
  },
  {
    problem: "Excel-Tabellen und Word-Dokumente für jede Rechnung",
    solution: "Alles in einer App – Offerten, Rechnungen, PDFs, Versand",
  },
];

export default function ReinigungPage() {
  return (
    <main style={{ color: "var(--color-text)", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          paddingTop: "7rem",
          paddingBottom: "4rem",
          textAlign: "center",
          maxWidth: 760,
          margin: "0 auto",
          padding: "7rem 24px 4rem",
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
          Für Reinigungsfirmen & Haushaltshilfen
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display, serif)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          Rechnungsprogramm für Reinigungsfirmen — Offerten & Rechnungen in 60 Sekunden
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--color-text-muted)",
            maxWidth: 580,
            margin: "0 auto 36px",
            lineHeight: 1.7,
          }}
        >
          Ob Büroreinigung, Haushalt oder Umzugsreinigung — mit Offertio erstellst du professionelle
          Offerten und Rechnungen direkt vom Handy. Swiss QR-Rechnung, ZUGFeRD und SEPA inklusive.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/#preise"
            style={{
              background: "#C8793D",
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Kostenlos starten
          </a>
          <a
            href="/#ablauf"
            style={{
              background: "rgba(200,121,61,0.08)",
              border: "1px solid rgba(200,121,61,0.2)",
              color: "var(--color-text)",
              padding: "14px 28px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            Wie es funktioniert →
          </a>
        </div>
      </section>

      {/* Pain points */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "3rem 24px",
          borderTop: "1px solid rgba(200,121,61,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Kennst du das?
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {painPoints.map((p) => (
            <div
              key={p.problem}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(200,121,61,0.1)",
                borderRadius: 12,
                padding: "24px",
              }}
            >
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 14,
                  marginBottom: 12,
                  textDecoration: "line-through",
                }}
              >
                ❌ {p.problem}
              </p>
              <p style={{ color: "var(--color-text)", fontSize: 14, fontWeight: 500 }}>
                ✅ {p.solution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "3rem 24px",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Alles was du als Reinigungsprofi brauchst
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(200,121,61,0.1)",
                borderRadius: 12,
                padding: "24px",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "3rem 24px",
          textAlign: "center",
        }}
      >
        <blockquote
          style={{
            background: "rgba(200,121,61,0.06)",
            border: "1px solid rgba(200,121,61,0.18)",
            borderRadius: 16,
            padding: "32px",
          }}
        >
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: 1.7,
              fontStyle: "italic",
              marginBottom: 16,
              color: "var(--color-text)",
            }}
          >
            "Früher habe ich Rechnungen auf Papier geschrieben und sie manchmal vergessen. Jetzt
            erstelle ich alles auf dem Handy, direkt beim Kunden. Die meisten zahlen innerhalb von
            zwei Tagen."
          </p>
          <cite style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "normal" }}>
            — Maria K., Gebäudereinigung, Basel
          </cite>
        </blockquote>
      </section>

      {/* Pricing */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "3rem 24px",
          borderTop: "1px solid rgba(200,121,61,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Einfache Preise — kein Kleingedrucktes
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--color-text-muted)",
            marginBottom: 36,
            fontSize: 15,
          }}
        >
          Starte kostenlos. Kein Kreditkarte, keine automatische Verlängerung.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(200,121,61,0.15)",
              borderRadius: 14,
              padding: "28px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
              Gratis
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 4 }}>CHF 0</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
              Für immer kostenlos
            </div>
            <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 2 }}>
              <li>✓ 5 Dokumente / Monat</li>
              <li>✓ Swiss QR-Rechnung</li>
              <li>✓ PDF per Mail</li>
              <li>✓ Logo & Farben</li>
            </ul>
          </div>
          <div
            style={{
              border: "1px solid #C8793D",
              borderRadius: 14,
              padding: "28px",
              background: "rgba(200,121,61,0.06)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#C8793D",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 999,
              }}
            >
              BELIEBT
            </div>
            <div style={{ fontSize: 13, color: "#C8793D", marginBottom: 8 }}>Pro</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 4 }}>CHF 20</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
              pro Monat (jährlich)
            </div>
            <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 2 }}>
              <li>✓ Unbegrenzte Dokumente</li>
              <li>✓ ZUGFeRD E-Rechnung (DE)</li>
              <li>✓ SEPA (AT)</li>
              <li>✓ Prioritäts-Support</li>
              <li>✓ Erweiterte Vorlagen</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          textAlign: "center",
          padding: "4rem 24px 6rem",
        }}
      >
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 16 }}>
          Bereit, Rechnungen endlich einfach zu machen?
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: 15,
            marginBottom: 28,
          }}
        >
          Jetzt kostenlos starten — keine Kreditkarte, keine Vertragsbindung.
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
          Kostenlos starten →
        </a>
      </section>
    </main>
  );
}

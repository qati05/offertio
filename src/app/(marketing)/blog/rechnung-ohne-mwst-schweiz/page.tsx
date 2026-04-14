import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rechnung ohne MwSt Schweiz: Was Kleinunternehmer wissen müssen | Offertio",
  description:
    "MwSt-befreit unter CHF 100 000 Umsatz? Erfahre, welche Pflichtangaben auf deine Rechnung gehören, wann du freiwillig optierst und wie Offertio das automatisch setzt.",
  alternates: {
    canonical: "https://offertio.io/blog/rechnung-ohne-mwst-schweiz",
  },
};

export default function RechnungOhneMwstSchweizPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Rechnung ohne MwSt Schweiz: Der Guide für Kleinunternehmer",
    description:
      "Alles über MwSt-Befreiung in der Schweiz: Umsatzgrenze, Pflichtangaben, freiwillige Option und wie du rechtssichere Rechnungen ohne MwSt erstellst.",
    author: {
      "@type": "Organization",
      name: "Offertio",
      url: "https://offertio.io",
    },
    datePublished: "2026-04-15",
    dateModified: "2026-04-15",
    wordCount: 1100,
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
            Schweiz · Mehrwertsteuer
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Rechnung ohne MwSt Schweiz: Was Kleinunternehmer wirklich wissen müssen
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
            Du hast weniger als CHF 100 000 Jahresumsatz und weisst nicht,
            ob und wie du Mehrwertsteuer auf deine Rechnungen schreiben musst?
            Dieser Guide erklärt die Regeln klar — ohne Juristendeutsch.
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
                "Die CHF-100 000-Grenze",
                "Was auf eine Rechnung ohne MwSt gehört",
                "Was du NICHT schreiben darfst",
                "Freiwillige MwSt-Option",
                "Wenn du die Grenze überschreitest",
                "Rechnung ohne MwSt mit Offertio",
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
              1. Die CHF-100 000-Grenze
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              In der Schweiz gilt nach Art. 10 Abs. 2 MWSTG: Wer mit steuerbaren Leistungen
              pro Jahr weniger als <strong style={{ color: "var(--color-text)" }}>CHF 100 000</strong> Umsatz erzielt,
              ist von der Mehrwertsteuer befreit — und muss sich nicht beim MWST-Register der
              ESTV anmelden.
            </p>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Das betrifft einen Grossteil der Selbstständigen und Kleinbetriebe in der Schweiz:
              Handwerker, Reinigungsfirmen, Gärtner, Berater und Freiberufler, die noch nicht
              die Grenze erreicht haben. Für sie gilt: <em>keine Anmeldepflicht, keine
              Abrechnung, keine Deklaration</em> — solange der Umsatz unter dem Schwellenwert bleibt.
            </p>
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(200,121,61,0.06)",
                border: "1px solid rgba(200,121,61,0.12)",
              }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                <strong>Wichtig:</strong> Die Grenze gilt für den <em>weltweiten steuerbaren Jahresumsatz</em>,
                nicht nur für Schweizer Kunden. Wenn du also auch im Ausland Leistungen erbringst,
                zählt das hinzu.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              2. Was auf eine Rechnung ohne MwSt gehört
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Auch ohne MwSt-Pflicht musst du rechtlich vollständige Rechnungen ausstellen.
              Die Pflichtangaben nach OR und MWSTG:
            </p>
            <ul className="space-y-3">
              {[
                { label: "Name und Adresse des Rechnungsstellers", note: "dein Firmenname oder dein Name als Einzelperson" },
                { label: "Name und Adresse des Empfängers", note: "dein Kunde" },
                { label: "Rechnungsdatum", note: "nicht Leistungsdatum verwechseln" },
                { label: "Rechnungsnummer", note: "für die Buchhaltung und den Steuernachweis" },
                { label: "Beschreibung der Leistung oder Ware", note: "klar und nachvollziehbar" },
                { label: "Menge und Preis", note: "Stückzahl, Stunden oder m² mit Einheitspreis" },
                { label: "Gesamtbetrag", note: "in CHF, ohne MwSt-Zeile" },
                { label: "Zahlungsfrist oder Zahlungsbedingungen", note: "z.B. «Zahlbar innert 30 Tagen»" },
              ].map((item, i) => (
                <li
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
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              3. Was du NICHT schreiben darfst
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Als von der MwSt befreite Person darfst du auf deiner Rechnung{" "}
              <strong style={{ color: "var(--color-text)" }}>keine Mehrwertsteuer ausweisen</strong>.
              Weder „8,1% MwSt" noch eine Zeile „inkl. MWST" oder ähnliches.
            </p>
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(255, 80, 80, 0.05)",
                border: "1px solid rgba(255, 80, 80, 0.12)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--color-text)" }}>
                <strong>Achtung:</strong> Wenn du MwSt ausweist, obwohl du nicht registriert
                bist, schuldet du diese trotzdem der ESTV — nach Art. 27 MWSTG. Das nennt
                sich <em>unberechtigter Steuerausweis</em> und ist kein Kavaliersdelikt.
              </p>
            </div>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Du kannst aber optional vermerken: <em>„Gemäss Art. 10 Abs. 2 MWSTG von der
              Steuerpflicht befreit"</em> — das schafft Transparenz gegenüber Geschäftskunden,
              die wissen wollen, warum keine MWST ausgewiesen ist.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              4. Freiwillige MwSt-Option: Wann macht das Sinn?
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Du kannst dich freiwillig beim MWST-Register anmelden, auch wenn du unter
              CHF 100 000 Umsatz liegst. Das ergibt Sinn, wenn:
            </p>
            <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {[
                "Du hauptsächlich an MwSt-pflichtige Unternehmen rechnest (B2B) — sie können die Vorsteuer zurückfordern, was dich attraktiver macht",
                "Du hohe Vorleistungen hast (z.B. Materialkosten, Fahrzeug) und die Vorsteuer zurückfordern möchtest",
                "Du planst, die CHF-100 000-Grenze bald zu überschreiten und möchtest frühzeitig Erfahrung aufbauen",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-primary)" }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Die freiwillige Option ist mindestens 3 Jahre bindend. Überleg dir das gut
              und konsultiere im Zweifel einen Treuhänder.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              5. Was passiert, wenn du die Grenze überschreitest?
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Überschreitest du CHF 100 000 Jahresumsatz, bist du <strong style={{ color: "var(--color-text)" }}>
              ab dem nächsten Quartal</strong> anmeldepflichtig. Du hast dann 30 Tage Zeit,
              dich beim MWST-Register der ESTV anzumelden. Ab Anmeldung musst du MwSt
              ausweisen und quartalsweise oder halbjährlich abrechnen.
            </p>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Überwache deinen Umsatz regelmässig — spätestens wenn du im Herbst merkst,
              dass du auf CHF 100 000 zusteuerts, solltest du aktiv werden.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              6. Rechnung ohne MwSt mit Offertio erstellen
            </h2>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              In Offertio gibt es in den Einstellungen einen{" "}
              <strong style={{ color: "var(--color-text)" }}>Kleinunternehmer-Modus</strong>.
              Aktivierst du ihn, werden auf allen Rechnungen und Offerten automatisch:
            </p>
            <ul className="space-y-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {[
                "Keine MwSt-Zeile ausgegeben",
                "Der optionale Vermerk «Gemäss Art. 10 MWSTG von der Steuerpflicht befreit» eingefügt",
                "Alle Totals ohne Steueranteil berechnet",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-primary)" }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="leading-7" style={{ color: "var(--color-text-muted)" }}>
              Du musst nichts manuell anpassen — einmal eingestellt, stimmt jede
              Rechnung automatisch.
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
              Rechnungen ohne MwSt — richtig und schnell
            </h3>
            <p className="text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Offertio setzt den Kleinunternehmer-Modus automatisch. Swiss QR-Rechnung,
              PDF-Export, WhatsApp-Versand — kostenlos für bis zu 5 Dokumente pro Monat.
            </p>
            <Link
              href="/login"
              className="inline-flex px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Kostenlos starten
            </Link>
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
                  href: "/blog/offerte-vorlage-schweiz",
                  title: "Offerte Vorlage Schweiz: Was gehört rein?",
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

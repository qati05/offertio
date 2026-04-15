export default function ImpressumPage() {
  return (
    <div className="auth-container" style={{ maxWidth: 680 }}>
      <div style={{ padding: "40px 20px" }}>
        <a href="/" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: 13 }}>
          ← Zurück
        </a>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "24px 0 8px" }}>
          Impressum
        </h1>

        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)", marginTop: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Betreiber</h2>
          <p>
            Offertio<br />
            Marbacherstrasse 12<br />
            9445 Rebstein<br />
            Schweiz
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:info@offertio.ch" style={{ color: "var(--color-primary)" }}>info@offertio.ch</a>
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Rechtsform</h2>
          <p>
            Einzelunternehmen — nicht im Handelsregister eingetragen.<br />
            Kein MwSt-Register (Umsatz unter CHF 100 000).
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Haftungshinweis</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
            externer Links. Für den Inhalt der verlinkten Seiten sind ausschliesslich deren
            Betreiber verantwortlich.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Urheberrecht</h2>
          <p>
            Die Inhalte und Werke auf diesen Seiten unterliegen dem Schweizer Urheberrecht.
            Die Vervielfältigung, Bearbeitung und Verbreitung ausserhalb der Grenzen des
            Urheberrechts bedürfen der Zustimmung des Betreibers.
          </p>
        </div>
      </div>
    </div>
  );
}

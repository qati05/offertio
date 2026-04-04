export default function DatenschutzPage() {
  return (
    <div className="auth-container" style={{ maxWidth: 680 }}>
      <div style={{ padding: "40px 20px" }}>
        <a href="/" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: 13 }}>
          ← Zurück
        </a>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "24px 0 8px" }}>
          Datenschutzerklärung
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 32 }}>
          Zuletzt aktualisiert: März 2026
        </p>

        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)" }}>
          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. Verantwortliche Stelle</h2>
          <p>
            Offertio (nachfolgend «wir») betreibt die Webapplikation offertio.ch. Für Fragen zum
            Datenschutz wenden Sie sich bitte an: datenschutz@offertio.ch
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. Erhobene Daten</h2>
          <p>Wir erheben folgende Daten:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>E-Mail-Adresse und verschlüsseltes Passwort (für Anmeldung und Kontoerstellung)</li>
            <li>Firmendaten (Name, Adresse, IBAN, UID-Nr.) — freiwillig eingegeben</li>
            <li>Erstellte Dokumente (Offerten, Rechnungen) — nur lokal im Browser gespeichert</li>
            <li>Logo-Dateien (optional, in Supabase Storage)</li>
          </ul>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. Zweck der Datenverarbeitung</h2>
          <p>
            Die erhobenen Daten werden ausschliesslich zur Bereitstellung der Offertio-Dienste verwendet:
            Erstellung und Versand von Offerten und Rechnungen, Profilanzeige auf Dokumenten,
            und Authentifizierung.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. Datenspeicherung</h2>
          <p>
            Profildaten werden in einer Supabase-Datenbank (Hosting: EU/CH) gespeichert.
            Dokument-Entwürfe und Verlauf werden ausschliesslich im lokalen Browser-Speicher
            (localStorage) abgelegt und nie an Server übertragen.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>5. E-Mail-Versand</h2>
          <p>
            Wenn Sie eine Offerte oder Rechnung per E-Mail senden, wird das generierte PDF über
            den Dienst Resend (resend.com) an die angegebene E-Mail-Adresse übermittelt.
            Resend verarbeitet die Daten gemäss ihrer eigenen Datenschutzrichtlinie.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>6. Cookies & Tracking</h2>
          <p>
            Offertio verwendet keine Marketing-Cookies oder Tracking-Dienste von Drittanbietern.
            Es werden nur technisch notwendige Cookies für die Authentifizierung eingesetzt
            (Supabase Auth Session).
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>7. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten.
            Sie können Ihr Konto jederzeit in den Einstellungen löschen. Dabei werden alle
            Profildaten und Vorlagen unwiderruflich entfernt.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>8. Kontakt</h2>
          <p>
            Bei Fragen zum Datenschutz kontaktieren Sie uns unter: datenschutz@offertio.ch
          </p>
        </div>
      </div>
    </div>
  );
}

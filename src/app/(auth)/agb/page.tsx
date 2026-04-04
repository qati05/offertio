export default function AGBPage() {
  return (
    <div className="auth-container" style={{ maxWidth: 680 }}>
      <div style={{ padding: "40px 20px" }}>
        <a href="/" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: 13 }}>
          ← Zurück
        </a>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "24px 0 8px" }}>
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 32 }}>
          Zuletzt aktualisiert: März 2026
        </p>

        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)" }}>
          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. Geltungsbereich</h2>
          <p>
            Diese AGB gelten für die Nutzung der Webapplikation Offertio (offertio.ch),
            betrieben von Offertio. Mit der Registrierung akzeptieren Sie diese Bedingungen.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. Leistungsbeschreibung</h2>
          <p>
            Offertio ermöglicht die Erstellung und den Versand professioneller Offerten und
            Rechnungen als PDF. Der Dienst umfasst:
          </p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Erstellung von Offerten und Rechnungen mit Swiss QR-Rechnung</li>
            <li>PDF-Generierung und E-Mail-Versand</li>
            <li>Verwaltung von Vorlagen und Firmenprofil</li>
          </ul>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. Kostenlose & kostenpflichtige Nutzung</h2>
          <p>
            Der Free-Plan erlaubt die Erstellung von bis zu 5 Dokumenten pro Monat.
            Für unbegrenzte Nutzung ist ein Pro-Abonnement erforderlich. Preise und
            Zahlungsbedingungen werden auf der Webseite ausgewiesen.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. Kündigung</h2>
          <p>
            Das Pro-Abonnement kann jederzeit zum Ende der Abrechnungsperiode gekündigt werden.
            Nach der Kündigung wird der Account auf den Free-Plan zurückgestuft.
            Die Kontolöschung ist jederzeit in den Einstellungen möglich.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>5. Haftungsausschluss</h2>
          <p>
            Offertio stellt die Applikation «wie besehen» zur Verfügung. Wir haften nicht
            für die Richtigkeit der generierten Dokumente, insbesondere nicht für die korrekte
            Berechnung von MWST-Beträgen oder QR-Codes. Die Verantwortung für den Inhalt
            der erstellten Dokumente liegt beim Nutzer.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>6. Verfügbarkeit</h2>
          <p>
            Wir bemühen uns um eine hohe Verfügbarkeit, können aber keine Garantie für
            unterbrechungsfreien Betrieb geben. Geplante Wartungsarbeiten werden vorab
            angekündigt.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>7. Änderungen der AGB</h2>
          <p>
            Wir behalten uns das Recht vor, diese AGB zu ändern. Wesentliche Änderungen
            werden per E-Mail mitgeteilt. Die weitere Nutzung nach Änderung gilt als Zustimmung.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>8. Anwendbares Recht</h2>
          <p>
            Es gilt Schweizer Recht. Gerichtsstand ist der Sitz von Offertio in der Schweiz.
          </p>
        </div>
      </div>
    </div>
  );
}

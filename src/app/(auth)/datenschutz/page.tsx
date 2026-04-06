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
          Zuletzt aktualisiert: April 2026
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
            <li>Firmendaten (Name, Adresse, IBAN, UID-Nr., Steuernummer) — freiwillig eingegeben, serverseitig gespeichert</li>
            <li>Kundendaten (Name, Adresse, E-Mail, UID-Nr. des Kunden) — serverseitig gespeichert für Dokumentwiederverwendung</li>
            <li>Erstellte Dokumente (Offerten, Rechnungen) — Metadaten und PDF-Dateien serverseitig in Supabase gespeichert</li>
            <li>Logo-Dateien (optional, in Supabase Storage)</li>
            <li>Dokument-Entwürfe — temporär im lokalen Browser-Speicher (localStorage) für die aktive Sitzung</li>
          </ul>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. Zweck der Datenverarbeitung</h2>
          <p>
            Die erhobenen Daten werden ausschliesslich zur Bereitstellung der Offertio-Dienste verwendet:
            Erstellung und Versand von Offerten und Rechnungen, Profilanzeige auf Dokumenten,
            Dokumentenarchivierung sowie Authentifizierung.
          </p>
          <p style={{ marginTop: 8 }}>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und lit. c (gesetzliche Verpflichtung —
            steuerliche Aufbewahrungspflichten gemäss Art. 70 MWSTG / §147 AO / §132 BAO).
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. Datenspeicherung und Aufbewahrung</h2>
          <p>
            Profildaten, Kundendaten und Dokument-Metadaten werden in einer Supabase-Datenbank
            (Hosting: EU/CH) gespeichert. Generierte PDF-Dokumente werden in Supabase Storage (EU/CH) abgelegt.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Gesetzliche Aufbewahrungspflichten:</strong> Als Nutzer sind Sie verpflichtet,
            Ihre Rechnungen während der gesetzlich vorgeschriebenen Frist aufzubewahren:
            Schweiz 10 Jahre (Art. 958f OR / Art. 70 MWSTG), Deutschland 10 Jahre (§147 AO),
            Österreich 7 Jahre (§132 BAO). Bitte laden Sie Ihre Dokumente regelmässig herunter.
          </p>
          <p style={{ marginTop: 8 }}>
            Dokument-Entwürfe werden temporär im lokalen Browser-Speicher (localStorage) gespeichert
            und beim Abschliessen oder Verwerfen des Dokuments gelöscht.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>5. Auftragsverarbeitung</h2>
          <p>
            Offertio nutzt folgende Auftragsverarbeiter, mit denen Datenschutzverträge (DPA/AVV) bestehen:
          </p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong>Supabase Inc.</strong> — Datenbank, Authentifizierung und Dateispeicherung (EU-Hosting)</li>
            <li><strong>Resend Inc.</strong> — Transaktionaler E-Mail-Versand (beim Senden von Offerten/Rechnungen)</li>
          </ul>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>6. E-Mail-Versand</h2>
          <p>
            Wenn Sie eine Offerte oder Rechnung per E-Mail senden, wird das generierte PDF über
            den Dienst Resend (resend.com) an die angegebene Empfänger-E-Mail-Adresse übermittelt.
            Als Absendername erscheint Ihr Firmenname. Antworten auf diese E-Mails werden direkt
            an Ihre registrierte E-Mail-Adresse weitergeleitet.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>7. Cookies & Tracking</h2>
          <p>
            Offertio verwendet keine Marketing-Cookies oder Tracking-Dienste von Drittanbietern.
            Es werden nur technisch notwendige Cookies für die Authentifizierung eingesetzt
            (Supabase Auth Session).
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>8. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten (Art. 17 DSGVO / Art. 32 DSG).
            Bitte beachten Sie: Die Löschung Ihres Kontos entfernt Ihre Profildaten und Vorlagen.
            Dokumente, für die gesetzliche Aufbewahrungspflichten gelten, müssen Sie vor der Kontolöschung
            selbst sichern. Sie können Ihr Konto jederzeit in den Einstellungen löschen.
          </p>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>9. Kontakt</h2>
          <p>
            Bei Fragen zum Datenschutz kontaktieren Sie uns unter: datenschutz@offertio.ch
          </p>
        </div>
      </div>
    </div>
  );
}

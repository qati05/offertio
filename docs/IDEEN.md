# Offertio — Ideenpapier

**Stand:** 28. August 2026 · **Status:** Vorschlag, nichts davon ist umgesetzt

Jede Idee trägt eine Kennzeichnung, woher die Begründung kommt:

| Kennzeichen | Bedeutung |
| --- | --- |
| `[AUDIT]` | Konkrete Lücke, die ich im Code oder im Audit gefunden habe — mit Fundstelle |
| `[WETTBEWERB]` | Vergleich mit einer öffentlich dokumentierten Funktion, mit Quelle |
| `[VERMUTUNG]` | **Unbelegte Vermutung, noch nicht durch Nutzerfeedback bestätigt** |

Ausgeschlossen laut deiner Vorgabe und hier nicht enthalten: Zahlungsabwicklung
für Kundenzahlungen, individuell pro Kunde gebaute Versionen, Angebotserstellung
aus einem Foto per KI.

Eine Sache habe ich bewusst **nicht** vorgeschlagen: Umsatz-Charts oder
Geldbeträge auf Dashboard und Verlauf. `src/__tests__/no-money-history.test.ts`
formuliert das ausdrücklich als Produktmandat („Under NO circumstances should a
monetary amount appear in the History or Overview UI") und schützt es mit Tests.
Das habe ich als Entscheidung respektiert, nicht als Lücke gelesen.

---

## Auf einen Blick

| # | Idee | Aufwand | Nutzen | Grundlage |
| --- | --- | --- | --- | --- |
| 1 | CI-Pipeline einrichten | klein | **sehr hoch** | `[AUDIT]` |
| 2 | Free-Limit serverseitig durchsetzen | klein | hoch | `[AUDIT]` |
| 3 | „Serie fällig"-Hinweis im Dashboard | klein | hoch | `[AUDIT]` |
| 4 | Preise auf 2 Dezimalstellen begrenzen | klein | mittel | `[AUDIT]` |
| 5 | Monatsserie am Anker-Tag halten | klein | mittel | `[AUDIT]` |
| 6 | Webhook-Rate-Limit anheben | klein | mittel | `[AUDIT]` |
| 7 | `video/` aus dem App-Repo lösen | klein | mittel | `[AUDIT]` |
| 8 | Rechnungs-Unveränderbarkeit + Storno | mittel | **sehr hoch** | `[AUDIT]` + `[WETTBEWERB]` |
| 9 | Fehler-Monitoring | mittel | hoch | `[AUDIT]` |
| 10 | Middleware-Roundtrip pro Seitenaufruf | mittel | mittel | `[AUDIT]` |
| 11 | Bundle von `/dokument/neu` verkleinern | mittel | mittel | `[AUDIT]` |
| 12 | Echte EN-16931-Validierung im Test | mittel | hoch | `[AUDIT]` |
| 13 | Wiederkehrende Rechnungen automatisieren | mittel | offen | `[WETTBEWERB]` |
| 14 | §13b Reverse Charge | gross | hoch | `[AUDIT]` |
| 15 | Gemischte MWST-Sätze | gross | offen | `[AUDIT]` |
| 16 | XRechnung für Behördenaufträge | gross | unbekannt | `[AUDIT]` |

---

## Klein — je etwa ein bis vier Stunden

### 1. CI-Pipeline einrichten · Nutzen: sehr hoch

`[AUDIT]` Es gibt **kein `.github/workflows`-Verzeichnis**. Die 641 Unit-Tests
und 16 E2E-Tests laufen ausschliesslich dann, wenn du sie lokal startest.

Zwei Details, die ich beim Testen dieser Woche selbst getroffen habe und die in
die Konfiguration gehören:

- `npx playwright install chromium` muss im Workflow stehen. Ohne das scheitern
  alle E2E-Tests mit einem Fehlerbild, das nach einem Code-Defekt aussieht,
  aber nur die fehlende Browser-Binary ist.
- `E2E_USER_EMAIL` und `E2E_USER_PASSWORD` als Secrets hinterlegen. Ohne sie
  überspringt `playwright.config.ts` die gesamte authentifizierte Suite — der
  komplette angemeldete App-Flow ist damit bis heute **nie** in einem Testlauf
  gewesen, obwohl die Tests existieren.

Das ist für mich der klarste Kandidat, mit dem du anfangen solltest. Ein
Nachmittag, und danach fängt die Testsuite Fehler ab, statt darauf zu warten,
dass du sie manuell startest.

### 2. Free-Limit serverseitig durchsetzen · Nutzen: hoch

`[AUDIT]` Fund H1. `/api/dokument/save` prüft weder Plan noch Kontingent. Die
Begrenzung greift nur, weil der Client vorher freiwillig
`/api/dokument/check-limit` aufruft. Ein direkter POST erzeugt unbegrenzt
Dokumente im Free-Plan.

Zusammen erledigen mit Fund M5: `payment.ts` zählt Dokumente zusätzlich in
`localStorage`, die Datenbank zählt sie in `dokument_counter`. Zwei Zähler für
dieselbe Wahrheit, die auseinanderlaufen, sobald jemand den Browser wechselt.
Der Client-Zähler kann weg, sobald der Server verbindlich prüft.

### 3. „Serie fällig"-Hinweis im Dashboard · Nutzen: hoch

`[AUDIT]` Funde M1 und M2. Wiederkehrende Rechnungen entstehen nur, wenn jemand
auf der Einstellungsseite einen Knopf drückt, und ein Klick holt genau eine
Periode auf. Wer drei Monate nicht geklickt hat, braucht drei Klicks — ohne dass
irgendwo steht, dass etwas offen ist.

Ein Badge „2 Serien fällig" auf dem Dashboard kostet einen Bruchteil einer
echten Automatik (Idee 13) und schliesst die eigentliche Gefahr: dass eine
Rechnung stillschweigend gar nicht entsteht.

Passt zum Mandat aus Idee 0 — ein Zähler ist kein Geldbetrag.

### 4. Preise auf 2 Dezimalstellen begrenzen · Nutzen: mittel

`[AUDIT]` Beim C3-Fix dokumentiert und bewusst offen gelassen: PDF und ZUGFeRD-XML
können bei Stückpreisen mit mehr als zwei Nachkommastellen um einen Rappen
auseinanderlaufen. Das PDF summiert ungerundete Produkte, EN 16931 zwingt das XML
auf die gerundeten Zeilenbeträge. Weder Client noch `/api/dokument/save` begrenzt
heute die Nachkommastellen.

Eine Validierung auf zwei Dezimalstellen macht den Fall unerreichbar, statt die
Divergenz nachträglich irgendwo zu reparieren. Deutlich billiger und sicherer,
als die PDF-Rechnung anzufassen — die speist den QR-Rechnungsbetrag.

### 5. Monatsserie am Anker-Tag halten · Nutzen: mittel

`[AUDIT]` Fund M3, nachgewiesen: eine Serie ab dem 31. Januar läuft
`31.01 → 28.02 → 28.03 → 28.04 …`. Der Februar-Überlauf wird korrekt gekappt,
aber danach rechnet die Funktion vom neuen Datum weiter statt vom ursprünglichen
Monatstag. Wer „immer am Monatsletzten" erwartet, bekommt ab März dauerhaft den 28.

Kein Rechtsproblem, aber sichtbar falsch, sobald jemand eine Serie laufen hat.

### 6. Webhook-Rate-Limit anheben · Nutzen: mittel

`[AUDIT]` Fund M6. 30 Zustellungen pro Minute pro Quell-IP. Lemon Squeezy liefert
aus geteilter Infrastruktur; bei mehreren Käufen gleichzeitig oder einem
Retry-Sturm kann das greifen. Lemon Squeezy wiederholt zwar, aber jede abgewiesene
Lieferung verzögert eine Freischaltung — und Freischaltung ist der Pfad, bei dem
Verzögerung am teuersten ist.

### 7. `video/` aus dem App-Repo lösen · Nutzen: mittel

`[AUDIT]` Nach dem Aufräumen liegen dort immer noch rund **20 MB** getrackte
Marketing-Artefakte: drei MP4-Renders (15 MB), eine `narration.wav` (1,2 MB) und
gut 100 Screenshots (3,1 MB). Jeder Klon und jeder CI-Checkout bezahlt das mit.

Ich habe diese Dateien bewusst **nicht** gelöscht — das sind deine
Marketing-Assets, und ob sie noch gebraucht werden, entscheidest du. Optionen:
eigenes Repo, Git LFS, oder schlicht untracken und lokal behalten. Relevant wird
das genau dann, wenn Idee 1 kommt: CI zieht das bei jedem Lauf mit.

---

## Mittel — je etwa einen halben bis ganzen Arbeitstag

### 8. Rechnungs-Unveränderbarkeit und Storno · Nutzen: sehr hoch

`[AUDIT]` `/api/dokument/save` aktualisiert über `existingDocumentId` und prüft
dabei die Eigentümerschaft (`user_id`), aber **nicht den aktuellen Status**. Eine
bereits auf `gesendet` gesetzte Rechnung lässt sich damit still überschreiben —
Betrag, Positionen, Nummer, Kunde. Es gibt im ganzen Repository keinen
Storno-Begriff (kein Treffer für `storno`, `festgeschrieben` oder ein
Unveränderbarkeits-Konzept auf `dokumente`).

`[WETTBEWERB]` Lexware Office beschreibt den Gegenentwurf öffentlich: abgeschlossene
Rechnungen werden storniert statt bearbeitet, das Original bleibt unverändert,
und die stornierte Rechnungsnummer bleibt dauerhaft gesperrt — ausdrücklich mit
Verweis auf GoBD und § 146 AO.
Quelle: [help.lexware.de — Abgeschlossene Rechnungen stornieren und neu ausstellen](https://help.lexware.de/de-form/articles/548199-abgeschlossene-rechnungen-stornieren-und-neu-ausstellen)

Von allen offenen Punkten ist das der, der am ehesten zu deinem eigenen Massstab
passt: Fehler in der Compliance-Logik sind schlimmer als ein fehlendes Feature.
Eine ausgestellte Rechnung, die sich nachträglich unbemerkt ändern lässt, ist
genau so ein Fehler.

Was ich **nicht** weiss: ob deine Testkunden je eine Rechnung korrigieren müssen
und wie oft. Der Fix ist trotzdem billig — ein Status-Guard im Save-Pfad ist
klein; ein vollständiger Storno-Workflow mit gesperrter Nummer ist der mittlere
Teil.

### 9. Fehler-Monitoring · Nutzen: hoch

`[AUDIT]` `src/lib/logger.ts` schreibt strukturiert auf die Konsole, und die
API-Routen nutzen das konsequent — aber es gibt keine Aggregation. Sobald echte
Kunden da sind, siehst du einen fehlgeschlagenen PDF-Upload, eine abgelehnte
Webhook-Zustellung oder einen 500er in `/api/dokument/save` nur, wenn dir jemand
schreibt.

Ich weiss nicht, was dein Hosting an Log-Zugriff bietet und ob dort schon etwas
mitläuft — das solltest du prüfen, bevor du ein Werkzeug dazunimmst.

### 10. Middleware-Roundtrip pro Seitenaufruf · Nutzen: mittel

`[AUDIT]` `src/middleware.ts` ruft bei jedem geschützten Request
`supabase.auth.getUser()` auf und macht bei jedem Seitenaufruf ausserhalb von
`/onboarding`, `/einstellungen` und `/api` zusätzlich ein `SELECT` auf `profiles`,
nur um `onboarding_complete` zu lesen. Das sind zwei Netzwerk-Roundtrips vor
jedem Seitenwechsel — für ein Flag, das sich nach dem Onboarding nie wieder ändert.

**Ehrlich dazu:** Ich habe die tatsächliche Latenz **nicht gemessen**. Ich sehe
den Roundtrip im Code, nicht seine Kosten in deiner Produktion. Vor einem Umbau
gehört eine Messung.

### 11. Bundle von `/dokument/neu` verkleinern · Nutzen: mittel

`[AUDIT]` Aus dem Production-Build dieser Session: `/dokument/neu` ist mit
**44,7 kB** die mit Abstand grösste Route — die zweitgrösste (`/dashboard`) liegt
bei 7,75 kB, also rund ein Sechstel. Dazu 102 kB gemeinsames First-Load-JS.

Das ist genau der Bildschirm, auf dem deine Nutzer arbeiten, und dein eigenes
Produktprinzip 5 sagt „Mobile is the real environment" — also oft mobile
Verbindung auf der Baustelle. `@react-pdf/renderer` und die Vorschau sind die
naheliegenden Kandidaten zum Nachladen.

`[VERMUTUNG]` **Unbelegte Vermutung, noch nicht durch Nutzerfeedback bestätigt:**
dass die Ladezeit dieser Seite für deine Nutzer spürbar stört. Die Bundle-Zahl ist
gemessen, die Nutzerwirkung ist es nicht.

### 12. Echte EN-16931-Validierung im Test · Nutzen: hoch

`[AUDIT]` Fund M4. Die ZUGFeRD-Tests prüfen überwiegend, ob Zeichenketten im XML
vorkommen. Genau deshalb konnte C3 — der BR-CO-10-Verstoss bei aktivem Rabatt —
32 Tests lang unentdeckt bleiben. Mit dem C3-Fix prüfe ich die Summenregeln jetzt
direkt, aber nur die, an die ich gedacht habe.

Der Vollausbau: die offiziellen Schematron-Artefakte aus
[ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931)
im Test gegen das erzeugte XML laufen lassen. Dann fällt die ganze Regelklasse auf,
nicht nur die Regeln, die jemand von Hand nachgebaut hat. Besonders wertvoll, bevor
§13b dazukommt (Idee 14), weil dort zehn weitere BR-AE-Regeln greifen.

### 13. Wiederkehrende Rechnungen automatisieren · Nutzen: offen

`[WETTBEWERB]` sevdesk dokumentiert öffentlich, dass wiederkehrende Rechnungen in
den eingestellten Intervallen automatisch erzeugt **und** auf Wunsch automatisch
per E-Mail versendet werden.
Quelle: [hilfe.sevdesk.de — Wiederkehrende Rechnung](https://hilfe.sevdesk.de/de/articles/66938-wiederkehrende-rechnung)

Bei Offertio braucht es dafür einen Cron plus Service-Token. Der automatische
Versand ist zusätzlich nicht trivial, weil Offertio bewusst gar nicht selbst
mailt, sondern über `mailto:` an das Mailprogramm des Nutzers übergibt — Versand
ohne anwesenden Nutzer würde diese Architekturentscheidung aufmachen.

**Hinweis:** Du hast das bereits einmal zurückgestellt. Es steht hier nur der
Vollständigkeit halber, nicht als erneuter Vorschlag. Idee 3 ist der billige
Teil davon und deckt das eigentliche Risiko ab.

---

## Gross — mehrere Wochen bei 10 bis 15 Stunden

### 14. §13b Reverse Charge · Nutzen: hoch

`[AUDIT]` Fund H3. Konzept liegt dir vor, Recherche ist abgeschlossen, wartet auf
dein Go. Wichtigste Nebenwirkung aus der Recherche: BR-AE-02/03/04 verlangen die
USt-IdNr. **beider** Seiten — ein Nutzer mit nur einer Steuernummer kann keine
gültige §13b-E-Rechnung erzeugen.

### 15. Gemischte MWST-Sätze · Nutzen: offen

`[AUDIT]` Fund H4. `mwstSatz` ist eine Zahl pro Dokument, Positionen tragen keinen
eigenen Satz. Eine deutsche Rechnung mit 19 % und 7 % nebeneinander ist nicht
ausstellbar. Der Umbau zieht sich durch Datenmodell, PDF, ZUGFeRD und QR-Bill.

Du hast das zurückgestellt. Ich weiss nicht, wie viele deiner Zielkunden mit
Materialanteil arbeiten — das beantworten deine ersten fünf Testkunden besser als
jede Schätzung von mir.

### 16. XRechnung für Behördenaufträge · Nutzen: unbekannt

`[AUDIT]` Es gibt kein XRechnung-Profil. ZUGFeRD BASIC deckt B2B ab, für deutsche
Behördenaufträge ist XRechnung aber das geforderte Format. Für Österreich fehlt
jedes E-Rechnungsformat (kein ebInterface, kein Peppol).

`[VERMUTUNG]` **Unbelegte Vermutung, noch nicht durch Nutzerfeedback bestätigt:**
ob Handwerks- und Reinigungsbetriebe deiner Grösse überhaupt öffentliche Aufträge
abrechnen. Wenn keiner deiner Testkunden das tut, ist die Idee wertlos — und das
weiss ich nicht.

---

## Was ich ausdrücklich nicht weiss

Ich habe keinen Zugriff auf Nutzungsdaten, Analytics oder Kundengespräche. Zu
folgenden Fragen habe ich **keine** Grundlage und rate bewusst nicht:

- Ob fünf Dokumente pro Monat die richtige Free-Grenze sind
- Wie oft Rechnungen nachträglich korrigiert werden müssen (relevant für Idee 8)
- Ob deine Nutzer mobil oder am Schreibtisch arbeiten (relevant für Idee 11)
- Ob Serien überhaupt genutzt werden, und in welcher Frequenz (Ideen 3 und 13)
- Ob das Mahnwesen benutzt wird
- Ob jemand grenzüberschreitend oder für die öffentliche Hand abrechnet
  (Ideen 14 und 16)

Die billigste Antwort auf fast alle diese Fragen sind deine ersten fünf
Testkunden, nicht ein weiteres Feature.

---

## Vorschlag für die Reihenfolge

Wenn ich die Woche einteilen müsste — nur ein Vorschlag, entscheiden musst du:

1. **Woche 1:** Idee 1 (CI). Danach arbeitet die Testsuite für dich statt auf Zuruf.
2. **Woche 2:** Ideen 2, 4, 5, 6 — vier kleine, abgegrenzte Korrekturen aus dem
   Audit, die zusammen in einen Arbeitstag passen.
3. **Woche 3–4:** Idee 8 (Unveränderbarkeit/Storno). Der Punkt, der deinem
   eigenen Compliance-Massstab am nächsten kommt.
4. **Danach:** Idee 12 als Absicherung, bevor §13b (Idee 14) dazukommt.

Ideen 3 und 7 sind Lückenfüller — jederzeit einschiebbar, wenn eine Woche kürzer
ausfällt.

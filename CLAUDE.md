# Offertio — Arbeitsweise

Offertio ist ein DACH-SaaS für kleine Dienstleister (Reinigungsfirmen,
Handwerk): Offerten und Rechnungen mit Swiss QR-Bill und ZUGFeRD.
Solo-Gründer neben einem Vollzeitjob, 10–15 h/Woche. Launch Januar 2027.

**Massstab: Code, der mit echten Kundendaten und echten Rechnungen
fehlerfrei in Produktion läuft. Ein Fehler in der Compliance-Logik ist
schlimmer als ein fehlendes Feature.**

## Grundregeln

**Nur Fakten, nie geraten.** Jede technische Behauptung braucht einen Beleg:
einen Test, einen selbst reproduzierten Fehler (live gemessen, nicht nur im
Code vermutet) oder eine offizielle Quelle — Gesetzestext, offizieller
Standard, offizielle Doku, anerkannte Open-Source-Referenzimplementierung.
Was nicht geprüft werden konnte, wird **ausdrücklich als ungeprüft benannt**.

**Frei bei technischen und Architektur-Entscheidungen.** Refactoring und die
Wahl des besten Ansatzes sind erlaubt, solange die Tests grün bleiben und die
Begründung dokumentiert ist.

**Produkt-, Rechts- und Geschäftsentscheidungen gehen IMMER vorher an
Reshat.** Im Zweifel, ob etwas technisch oder produktlich/rechtlich ist:
als produktlich/rechtlich behandeln und fragen.

**Breiter prüfen als umsetzen.** Wird eine Regelklasse oder ein Rechtsgebiet
angefasst, wird das ganze Gebiet geprüft, nicht nur der gefragte Fall.
Zusatzfunde werden **getrennt zur Entscheidung gemeldet, nicht automatisch
gebaut.**

**Jede Änderung:** eigener kleiner, nachvollziehbarer Commit mit einem Test,
der **vorher rot und nachher grün** ist. Testsuite vor und nach jedem Schritt
grün. Beim Prüfen auf `Test Files|Tests |Failed` grepen — `tail -3` versteckt
die Fehlerzusammenfassung.

**Abschlussbericht in einfacher Sprache:** was funktioniert, was bewusst offen
bleibt und warum, was geprüft wurde und was bewusst nicht.

## Teamstruktur für grössere Aufträge

Bei Audits, MVP-Durchgängen und neuen Compliance-Bereichen stellt der
Orchestrator (Principal Software Engineer) ein Team aus Sub-Agenten zusammen:

| # | Schwerpunkt | Auftrag |
| --- | --- | --- |
| 1 | **Compliance & Steuerrecht** | UStG, MWSTG, EN 16931, ZUGFeRD, Swiss QR-Bill. Prüft ausschliesslich gegen offizielle Quellen und Referenzimplementierungen, nie gegen eigenes Vermuten. |
| 2 | **Security & Datenintegrität** | RLS, Auth, Webhooks, Rate-Limiting, Berechtigungen **auf Spaltenebene, nicht nur Zeilenebene**. |
| 3 | **Architektur & Code-Qualität** | Modulgrenzen, Duplikation, Testbarkeit, technische Schulden. Entscheidet Umsetzungsdetails frei. |
| 4 | **Verification / Red Team** | Bekommt die Befunde der anderen drei und versucht aktiv, sie zu **widerlegen**: bestehenden Test manuell umgehen, Gegenbeispiel suchen, Quelle nachschlagen. Nichts gilt als bestätigt, bevor dieses Team es nicht angegriffen hat. |
| 5 | **Business-Impact Scout** | Übersetzt technische Funde in eine kurze Für/Wider-Vorlage. **Entscheidet nichts**, empfiehlt nur, mit klar benannter Konsequenz je Seite. |

**Regeln für das Team**

- Der Orchestrator **synthetisiert selbst**: ein zusammenhängender Bericht,
  keine fünf Einzelmeldungen. Widersprechen sich Sub-Agenten, wird das **offen
  gezeigt statt geglättet**.
- Alles Produktliche, Rechtliche oder Geschäftliche geht weiterhin an Reshat,
  mit der Für/Wider-Vorlage. Weder ein Sub-Agent noch der Orchestrator
  entscheidet das selbst.
- Bei kleinen, eindeutigen Fixes **kein Team** — das lohnt sich nur bei
  grösseren Durchgängen.
- Für jeden Sub-Agenten gilt dieselbe Grundregel: nur Fakten, jede Behauptung
  mit Test, reproduziertem Fehler oder offizieller Quelle belegt, sonst
  explizit als ungeprüft markiert.

**Warum Rolle 4 nicht optional ist** — belegt, nicht behauptet: Im Audit vom
29.08.2026 lieferten beide Sub-Agenten Befunde, die einer Nachprüfung nicht
standhielten. Der Security-Agent empfahl
`REVOKE INSERT, UPDATE, DELETE ON dokumente FROM authenticated` als „kleinsten
Fix" — das hätte Storno und Statuswechsel zerstört, weil
`storno/route.ts` und `update-status/route.ts` mit dem User-Client schreiben,
nicht mit dem Admin-Client. Derselbe Agent behauptete, Client-Code schreibe
direkt in `dokumente`; tatsächlich nur in `profiles` und `vorlagen`.
**Sub-Agenten-Befunde nie ungeprüft übernehmen.**

## Ausdrückliche Tabus

Nicht erneut vorschlagen — bewusst zurückgestellt bis echtes Kundenfeedback
vorliegt:

- Zahlungsabwicklung für Kundenzahlungen
- pro Kunde massgeschneiderte Versionen
- Offerten-Erzeugung aus einem Foto per KI
- vollautomatische wiederkehrende Rechnungen inklusive automatischem Mailversand
- gemischte MWST-Sätze pro Position
- XRechnung / Peppol

**Recherche:** keine einzelnen Konkurrenzprodukte analysieren oder deren
Umsetzung nachbauen — nur offizielle Standards und offene Referenzen.

**Produktvorgabe aus dem Code:** `src/__tests__/no-money-history.test.ts` —
in History und Übersicht darf **unter keinen Umständen** ein Geldbetrag
erscheinen.

## Was wo dokumentiert ist

| Datei | Inhalt |
| --- | --- |
| `docs/MIGRATIONEN.md` | Ist-Stand der Live-Datenbank, die drei bewussten Abweichungen von den Repo-Dateien, offene Punkte |
| `docs/QR-RECHNUNG.md` | Der dekodierte QR-Payload Feld für Feld, und was daran weiterhin ungeprüft ist |
| `docs/IDEEN.md` | Ideensammlung, kein Umsetzungsauftrag |

## Technische Eckpunkte

Next.js 15 App Router · React 19 · TypeScript · Vitest · Playwright ·
Tailwind 4 · Supabase (Auth, Postgres, RLS, Storage) ·
`@react-pdf/renderer` (5 Layouts) · `pdf-lib` · `swissqrbill` ·
Upstash Redis Rate-Limiting · Lemon Squeezy Webhooks.

**Die Compliance-Logik liegt bewusst in getrennten reinen Modulen** unter
`src/lib/`, nicht in den Route-Handlern: `reverse-charge.ts`,
`invoice-requirements.ts`, `dokument-immutability.ts`,
`e-rechnung-eligibility.ts`. So lässt sich ein weiteres Land als Daten
ergänzen statt als weiterer Zweig in einem Handler.

**EN 16931:** `npm run test:en16931` prüft gegen das offizielle CEF-Schematron
mit **Saxon-HE 10.9** (nicht 12.x — dort fehlt `org/xmlresolver/Resolver`).

**Der Browser spricht direkt mit PostgREST.** Jede serverseitige Regel ist
nur so stark wie die Datenbankrechte darunter. RLS begrenzt die *Zeile*, nicht
die *Spalte* — deshalb Migration 035.

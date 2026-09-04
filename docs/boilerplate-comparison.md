# Offertio gegen drei SaaS-Boilerplates

Stand **04.09.2026**. Verglichen wurde der Ist-Zustand von Offertio mit drei
offenen Referenz-Projekten. Jede Aussage hier ist entweder gemessen, live
reproduziert oder aus der Datei zitiert, die im Repo liegt. Was nicht geprüft
werden konnte, steht unter „Ungeprüft".

## Was tatsächlich lief

Alle drei wurden installiert und **gestartet**, nicht nur gelesen:

| Projekt | Commit | Next.js | Dev-Server | Belegt durch |
| --- | --- | --- | --- | --- |
| `nextjs/saas-starter` | `6e33e58` | 15.6.0-canary.59 | Port 3101 | `HTTP 200` |
| `ixartz/SaaS-Boilerplate` | `e3952a7` | 16.2.9 | Port 3102 | `HTTP 200` |
| `ixartz/Next-js-Boilerplate` | `1dffa39` | 16.3.1 | Port 3103 | `HTTP 200` |

Datenbanken dazu: PostgreSQL 16.13 lokal für `saas-starter` und
`Next-js-Boilerplate`, PGlite für `SaaS-Boilerplate`. Migrationen liefen in
allen drei durch.

**Zwei Abweichungen, die ich benenne statt zu verschweigen:**

1. `Next-js-Boilerplate` verlangt Node ≥ 24 (`engines`). Verfügbar war Node
   22.22.2. Der Dev-Server startete trotzdem und lieferte HTTP 200. Ob unter
   Node 24 etwas anders liefe: **ungeprüft**.
2. `npm ci` scheitert bei `Next-js-Boilerplate` an dessen **eigenem** Lockfile:

   ```
   npm error `npm ci` can only install packages when your package.json and
   package-lock.json ... are in sync.
   npm error Missing: typescript@5.9.3 from lock file
   ```

   Installiert wurde deshalb mit `npm install`. Das ist ein Mangel des
   Boilerplates, kein Umgebungsproblem — ein frischer CI-Lauf dieses Projekts
   müsste an derselben Stelle brechen.

## Die wichtigste Korrektur vorweg

Die Aufgabe beschrieb `ixartz/SaaS-Boilerplate` als „Multi-Tenancy,
Rollen/Rechte, oRPC". **Das ist im offenen Repo nicht enthalten.** Es sind die
Verkaufsargumente der kostenpflichtigen Pro-Version. Aus der `.env` des Repos:

```
# Need advanced features? Next.js 16 & React 19, Multi-tenancy & Teams,
# Roles & Permissions, Shadcn UI, End-to-End Typesafety with oRPC,
# Stripe Payment ... Try Next.js Boilerplate Pro
```

Was im offenen Repo wirklich steht (`src/types/Auth.ts`):

```ts
export const ORG_PERMISSION = {
  // Add Organization Permissions here
} as const;
```

Ein **leeres Objekt**. Das Rechtemodell ist ein Kommentar. Rollen sind zwei
Zeichenketten (`org:admin`, `org:member`), die an Clerk durchgereicht werden.
Das gesamte Datenbankschema (`src/models/Schema.ts`) ist **eine Tabelle**:

```ts
export const todoSchema = pgTable('todo', {
  id: serial('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  ...
```

Mandantentrennung findet nicht in der Datenbank statt, sondern bei Clerk, einem
gehosteten US-Dienst. Es gibt kein RLS und keine Spaltenrechte.

Damit fällt der Hauptgrund weg, aus dem dieses Boilerplate im Auftrag stand.

## Vergleich je Dimension

### 1. Auth und Session

| | Offertio | saas-starter | ixartz (beide) |
| --- | --- | --- | --- |
| Verfahren | Supabase Auth (GoTrue) | selbstgebautes JWT im Cookie | Clerk (gehostet) |
| Widerruf | serverseitig möglich | **nicht möglich** | bei Clerk |
| Passwort-Reset, Mailbestätigung, MFA | vorhanden | keins davon | bei Clerk |

`saas-starter/lib/auth/session.ts` signiert ein JWT mit `AUTH_SECRET` und legt
es in ein Cookie. Abmelden löscht das Cookie — **das Token bleibt bis zum
Ablauf gültig**, wenn es jemand abgegriffen hat. Es gibt keine Rotation und
keine serverseitige Sperrliste. Die Middleware verlängert die Sitzung bei jedem
GET.

Für Offertio ist das ein klarer Rückschritt. **Keine Übernahme.**

### 2. Mandantentrennung und Berechtigungen

Das ist Offertios stärkster Punkt und der grösste Abstand zu allen dreien.

`saas-starter/lib/db/queries.ts` trennt Mandanten ausschliesslich über die
`WHERE`-Klausel jeder einzelnen Abfrage:

```ts
.where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
.where(eq(activityLogs.userId, user.id))
```

**Eine vergessene `WHERE`-Klausel und fremde Daten gehen raus.** Es gibt keine
zweite Verteidigungslinie in der Datenbank.

Offertio hat RLS, Spaltenrechte (Migration 035) und Trigger, die eine gestellte
Rechnung auch dann unveränderbar halten, wenn der Browser direkt mit PostgREST
spricht (039/040). Kein Boilerplate hat etwas Vergleichbares. **Keine
Übernahme, in keiner Richtung.**

### 3. Ordnerstruktur

`ixartz/SaaS-Boilerplate` gruppiert nach Fachlichkeit (`src/features/billing`,
`/dashboard`, `/landing`) statt nach Technik. Das ist bei wachsender Codebasis
sauberer als ein flaches `src/components`.

Offertio liegt bereits dazwischen: die Compliance-Logik ist in reine Module
unter `src/lib/` getrennt (`reverse-charge.ts`, `invoice-requirements.ts`,
`dokument-immutability.ts`, `e-rechnung-eligibility.ts`) — das ist genau das
Prinzip, nur an der Stelle angewandt, wo es zählt. `src/components` ist mit
fünf PDF-Layouts plus UI gemischt.

Nutzen einer Umstellung: mittel. Aufwand: hoch (jeder Import ändert sich).
Risiko für die Tests: hoch, weil mehrere Tests Quelldateien über ihren **Pfad**
einlesen und auf Muster prüfen. **Nicht umgesetzt, nicht empfohlen** — der
Gewinn steht in keinem Verhältnis, solange ein Entwickler am Projekt arbeitet.

### 4. Typsicherheit

Hier war ein echter Abstand, und der ist geschlossen (siehe „Umgesetzt").

Offertio hatte `strict: true` und sonst nichts. Beide ixartz-Projekte fahren
eine deutlich längere Liste. Gemessen gegen Offertios Code:

| Schalter | Fehler im Ist-Zustand |
| --- | --- |
| `noImplicitReturns` | 0 |
| `noFallthroughCasesInSwitch` | 0 |
| `useUnknownInCatchVariables` | 0 |
| `noUnusedParameters` | 1 |
| `noImplicitOverride` | 2 |
| `noUnusedLocals` | 15 |
| **`noUncheckedIndexedAccess`** | **146** |

Die ersten sechs sind übernommen. Der siebte nicht — dazu unten mehr.

Zur API-Schicht: beide ixartz-Projekte werben mit oRPC, haben es aber im
offenen Repo nicht. Offertio validiert Eingaben in den Route-Handlern mit Zod.
Ein durchgehend typisierter RPC-Layer wäre ein Gewinn, ist aber eine grosse
Umstellung ohne Bezug zum Januar-Launch. **Nicht empfohlen.**

### 5. Datenbank, ORM, Migrationen

Alle drei nutzen Drizzle ORM mit generierten Migrationen. Offertio nutzt
handgeschriebenes SQL (`supabase/migrations/000`–`040`) und den
Supabase-Client.

Drizzle wäre bei reinem CRUD angenehmer. Für Offertio wäre es ein **Rückschritt**:
Migrationen 035–040 bestehen aus `REVOKE`/`GRANT` auf Spaltenebene,
`SECURITY DEFINER`-Funktionen, `BEFORE UPDATE`/`BEFORE DELETE`-Triggern und
`NOT VALID`-Constraints. Genau das lässt sich mit einem Schema-Generator nicht
ausdrücken; man landet ohnehin bei rohem SQL, dann aber verteilt auf zwei
Werkzeuge. **Keine Übernahme.**

### 6. Testaufbau

| | Testdateien | Assertions | E2E | Coverage |
| --- | --- | --- | --- | --- |
| Offertio | 78 | 1037 | Playwright, 2 Suiten | keine |
| SaaS-Boilerplate | vorhanden | — | Playwright + Storybook + Chromatic | Codecov |
| Next-js-Boilerplate | vorhanden | — | Playwright | Codecov |
| **saas-starter** | **0** | **0** | **keine** | keine |

`saas-starter` hat **null devDependencies und keinen einzigen Test**. Als
Referenz für Testaufbau ist es wertlos.

Von `SaaS-Boilerplate` stammt der eine Gedanke, der wirklich getragen hat:
`vitest.config.ts` trennt Projekte nach Umgebung (`node` für Logik, Browser für
UI) statt alles in eine zu werfen. Gemessen an Offertio war das die grösste
Einzelbremse der Suite — siehe „Umgesetzt".

Was Offertio hat und keines der drei: eine Prüfung gegen das **offizielle
CEF-Schematron** (`npm run test:en16931`, Saxon-HE 10.9) und Angriffs-Skripte
gegen echtes PostgreSQL (`scripts/db/`).

### 7. Fehler-Tracking und Observability

`Next-js-Boilerplate` nutzt LogTape mit einem BetterStack-Sink, `SaaS-Boilerplate`
zusätzlich Sentry und Spotlight. Offertio hat `console.error` und sonst nichts.

Das ist eine echte Lücke — aber keine rein technische. Jedes dieser Werkzeuge
sendet Daten an einen Dritten, und in Offertio stecken Kundennamen,
Rechnungsbeträge und Adressen. Das ist eine **DSGVO-/revDSG-Entscheidung**, kein
Bibliotheks-Einbau. Geht an Reshat, nicht autonom.

Nebenbei aufgefallen: `Next-js-Boilerplate` legt sein BetterStack-Token in
`NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN` — eine mit `NEXT_PUBLIC_` beginnende
Variable landet im Browser-Bundle. Nicht nachbauen.

### 8. CI/CD

Offertios CI ist besser als erwartet und in Teilen besser als die Vorlagen: sie
hat fünf Jobs, `concurrency` mit `cancel-in-progress`, gecachte
EN-16931-Artefakte und eine authentifizierte E2E-Suite, die sich sauber
abschaltet, wenn die Secrets fehlen.

`saas-starter` hat **gar keine CI**.

Was die ixartz-CI besser macht: sie prüft Commit-Nachrichten (`commitlint`),
tote Abhängigkeiten (`knip`) und lädt Coverage hoch. Alle drei brauchen neue
Abhängigkeiten → Freigabe nötig.

### 9. Code-Qualität: Linting, Formatierung, Hooks

Hier hat Offertio eine reproduzierte Lücke. `npm run lint` **tut nichts**:

```
> next lint
`next lint` is deprecated and will be removed in Next.js 16.
? How would you like to configure ESLint?
❯  Strict (recommended)
```

Exit-Code 1, interaktive Rückfrage. Es gibt **keine ESLint-Konfiguration und
keine ESLint-Abhängigkeit** im Repo. Die CI umgeht das bewusst und dokumentiert
es im Workflow-Kommentar. Zwei Folgen:

1. Es findet heute keinerlei Lint-Prüfung statt.
2. `next lint` fällt in Next.js 16 weg — das blockiert später das Upgrade.

Beide ixartz-Projekte haben ausserdem `lefthook` (pre-commit) und `commitlint`.

Der Fix verlangt neue devDependencies → **Freigabe nötig**, siehe unten.

### 10. Env und Secrets

Beide ixartz-Projekte validieren Umgebungsvariablen beim Start mit
`@t3-oss/env-nextjs` + Zod. Offertio verwendet an drei Stellen ein
Nicht-Null-Versprechen an den Compiler:

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL!,      // supabase-browser.ts, supabase-server.ts, middleware.ts
```

Das `!` ist eine Behauptung, die zur Laufzeit niemand prüft. **Ich habe
nachgesehen, was heute wirklich passiert**, statt es zu vermuten:

```
threw: @supabase/ssr: Your project's URL and API key are required
       to create a Supabase client!
```

Also: es kracht, und zwar mit einer brauchbaren Meldung. Der Gewinn einer
Validierung ist deshalb **kleiner als es aussieht** — er läge nicht in der
besseren Meldung, sondern darin, dass der Fehler beim **Build** aufträte statt
bei jedem einzelnen Request in Produktion (die Middleware baut pro Request
einen Client). Das ist eine bewusste Verhaltensänderung: ein Deploy ohne
gesetzte Variable würde dann scheitern statt anzulaufen. Empfehlung unten,
nicht autonom umgesetzt.

`supabase-admin.ts` macht es übrigens bereits richtig und prüft explizit.

### 11. Billing

Nur dokumentiert, wie verlangt, **nicht eingebaut**.

`saas-starter` und die Pro-Versionen nutzen Stripe mit Customer Portal und
Webhooks. Offertio nutzt Lemon Squeezy; die Kündigung läuft heute über den Link
in der Bestellbestätigung, weil es keinen Endpunkt dafür gibt.

Der eine übertragbare Gedanke: Stripes Customer Portal ist eine gehostete
Seite, auf die man nur verlinkt — Lemon Squeezy hat ein Gegenstück. Das wäre
ein kleiner Gewinn für die Abo-Seite. **Produktentscheidung, geht an Reshat.**

---

## Umgesetzt (2 Commits)

Beides ist reine Infrastruktur: keine Geschäftslogik, keine Compliance-Logik,
kein Datenmodell, keine neue Abhängigkeit.

### A. Strengere Compiler-Schalter

Sechs Schalter zusätzlich zu `strict`, jeder vorher einzeln gegen die Codebasis
gemessen (Tabelle oben). Nach dem Entfernen des toten Codes, den sie
aufgedeckt haben: 0 Fehler.

Der Test dazu (`src/__tests__/tsconfig-strictness.test.ts`) übersetzt Schnipsel
über die TypeScript-Compiler-API mit der **echten** `tsconfig.json` und prüft
die Diagnose-Codes. Ein Test, der nur `"noImplicitReturns": true` in der
JSON-Datei sucht, wäre auch grün, wenn der Schlüssel falsch geschrieben oder
anderswo überschrieben wäre.

Was die Schalter gefunden haben — jeder Fund von Hand nachgesehen, nicht blind
gelöscht:

- `OffertePDF.creditorAddress`: berechnet, nie gerendert. **Gezielt geprüft, ob
  im Zahlteil die Adresse fehlt** — tut sie nicht, der Zahlteil rendert
  `profil.adresse` / `plz` / `ort` direkt. Reiner Rest, kein Compliance-Fehler.
- `useOnlineStatus()` in `dokument/neu`: Hook aufgerufen, Rückgabewert nie
  gelesen.
- Drei E2E-Tests holen einen Wert und prüfen ihn nie.

### B. Testumgebung: `node` statt `jsdom`

Gemessen vorher, 76 Dateien:

```
Duration 31.29s (… tests 6.76s, environment 60.95s)
```

**61 Sekunden Rechenzeit für den Bau von DOMs, gegen knapp 7 Sekunden echte
Assertions.** Nur 7 von 78 Dateien brauchen überhaupt ein DOM.

Nachher: **15.06s**, Umgebung von 60.95s auf 5.85s. Dieselben Assertions,
keine umgeschrieben.

Das ist keine neue Konvention, sondern die vorhandene umgedreht: sieben Dateien
trugen bereits eine Umgebungs-Angabe, fünf davon um jsdom **abzuwählen**.

Ein Nebeneffekt, der benannt gehört: Code hinter `typeof window === "undefined"`
nimmt in Tests jetzt den Server-Zweig — der vorher nie ausgeführt wurde.

**Gesamtstand nach beiden Commits:** 78 Dateien, 1037 Tests grün,
`tsc --noEmit` sauber, `next build` erfolgreich.

---

## Bewertung je Vorschlag

| Verbesserung | Nutzen | Aufwand | Risiko | Tests |
| --- | --- | --- | --- | --- |
| Compiler-Schalter (6) | mittel | gering | gering | ✅ umgesetzt, grün |
| Testumgebung `node` | hoch | gering | gering | ✅ umgesetzt, grün |
| `noUncheckedIndexedAccess` | **hoch** | **hoch** (146) | **mittel** | offen |
| ESLint einrichten | hoch | mittel | gering | offen |
| Env-Validierung (Build-Zeit) | mittel | gering | **mittel** | offen |
| Fehler-Tracking | hoch | mittel | Datenschutz | offen |
| `knip`, `commitlint`, `lefthook` | gering | gering | gering | offen |
| Coverage-Bericht | gering | gering | gering | offen |
| Drizzle ORM | negativ | hoch | hoch | — |
| Clerk / Multi-Tenancy | negativ | hoch | hoch | — |
| Ordner nach Fachlichkeit | gering | hoch | **hoch** | — |

## Ungeprüft

- Verhalten von `Next-js-Boilerplate` unter Node 24 (nur Node 22 verfügbar).
- Die Testsuiten und E2E-Suiten der Boilerplates wurden **nicht ausgeführt** —
  sie brauchen Clerk-Secrets bzw. Docker-Images. Verglichen wurde ihr Aufbau,
  nicht ihr Ergebnis.
- Ob Offertios E2E-Suite nach dem Entfernen der drei toten Locals unverändert
  läuft: die authentifizierte Suite braucht Zugangsdaten, die hier nicht
  vorliegen. Playwright-`locator()` führt für sich genommen keine Aktion aus,
  die Änderung ist also verhaltensneutral — aber ausgeführt wurde sie nicht.

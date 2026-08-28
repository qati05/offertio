# Migrationen einspielen

Kurzanleitung für die ausstehenden Migrationen **032, 033, 034**. Diese drei
müssen eingespielt sein, **bevor** ein Kundentest läuft — ohne sie schlägt jedes
Speichern mit `steuerfall`, jede Stornierung und jede §13b-Rechnung fehl.

## Was die drei tun

| Datei | Inhalt |
| --- | --- |
| `032_reverse_charge_13b.sql` | Spalte `steuerfall`, USt-1-TG-Felder, §13b Abs. 2 Nr. 4 |
| `033_storno_und_unveraenderbarkeit.sql` | `storniert_at` / `storno_grund`, Status-Whitelist |
| `034_reverse_charge_13b_8.sql` | §13b Abs. 2 Nr. 8 (Gebäudereinigung) freischalten |

Reihenfolge ist zwingend: 034 erweitert einen Constraint, den 032 anlegt.

## Einspielen

Im Supabase-Dashboard → SQL Editor, **eine Datei nach der anderen**, in der
Reihenfolge oben. Nach jeder Datei prüfen, dass sie ohne Fehler durchlief,
bevor die nächste kommt.

Alternativ mit der Supabase CLI:

```bash
supabase db push
```

## Danach prüfen

```sql
-- Spalten vorhanden?
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'dokumente'
   AND column_name IN ('steuerfall','ust1tg_datum','ust1tg_referenz','storniert_at','storno_grund');
-- erwartet: 5 Zeilen

-- Constraints aktiv?
SELECT conname, convalidated FROM pg_constraint
 WHERE conrelid = 'public.dokumente'::regclass
   AND conname LIKE 'dokumente_%chk';

-- Bestandsdaten korrekt vorbelegt?
SELECT steuerfall, count(*) FROM public.dokumente GROUP BY 1;
-- erwartet: alle Altzeilen auf 'standard'
```

## Was vorab verifiziert wurde

Gegen eine echte PostgreSQL-16-Instanz, nicht nur gelesen:

- Alle 35 Migrationen laufen auf einer **leeren** Datenbank fehlerfrei durch.
- Der **reale Upgrade-Pfad** — Bestand auf Stand 031 mit Rechnungen in den
  Status `entwurf`, `gesendet`, `bezahlt`, `ueberfaellig` sowie einer Offerte,
  danach 032 → 033 → 034 — läuft sauber. Altdaten bleiben unverändert und
  bekommen `steuerfall = 'standard'`.
- Die neuen Constraints greifen tatsächlich: ein nicht freigeschalteter
  `steuerfall` wird abgewiesen, USt-1-TG-Felder auf einer Standardrechnung
  werden abgewiesen, `status = 'storniert'` ohne `storniert_at` wird abgewiesen,
  eine lebende Rechnung mit `storniert_at` wird abgewiesen, ein erfundener
  Status wird abgewiesen.

## Zwei bekannte Punkte

**Die Status-Whitelist ist `NOT VALID`.** Auf `dokumente.status` gab es nie
einen CHECK, also könnte eine historische Zeile einen Wert tragen, den die
Liste nicht kennt — ein validierender Constraint würde dann die ganze Migration
abbrechen. `NOT VALID` erzwingt die Regel für alle künftigen Schreibvorgänge und
lässt Altzeilen unangetastet. Nachträglich vollständig übernehmen:

```sql
SELECT DISTINCT status FROM public.dokumente;   -- erst ansehen
ALTER TABLE public.dokumente VALIDATE CONSTRAINT dokumente_status_chk;
```

**Vier ältere Migrationen sind nicht wiederholbar** (`000`, `001`, `013`,
`019`): sie legen Policies mit `CREATE POLICY` ohne vorheriges
`DROP POLICY IF EXISTS` an und brechen beim zweiten Durchlauf ab. In der
normalen Vorwärtsreihenfolge läuft jede Datei genau einmal, also stört das im
Betrieb nicht. Nur relevant, falls jemand eine Datei von Hand erneut ausführt.
Nicht geändert — reines Housekeeping ausserhalb des aktuellen Auftrags.

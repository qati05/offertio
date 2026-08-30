# Migrationen — Stand der Live-Datenbank

Stand **29.08.2026**, Projekt `osexdcaqlggnaubeezqo` (Offertio, eu-central-1).
Migrationen **000–036 sind eingespielt**. Nachgemessen, nicht angenommen.

> ⚠️ **037 und 038 liegen im Repo, sind aber NICHT eingespielt.**
>
> **038** trägt `abgelehnt` in die Status-Whitelist nach. Die Liste aus 033 hat
> diesen Status übersehen — geschrieben wird er von `/api/public/reject`, wenn
> ein Empfänger eine Offerte über den geteilten Link ablehnt. Solange
> `NEXT_PUBLIC_ENABLE_SIGNING=false` ist, ist die Route nicht erreichbar und
> nichts bricht. **Ohne 038 scheitert dort jede Ablehnung mit einem 500, sobald
> das Feature eingeschaltet wird.**
>
> ⚠️ **037 liegt im Repo, ist aber NICHT eingespielt.** Die Verbindung zur
> Live-Datenbank war zum Zeitpunkt der Erstellung gesperrt. Die Migration
> entzieht der Browser-Rolle die Schreibrechte auf `dokument_counter` — ohne
> sie kann jeder Nutzer sein eigenes Monatskontingent per Direktzugriff auf
> einen negativen Wert setzen und das Free-Limit dauerhaft aushebeln.
> Nach dem Einspielen prüfen:
>
> ```sql
> SELECT has_table_privilege('authenticated','public.dokument_counter','UPDATE');
> -- erwartet: false
> SELECT has_table_privilege('authenticated','public.dokument_counter','SELECT');
> -- erwartet: true  (check-limit und save lesen die Tabelle)
> ```

## Was vorher schiefstand

Die Datenbank war von den Migrationsdateien **abgedriftet**. Eingespielt waren
`000`–`014` plus **sechs von Hand angelegte Migrationen vom 05.04.2026**, die es
im Repo nicht gibt:

| Handmigration | Deckt Repo-Datei ab |
| --- | --- |
| `profiles_add_payment_columns` | Teile von 016, 018, 022 |
| `create_customers_table` | Teile von 015 |
| `dokumente_add_extended_columns` | Teile von 015, 020 |
| `fix_dokumente_rls_performance` | — (Verbesserung: `(select auth.uid())` statt `auth.uid()`) |
| `fix_dokument_counter_limit_enforcement` | — (atomare Kontingentprüfung) |
| `drop_unused_indexes` | — (löscht `idx_profiles_email`, `dokumente_datum_idx`) |

**015–034 fehlten damit ganz oder teilweise.** Konkret fehlten der Datenbank
`share_token`, `positionen`, `mwst_satz`, `rabatt`, `notiz`, `preis_mode`,
`steuerfall`, `ust1tg_*`, `storniert_at`, `storno_grund`, `signature_path`,
`mahnstufe`, `pdf_accent_color`, `referral_code` sowie die Tabellen
`referrals` und `recurring_schedules`.

Die App war gegen diese Datenbank **nicht lauffähig**: der Empfänger-Link
(`/view/<token>`) hatte keine Spalte, jedes Speichern mit Positionen wäre
gescheitert, Storno und §13b ebenso.

## Wie der Abgleich gemacht wurde

Nicht durch Lesen der Dateien, sondern durch Messen der Datenbank:
`information_schema.columns`, `pg_indexes`, `pg_constraint`, `pg_proc`,
`pg_trigger`, `pg_policies` und `storage.buckets` gegen den Inhalt jeder
Migrationsdatei. Erst danach wurde geschrieben.

Zum Zeitpunkt der Arbeit enthielt die Datenbank ausschliesslich Testdaten
(2 Nutzer, 3 Dokumente, 1 Kunde) — deshalb war das Risiko klein.

## Drei bewusste Abweichungen von den Repo-Dateien

Diese drei Stellen wurden **nicht wörtlich** eingespielt. Jede ist hier
begründet, damit später niemand rätselt, warum Datei und Datenbank auseinander
liegen.

**1. `017` — Constraint als `NOT VALID`.** Die Datei legt
`profiles_ch_uid_mwst_format_check` validierend an. Auf der Live-Datenbank
existiert ein Altprofil mit `land = 'CH'` und `uid_mwst = '8'`, das dem Muster
`CHE-XXX.XXX.XXX` widerspricht — ein validierender Constraint hätte die
Migration abgebrochen. `NOT VALID` erzwingt die Regel für **alle künftigen**
Schreibvorgänge und lässt genau diese Altzeile in Ruhe.

> ⚠️ **Offen, deine Entscheidung:** `uid_mwst = '8'` ist keine gültige UID. Weil
> der Wert nicht leer ist, hält `checkInvoiceRequirements` ihn für gesetzt und
> lässt eine Rechnung mit 8.1 % MWST durch — auf der dann „8" als UID steht.
> Das ist eine formell fehlerhafte Rechnung (Art. 26 Abs. 2 lit. a MWSTG).
> Empfehlung: im Profil auf leer setzen oder die echte UID eintragen. Danach:
>
> ```sql
> ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_ch_uid_mwst_format_check;
> ```

**2. `021` / `028` — ohne `CONCURRENTLY`.** Beide Dateien nutzen
`CREATE INDEX CONCURRENTLY`, was in PostgreSQL nicht in einer Transaktion laufen
darf; das Migrationswerkzeug fährt aber alles in einer Transaktion. Bei 3 Zeilen
ist ein normaler Indexaufbau ohnehin sofort fertig, die Sperre also
bedeutungslos. Die Dateien bleiben unverändert — auf einer frischen Datenbank
ist `CONCURRENTLY` weiterhin richtig.

**3. `022` / `025` — Datenteile ausgelassen, Funktionen gehärtet.** Das
`UPDATE profiles SET trial_ends_at = …` aus 022 lief nicht: die vorhandenen
Profile haben bereits ein `trial_ends_at`. Der `referral_code`-Backfill aus 025
lief ebenfalls nicht.

> ⚠️ **Offen:** Die beiden bestehenden Profile haben `referral_code = NULL`.
> Neue Registrierungen bekommen einen Code über `handle_new_user()`.

Ausserdem wurde `handle_new_user()` in 025 gegenüber der Repo-Datei **nicht
verschlechtert**: die Datei verliert `SET search_path = public` und
`ON CONFLICT (id) DO NOTHING`, die 022 noch hatte. Eingespielt wurde die
Fassung **mit** beidem — ohne `search_path` ist eine `SECURITY DEFINER`-Funktion
angreifbar, und ohne `ON CONFLICT` bricht ein wiederholter Trigger ab.

## Migrationsverzeichnis wieder synchron

`apply_migration` vergibt Zeitstempel-Versionen (`20260828203931`) statt der
Nummern aus den Dateinamen. Das hätte `supabase db push` dazu gebracht, 015–034
für „noch nicht eingespielt" zu halten und erneut auszuführen. Die Versionen im
Verzeichnis wurden deshalb auf die Dateinummern zurückgesetzt; `list_migrations`
zeigt jetzt sauber `000`–`036`.

## Danach prüfen

```sql
-- Spalten vorhanden?
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'dokumente'
   AND column_name IN ('share_token','positionen','steuerfall','storniert_at','mahnstufe');
-- erwartet: 5 Zeilen

-- Kann der Browser die Abrechnungsspalten schreiben? (muss false sein)
SELECT has_column_privilege('authenticated','public.profiles','plan','UPDATE');

-- Kann ein Anonymer fremde Kontingente verbrennen? (muss false sein)
SELECT has_function_privilege('anon','public.increment_dokument_counter(uuid,text)','EXECUTE');
```

## Zwei bekannte Punkte

**Drei Constraints sind `NOT VALID`** — `dokumente_status_chk`,
`dokumente_storniert_consistency_chk` (beide 033) und
`profiles_ch_uid_mwst_format_check` (017). Sie greifen für alle künftigen
Schreibvorgänge; nur Altzeilen sind ausgenommen. Die drei vorhandenen Dokumente
tragen `entwurf`, `angenommen`, `bezahlt` — alle innerhalb der Whitelist, die
Status-Regel könnte also sofort vollständig übernommen werden:

```sql
ALTER TABLE public.dokumente VALIDATE CONSTRAINT dokumente_status_chk;
```

**Vier ältere Migrationen sind nicht wiederholbar** (`000`, `001`, `013`,
`019`): sie legen Policies ohne vorheriges `DROP POLICY IF EXISTS` an und
brechen beim zweiten Durchlauf ab. In der normalen Vorwärtsreihenfolge läuft
jede Datei genau einmal, im Betrieb stört das also nicht.

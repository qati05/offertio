# Trigger gegen echtes Postgres prüfen

Migration `039_issued_invoice_immutable.sql` macht eine ausgestellte Rechnung in
der Datenbank selbst unveränderbar. Ein Test, der nur den Dateitext liest,
belegt das nicht — der Trigger muss laufen.

Diese zwei Dateien spielen ein Minimalschema ein und fahren dann fünf Angriffe
und acht legitime Schreibvorgänge dagegen.

```bash
# Wegwerf-Instanz starten (nicht als root)
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/pgtest -U postgres --auth=trust"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgtest -o '-p 54329 -k /tmp' -l /tmp/pg.log start"

psql -h /tmp -p 54329 -U postgres -f scripts/db/_trigger-schema.sql
psql -h /tmp -p 54329 -U postgres -f supabase/migrations/039_issued_invoice_immutable.sql
psql -h /tmp -p 54329 -U postgres -f supabase/migrations/040_issued_invoice_delete_and_metadata.sql
psql -h /tmp -p 54329 -U postgres -f scripts/db/verify-039-trigger.sql
```

Erwartet:

| Fall | Erwartung |
| --- | --- |
| Betrag / Nummer / Positionen einer gesendeten Rechnung ändern | `issued invoice content is immutable` |
| Gesendete Rechnung auf `entwurf` zurück | `issued invoice cannot return to draft` |
| Stornierte Rechnung reaktivieren | `cancelled invoice is final` |
| Ausgestellte Rechnung löschen | `issued invoice must be retained` |
| `pdf_url`, `share_token` oder `created_at` einer gestellten Rechnung ändern | `issued invoice content is immutable` |
| Als bezahlt markieren, mahnen, Status wechseln, stornieren | geht durch |
| Entwurf oder Offerte löschen | geht durch |
| Entwurf inhaltlich ändern | geht durch |
| Offerte signieren, ändern, Konvertierungsverweis setzen | geht durch |

Gemessen am 30.08.2026 gegen PostgreSQL 16: alle **neun** Angriffe abgewiesen,
alle **zehn** legitimen Pfade erlaubt.

Das Schema in `_trigger-schema.sql` war zunächst unvollständig — es hatte kein
`pdf_url`. Die Prüfung sah dadurch vollständig aus, während die Spalte, die auf
das archivierte Dokument selbst zeigt, nie angefasst wurde. Wer dieses Schema
erweitert: eine fehlende Spalte macht die Prüfung stillschweigend blind. Die Migration läuft auch dann komplett durch, wenn
die Rolle `service_role` fehlt — der `GRANT` steht in einem Existenz-Guard.

---

# Jeden Schreibvorgang der App durch ein echtes PostgREST schicken

Der Test oben prüft einen Trigger. Dieser prüft **die ganze App gegen die
Datenbank**, so wie der Browser sie benutzt — und er hat einen Fehler gefunden,
den kein anderer Test sehen konnte: Migration 035 entzog dem Browser-Nutzer das
Recht, `profiles.id` zu ändern. PostgREST schreibt aber bei jedem Upsert
`ON CONFLICT (id) DO UPDATE SET …, "id" = EXCLUDED."id"`, also scheiterten
Onboarding, Profil speichern und die Profilsicherung im Editor mit
`permission denied` — bei jedem Nutzer. Behoben in Migration 041.

`postgrest-smoke.py` spielt jeden Schreibvorgang mit genau den Spalten ab, die
der Code sendet (aus den Aufrufstellen gelesen), und prüft dazu, dass die
Schutzregeln weiter halten: gestellte Rechnung nicht änderbar, nicht löschbar,
nicht zurück auf Entwurf, kein `plan` und kein Testzeitraum selbst setzbar,
`id` nicht auf einen fremden Wert umschreibbar.

```bash
# 1. leere Instanz (nicht als root), Attrappe, alle Migrationen
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/pgtest/data -U postgres --auth=trust"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgtest/data -o '-p 55440 -k /tmp' -l /tmp/pgtest/pg.log start"
psql -h /tmp -p 55440 -U postgres -v ON_ERROR_STOP=1 -f scripts/db/_supabase-stub.sql
for f in supabase/migrations/*.sql; do psql -h /tmp -p 55440 -U postgres -q -v ON_ERROR_STOP=1 -f "$f" || break; done

# 2. den Nutzer anlegen (das Profil entsteht per Trigger)
psql -h /tmp -p 55440 -U postgres -c "INSERT INTO auth.users (id, email) VALUES ('11111111-1111-4111-8111-111111111111','owner@example.ch')"

# 3. PostgREST v12 starten (https://github.com/PostgREST/postgrest/releases, Datei
#    postgrest-v12.2.3-linux-static-x64.tar.xz) mit dieser Konfiguration
cat > pgrst.conf <<'CONF'
db-uri = "postgres://authenticator:pw@127.0.0.1:55440/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "super-secret-jwt-token-with-at-least-32-characters-long"
server-port = 3300
CONF
./postgrest pgrst.conf &

# 4. der Test (erneutes Ausführen: vorher die Tabellen leeren)
psql -h /tmp -p 55440 -U postgres -c "TRUNCATE public.dokumente, public.customers, public.recurring_schedules, public.vorlagen CASCADE"
python3 scripts/db/postgrest-smoke.py
```

Erwartet: `28 of 28 behave as expected`. Ohne Migration 041 schlagen genau die
drei Profil-Upserts fehl.

**Was das nicht prüft:** Supabase Auth (GoTrue) und den Storage-Dienst — das
PDF-Hochladen in den Bucket `pdfs` und die Token-Prüfung der Routen laufen hier
nicht. Die Attrappe ist eine Annäherung an Supabase, nicht Supabase selbst, und
die echte Datenbank ist Postgres 17 mit einer gewachsenen Historie.

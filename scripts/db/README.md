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
psql -h /tmp -p 54329 -U postgres -f scripts/db/verify-039-trigger.sql
```

Erwartet:

| Fall | Erwartung |
| --- | --- |
| Betrag / Nummer / Positionen einer gesendeten Rechnung ändern | `issued invoice content is immutable` |
| Gesendete Rechnung auf `entwurf` zurück | `issued invoice cannot return to draft` |
| Stornierte Rechnung reaktivieren | `cancelled invoice is final` |
| Als bezahlt markieren, mahnen, Status wechseln, stornieren | geht durch |
| Entwurf inhaltlich ändern | geht durch |
| Offerte signieren, ändern, Konvertierungsverweis setzen | geht durch |

Gemessen am 30.08.2026 gegen PostgreSQL 16: alle fünf Angriffe abgewiesen, alle
acht legitimen Pfade erlaubt. Die Migration läuft auch dann komplett durch, wenn
die Rolle `service_role` fehlt — der `GRANT` steht in einem Existenz-Guard.

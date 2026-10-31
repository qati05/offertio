# Sicherheitspruefung Offertio vor dem Launch

Geprueft wurde der Stand nach dem Merge von `cursor/landing-gruenderplatz-7a44` (PR 13) in `cursor/launch-audit-fixes-db7d` (PR 12). Der Bericht folgt den sechs Phasen der Cloudflare-Security-Audit-Methode: Lagebild, Suche, Widerlegung, Befundliste, zweite Pruefung der Belege, Bericht. Es wurde kein Live-System angegriffen. Scanner liefen lokal ueber den Quelltext und die Git-Historie.

Schweizer Schreibweise, kein Eszett.

## Kurz

Bestaetigte Luecken im Gratis-Limit, bei signierten PDF-Pfaden, beim Logo-Listing, beim Resend-Versand, bei Gruender-Uploads und beim `search_path` von `handle_new_user` sind im Code geschlossen. Next.js steht auf 15.5.28, Zod auf 4.6.7. Offen bleiben postcss innerhalb von Next (Fix erst mit Next 16) und alles, was echte Schluessel oder die Domain getoffertio.ch braucht.

Tests: 689 bestanden. `next build` mit Next.js 15.5.28 erfolgreich, inklusive Lint und Typen.

## Scanner

| Werkzeug | Ergebnis |
| --- | --- |
| gitleaks 8.28.0, ganze Historie | 154 Commits, keine Treffer |
| trufflehog 3.90.1 `git file://. --only-verified` | 0 verifizierte Geheimnisse |
| npm audit --omit=dev | Nach dem Update: 0 kritisch, 1 hoch (postcss), 1 mittel (Next haengt an diesem postcss). Vorher kritisch wegen Next 15.5.15 |
| osv-scanner 2.7.0 `-r .` | Dieselbe Produktionslage. Dev-only-Treffer bei vitest sind kein Launch-Blocker |
| semgrep 1.183.0, p/javascript, p/typescript, p/react, p/secrets, p/owasp-top-ten | 0 Befunde. Parser warnt bei `&` im JSX-Text von fuenf Seiten, das ist kein Befund |

## Befunde

| ID | Schwere | Status | Thema | Fix |
| --- | --- | --- | --- | --- |
| F-01 | hoch | behoben | Speichern und Serienlauf ohne Gratis-Limit, plus Race | SQL `try_consume_dokument_slot`, Aufruf vor dem Insert |
| F-02 | hoch | behoben | Service-Role signiert `pdf_url` eines fremden Ordners | Pfadpruefung und DB-Trigger |
| F-03 | mittel | behoben | Bucket `logos` fuer alle listbar (Splinter 0025) | SELECT nur eigener Ordner |
| F-04 | mittel | behoben | Resend an beliebige Adressen, freier Firmenname, offene Basis-URL | Eigenes Dokument, Empfaenger = `kunde_email`, Host-Allowlist, 30/Stunde |
| F-05 | mittel | behoben | SVG-Entity und CSV-Formel in Gruender-Uploads | Dekodieren, Formelzellen ablehnen, kein octet-stream |
| F-06 | mittel | behoben | `handle_new_user` ohne festen `search_path` (Splinter 0011) | Migration 036 setzt `search_path` und entzieht EXECUTE |
| F-07 | hoch | behoben | Next.js 15.5.15, kritische Advisories, Zod &lt; 4.6.6 | Next 15.5.28, Zod 4.6.7 |
| F-08 | niedrig | behoben | Passwort-Reset nahm jede Origin | Allowlist getoffertio.ch, www, SITE_URL, localhost |
| F-09 | niedrig | behoben | Stripe-Zeitstempel nur in der Vergangenheit ungueltig | Fenster in beide Richtungen. Ohne Webhook-Geheimnis nicht faelschbar |
| F-10 | niedrig | behoben | Redis-Fehler oeffnete das Limit pro Instanz | Produktion lehnt ab, wenn Upstash wirft |
| F-11 | niedrig | behoben | Edge-Header und Cookie-Flags | vercel.json plus HttpOnly, Lax, Secure |
| F-12 | info | behoben | `/view` und `/api/public` verlangten Login | Pfade oeffentlich, Autorisierung bleibt das UUID-Token |
| F-13 | niedrig | behoben | `supabase/.temp` im Git, Pooler-Host und Projektkennung, kein Passwort | Aus dem Index, gitignore |
| F-14 | hoch | offen | postcss in Next, Audit will Next 16 | Nicht erzwingen. Naechsten 15.5-Patch oder ein geplantes Next-16-Upgrade |
| F-15 | mittel | offen | Ohne Upstash zaehlt das Limit nur im Speicher einer Instanz | `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN` in Produktion |
| F-16 | info | offen | Splinter 0003, `auth.uid()` ohne `(select …)` | Nur Performance. Policies pruefen `auth.uid()` |

## Was geprueft und verworfen wurde

- **Sitzzaehler.** `reserve_founder_seat` sperrt mit `pg_advisory_xact_lock` bevor gezaehlt wird. Zwei gleichzeitige Checkouts koennen das Limit nicht ueberspringen. Der Refund in Migration 033 gibt nur `confirmed` frei, nicht eine neue Reservierung. Migration 035 loescht zusaetzlich `founder_paid_at` und `founder_access_until`, sonst bliebe das Zwei-Jahres-Fenster nach einer Rueckerstattung stehen. Die Sperre auf `stripe_payment_intent_id` bleibt erhalten.
- **Stripe-Webhook.** Rohbody, HMAC, Idempotenz auf der Event-ID, Refunds nur bei 24900 Rappen und CHF. Teilrefunds aendern den Plan nicht. Lemon Squeezy antwortet mit 410 und schreibt nichts.
- **service_role.** Nur in `src/lib/supabase-admin.ts` mit `server-only`. Kein Geheimnis unter `NEXT_PUBLIC_`.
- **IDOR auf Kunden, Mahnungen, Status, Export.** Die Routen filtern mit `user_id` des eingeloggten Kontos. Der Export laedt PDFs nur aus dem eigenen Ordner. Oeffentliche Ansicht und Signatur haengen am `share_token` (UUID), mit Rate-Limit. Signieren ist per Flag aus.
- **SSR Logo.** Der Server fetcht keine vom Nutzer gelieferte Bild-URL. Oeffentliche Antworten geben `logo_url` nur heraus, wenn sie auf dem Projekt-Host und im eigenen Logo-Ordner liegt. Ein Trigger verbietet anderen Clients, eine fremde URL zu setzen. Der Upload prueft Magic Bytes und schreibt den Pfad selbst.
- **RLS.** Jede Tabelle in `public` hat RLS. `founder_seats` und `stripe_webhook_events` haben absichtlich keine Policy: anon und authenticated kommen nicht heran, der Service-Role umgeht RLS. Storage-Pfade fuer PDFs, Logos und `founder-setup` sind auf `auth.uid()` im ersten Ordner begrenzt. `SECURITY DEFINER`-Funktionen, die eine User-ID annehmen, pruefen `auth.uid()`, ausser der Aufrufer ist `service_role`.

## Header und Cookies

- CSP mit Nonce, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` in `src/middleware.ts`. `unsafe-eval` bleibt, weil `@react-pdf/renderer` es fuer Schriften braucht.
- `next.config.ts`: HSTS zwei Jahre mit includeSubDomains und preload, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP.
- `vercel.json` setzt dieselben Edge-Header noch einmal, ohne eine zweite CSP, die das Nonce aushebeln wuerde.
- Supabase-Cookies: HttpOnly, SameSite=Lax, Secure sobald `NODE_ENV=production`.

## Datenbank vor dem Deploy

Migration **036** muss mit 033, 034 und 035 auf dem Projekt in Zuerich laufen, bevor dieser Code live geht. Fehlt `try_consume_dokument_slot`, verweigert das Speichern mit 500. Das ist Absicht: lieber kein Dokument als ein Dokument ohne Limit.

Reihenfolge: `033_lifetime_refund`, `034_founder_setup`, `035_founder_access_window`, `036_launch_security_guards`. Die doppelte Nummer 033 aus dem Merge ist aufgeloest.

## Was Live-Schluessel oder die Domain braucht

1. **ZAP-Baseline** gegen `https://getoffertio.ch`, sobald die Domain mit diesem Stand antwortet. Lokal gibt es keinen oeffentlichen Endpunkt. Pruefen: HSTS, `X-Frame-Options`, CSP, kein Server-Header mit Versionsnummer, Redirect von `www` auf die Apex.
2. **HSTS-Preload** erst beantragen, wenn Apex und Subdomains stabil auf HTTPS sind.
3. **Supabase Auth:** Redirect-Allowlist nur `https://getoffertio.ch/callback` (und localhost fuer Entwicklung). Site URL = `https://getoffertio.ch`. Der Code filtert zusaetzlich, das Dashboard ist die zweite Sperre.
4. **Stripe:** Endpoint `https://getoffertio.ch/api/webhooks/stripe`, Geheimnis `STRIPE_WEBHOOK_SECRET`, Events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `refund.created`, `refund.updated`. Ein Test-Event `charge.refunded` ueber 24900 Rappen muss den Plan auf `free` setzen und den bestaetigten Sitz freigeben. Ein zweites Zustellen derselben Event-ID muss `duplicate` liefern.
5. **Resend:** Domain `getoffertio.ch` in der EU-Region, Absender `offerte@getoffertio.ch`, `OPERATOR_EMAIL` fuer Gruender-Unterlagen. `RESEND_API_BASE_URL` leer lassen oder nur `https://*.resend.com`.
6. **Upstash** setzen (F-15). Ohne die beiden Variablen ist das Limit auf Vercel nicht verbindlich.
7. **Logo nach Migration 036:** eine bekannte Public-URL eines Logos muss weiter laden. `storage.from('logos').list()` mit dem Anon-Key darf nicht alle Konten zeigen.
8. **`NEXT_PUBLIC_ENABLE_SIGNING`** bleibt `false`, bis Einwilligung und Bestaetigung der Empfaenger-Mail stehen.
9. **Lemon-Squeezy-Webhook** im alten Dashboard abschalten. Die Route antwortet nur noch 410.

## Nicht gemergt

Dieser Stand ist ein eigener Branch und ein Pull Request. Er wird nicht in `main` gemergt.

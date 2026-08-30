-- Attack script for migration 039, run against a throwaway PostgreSQL.
-- Usage: see scripts/db/README.md

INSERT INTO public.dokumente (id,user_id,typ,nummer,kundenname,betrag,datum,status)
VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
        'rechnung','RE-2026-0001','Muster AG',1500.00,'2026-08-01','gesendet'),
       ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',
        'rechnung','RE-2026-0002','Muster AG',900.00,'2026-08-01','entwurf'),
       ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222',
        'offerte','OF-2026-0001','Muster AG',700.00,'2026-08-01','gesendet');

\echo '=== MUSS SCHEITERN: Betrag einer gesendeten Rechnung aendern ==='
UPDATE public.dokumente SET betrag=1.00 WHERE nummer='RE-2026-0001';
\echo '=== MUSS SCHEITERN: Nummer aendern ==='
UPDATE public.dokumente SET nummer='HACK' WHERE nummer='RE-2026-0001';
\echo '=== MUSS SCHEITERN: zurueck auf Entwurf ==='
UPDATE public.dokumente SET status='entwurf' WHERE nummer='RE-2026-0001';
\echo '=== MUSS SCHEITERN: Positionen aendern ==='
UPDATE public.dokumente SET positionen='[{"x":1}]'::jsonb WHERE nummer='RE-2026-0001';

\echo '=== MUSS GEHEN: als bezahlt markieren (mark-paid) ==='
UPDATE public.dokumente SET status='bezahlt', payment_received_at=now(), mahnstufe=0 WHERE nummer='RE-2026-0001';
\echo '=== MUSS GEHEN: Mahnung (mahnstufe + last_mahnung_at) ==='
UPDATE public.dokumente SET mahnstufe=1, last_mahnung_at=now() WHERE nummer='RE-2026-0001';
\echo '=== MUSS GEHEN: Statuswechsel bezahlt -> gesendet ==='
UPDATE public.dokumente SET status='gesendet' WHERE nummer='RE-2026-0001';
\echo '=== MUSS GEHEN: stornieren ==='
UPDATE public.dokumente SET status='storniert', storniert_at=now(), storno_grund='Tippfehler' WHERE nummer='RE-2026-0001';
\echo '=== MUSS SCHEITERN: Storno rueckgaengig ==='
UPDATE public.dokumente SET status='bezahlt' WHERE nummer='RE-2026-0001';

\echo '=== MUSS GEHEN: Entwurf frei aenderbar (save-Pfad) ==='
UPDATE public.dokumente SET betrag=99.00, nummer='RE-2026-0002b', positionen='[{"y":2}]'::jsonb WHERE id='33333333-3333-4333-8333-333333333333';
\echo '=== MUSS GEHEN: Offerte signieren (public/sign) ==='
UPDATE public.dokumente SET status='angenommen', signature_path='sig', signed_at=now() WHERE typ='offerte';
\echo '=== MUSS GEHEN: Offerte inhaltlich aendern ==='
UPDATE public.dokumente SET betrag=1.00 WHERE typ='offerte';
\echo '=== MUSS GEHEN: Konvertierungs-Rueckverweis auf der Offerte ==='
UPDATE public.dokumente SET converted_document_id='11111111-1111-4111-8111-111111111111', converted_document_nummer='RE-2026-0001', converted_document_typ='rechnung' WHERE typ='offerte';

\echo '=== Endstand ==='
SELECT nummer, status, betrag, mahnstufe FROM public.dokumente ORDER BY nummer;

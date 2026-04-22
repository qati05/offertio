-- Composite index to speed up status-filtered list views.
--
-- dokumente/page.tsx renders three filters: "offen" (entwurf + gesendet),
-- "bezahlt", "ueberfaellig". Each maps to a status filter scoped by user_id.
-- Today the planner can use idx_dokumente_user_id_datum to narrow by user
-- but still has to scan every row to evaluate status. At 200+ docs per user
-- this is noticeable; a composite (user_id, status) index lets Postgres
-- answer the filter directly from the index.
--
-- Kept idempotent (IF NOT EXISTS) and CONCURRENTLY so it can run on a live
-- table without blocking writes.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dokumente_user_id_status
  ON public.dokumente (user_id, status);

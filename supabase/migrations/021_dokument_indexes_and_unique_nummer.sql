-- Migration 021: Add performance indexes and unique constraint on dokumente
--
-- 1. Index on user_id: all queries filter by user_id (RLS + explicit WHERE).
-- 2. Index on datum DESC: used for sorting in the document list (ORDER BY datum DESC).
-- 3. Unique constraint on (user_id, nummer): prevents duplicate document numbers
--    per user. The app already handles collisions with suffix logic, but this
--    constraint provides a DB-level safety net.

-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dokumente_user_id
  ON dokumente (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dokumente_datum_desc
  ON dokumente (datum DESC);

-- Composite index for the most common query pattern: user's documents sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dokumente_user_id_datum
  ON dokumente (user_id, datum DESC);

-- Unique constraint on (user_id, nummer) — prevents duplicate document numbers
-- The app's resolveUniqueNummer() already handles collisions with suffixes,
-- but this constraint provides a DB-level safety net.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_dokumente_user_id_nummer_unique
  ON dokumente (user_id, nummer);

-- Supabase migration: Create document counter table for server-side free limit enforcement
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS dokument_counter (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monat text NOT NULL,  -- Format: '2026-03'
  anzahl int NOT NULL DEFAULT 0,
  UNIQUE(user_id, monat)
);

-- RLS policies
ALTER TABLE dokument_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own counters"
  ON dokument_counter FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own counters"
  ON dokument_counter FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own counters"
  ON dokument_counter FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_dokument_counter_user_monat ON dokument_counter(user_id, monat);

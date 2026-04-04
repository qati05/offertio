-- Initial schema for Offertio
-- Run this FIRST in Supabase SQL editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  firmenname text DEFAULT '',
  vorname text DEFAULT '',
  nachname text DEFAULT '',
  adresse text DEFAULT '',
  plz text DEFAULT '',
  ort text DEFAULT '',
  telefon text DEFAULT '',
  iban text DEFAULT '',
  uid_mwst text DEFAULT '',
  logo_url text DEFAULT '',
  land text DEFAULT 'CH',
  sprache text DEFAULT 'de',
  beruf text DEFAULT '',
  zahlungsfrist int DEFAULT 30,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Vorlagen table
CREATE TABLE IF NOT EXISTS vorlagen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  beruf text DEFAULT '',
  positionen jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vorlagen"
  ON vorlagen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vorlagen"
  ON vorlagen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vorlagen"
  ON vorlagen FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vorlagen"
  ON vorlagen FOR DELETE
  USING (auth.uid() = user_id);

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vorname text,
  nachname text,
  email text UNIQUE NOT NULL,
  beruf text,
  created_at timestamptz DEFAULT now()
);

-- Keep waitlist private. Public access goes through server routes only.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dokumente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  typ text NOT NULL CHECK (typ IN ('offerte','rechnung')),
  nummer text NOT NULL, objekt text, kundenname text,
  customer_id uuid, kunde_email text, kunde_adresse text, kunde_adresse2 text,
  kunde_plz text, kunde_ort text, kunde_uid_mwst text,
  betrag numeric(12,2), datum date, leistungsdatum date,
  status text NOT NULL DEFAULT 'entwurf',
  positionen jsonb NOT NULL DEFAULT '[]'::jsonb, mwst_satz numeric(5,2),
  rabatt jsonb, notiz text, preis_mode text,
  steuerfall text NOT NULL DEFAULT 'standard',
  ust1tg_datum date, ust1tg_referenz text,
  storniert_at timestamptz, storno_grund text,
  payment_received_at timestamptz, mahnstufe smallint NOT NULL DEFAULT 0,
  last_mahnung_at timestamptz,
  signature_path text, signed_at timestamptz, rejected_at timestamptz, rejection_reason text,
  converted_document_id uuid, converted_document_nummer text, converted_document_typ text,
  -- Columns the first version of this schema omitted. Their absence made the
  -- verification look complete while pdf_url — the pointer to the archived
  -- document itself — was never exercised at all.
  pdf_url text,
  share_token uuid DEFAULT gen_random_uuid(),
  source_document_id uuid, source_document_nummer text, source_document_typ text,
  recurring_schedule_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

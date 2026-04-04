-- Ensure document sync storage + metadata exist consistently in live projects.
-- This migration is intentionally idempotent so it can be applied safely on
-- environments where parts of the setup already exist.

create table if not exists public.dokumente (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  typ text not null check (typ in ('offerte', 'rechnung')),
  nummer text not null,
  objekt text,
  kundenname text not null,
  betrag numeric(12, 2) not null,
  datum date not null,
  status text not null default 'gesendet',
  pdf_url text,
  created_at timestamptz default now() not null
);

create index if not exists dokumente_user_id_idx on public.dokumente(user_id);
create index if not exists dokumente_datum_idx on public.dokumente(datum desc);

alter table public.dokumente enable row level security;

drop policy if exists "Users can view own documents" on public.dokumente;
drop policy if exists "Users can insert own documents" on public.dokumente;
drop policy if exists "Users can update own documents" on public.dokumente;
drop policy if exists "Users can delete own documents" on public.dokumente;

create policy "Users can view own documents"
  on public.dokumente for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.dokumente for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.dokumente for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.dokumente for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 7340032, '{application/pdf}')
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own pdfs" on storage.objects;
drop policy if exists "Users can view own pdfs" on storage.objects;
drop policy if exists "Users can delete own pdfs" on storage.objects;

create policy "Users can upload own pdfs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own pdfs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own pdfs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Refresh the REST schema cache after creating/restoring the public table.
notify pgrst, 'reload schema';

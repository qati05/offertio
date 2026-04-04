create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  display_name text not null,
  email text,
  adresse text,
  adresse2 text,
  plz text,
  ort text,
  uid_mwst text,
  lookup_key text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index if not exists customers_user_lookup_key_idx
  on public.customers(user_id, lookup_key);

create index if not exists customers_user_display_name_idx
  on public.customers(user_id, display_name);

alter table public.customers enable row level security;

drop policy if exists "Users can view own customers" on public.customers;
drop policy if exists "Users can insert own customers" on public.customers;
drop policy if exists "Users can update own customers" on public.customers;
drop policy if exists "Users can delete own customers" on public.customers;

create policy "Users can view own customers"
  on public.customers for select
  using (auth.uid() = user_id);

create policy "Users can insert own customers"
  on public.customers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customers"
  on public.customers for update
  using (auth.uid() = user_id);

create policy "Users can delete own customers"
  on public.customers for delete
  using (auth.uid() = user_id);

alter table public.dokumente
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists kunde_email text,
  add column if not exists kunde_adresse text,
  add column if not exists kunde_adresse2 text,
  add column if not exists kunde_plz text,
  add column if not exists kunde_ort text,
  add column if not exists source_document_id uuid references public.dokumente(id) on delete set null,
  add column if not exists source_document_nummer text,
  add column if not exists source_document_typ text check (source_document_typ in ('offerte', 'rechnung')),
  add column if not exists converted_document_id uuid references public.dokumente(id) on delete set null,
  add column if not exists converted_document_nummer text,
  add column if not exists converted_document_typ text check (converted_document_typ in ('offerte', 'rechnung'));

create index if not exists dokumente_customer_id_idx on public.dokumente(customer_id);
create index if not exists dokumente_source_document_id_idx on public.dokumente(source_document_id);
create index if not exists dokumente_converted_document_id_idx on public.dokumente(converted_document_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

notify pgrst, 'reload schema';

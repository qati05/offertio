begin;

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;

drop policy if exists "waitlist_public_insert" on public.waitlist;

create policy "waitlist_public_insert"
on public.waitlist
for insert
to anon, authenticated
with check (true);

commit;

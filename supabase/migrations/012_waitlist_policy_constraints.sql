begin;

drop policy if exists "waitlist_public_insert" on public.waitlist;

create policy "waitlist_public_insert"
on public.waitlist
for insert
to anon, authenticated
with check (
  char_length(email) between 3 and 254
  and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  and coalesce(char_length(vorname), 0) <= 100
  and coalesce(char_length(nachname), 0) <= 100
  and coalesce(char_length(beruf), 0) <= 120
);

commit;

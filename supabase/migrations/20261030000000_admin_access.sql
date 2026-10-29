-- Phase 2: admin accounts and permissions.
-- Safe to run more than once.
--
-- Supabase dashboard settings this relies on (not stored in SQL):
--   Authentication → Sign In / Providers → Email: enabled
--   Authentication → Sign In / Providers → "Allow new users to sign up": OFF
-- Add an admin: create the user under Authentication → Users → Add user, then
--   insert into public.admins (user_id, display_name)
--   select id, 'Venya' from auth.users where email = 'person@example.com';

-- Who may edit programs. Managed only from the dashboard / SQL editor.
create table if not exists public.admins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.admins enable row level security;

-- security definer so policies can check admins without exposing the table.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Admins can see the list, e.g. to show "reviewed by Venya". No one can change
-- it through the API.
drop policy if exists "Admins can read admins" on public.admins;
create policy "Admins can read admins"
  on public.admins for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.admins from anon, authenticated;

-- Programs: the public sees published rows only; admins see and edit everything.
drop policy if exists "Programs are publicly readable" on public.programs;
drop policy if exists "Published programs are publicly readable" on public.programs;
create policy "Published programs are publicly readable"
  on public.programs for select
  to anon, authenticated
  using (is_published or public.is_admin());

drop policy if exists "Admins can add programs" on public.programs;
create policy "Admins can add programs"
  on public.programs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can edit programs" on public.programs;
create policy "Admins can edit programs"
  on public.programs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No delete policy: admins hide programs (is_published = false) instead, so
-- mistakes can be undone. The public key can never write.
revoke insert, update, delete, truncate on public.programs from anon;
revoke delete, truncate on public.programs from authenticated;

-- Record who made each change, whatever the client sends.
create or replace function public.set_updated_by() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists programs_set_updated_by on public.programs;
create trigger programs_set_updated_by
  before insert or update on public.programs
  for each row execute function public.set_updated_by();

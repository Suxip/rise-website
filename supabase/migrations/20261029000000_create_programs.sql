-- Program directory table. One row per program/incentive.
create table if not exists public.programs (
  id            bigint generated always as identity primary key,
  name          text not null,
  category      text not null check (category in ('energy', 'water', 'transportation', 'recycling')),
  description   text not null default '',
  url           text not null default '',
  how_to_access text not null default '',
  -- Display name exactly as entered in the spreadsheet (e.g. "Washington D.C.", "US").
  state         text not null default '',
  -- Two-letter code (e.g. "CA", "DC"); null for federal programs.
  state_code    text check (state_code ~ '^[A-Z]{2}$'),
  level         text not null check (level in ('state', 'federal', 'territory')),
  link_status   text,
  last_reviewed date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Full-text search over name, description and access notes, weighted by importance.
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(how_to_access, '')), 'C')
  ) stored
);

create index if not exists programs_state_code_idx on public.programs (state_code);
create index if not exists programs_level_idx      on public.programs (level);
create index if not exists programs_category_idx   on public.programs (category);
create index if not exists programs_search_idx     on public.programs using gin (search);

-- Keep updated_at current on edits.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- The website uses the public (publishable/anon) key, so lock the table down:
-- anyone may read, nobody may write through the public API. Edit data in the
-- Supabase dashboard or with the service-role key instead.
alter table public.programs enable row level security;

drop policy if exists "Programs are publicly readable" on public.programs;
create policy "Programs are publicly readable"
  on public.programs for select
  to anon, authenticated
  using (true);

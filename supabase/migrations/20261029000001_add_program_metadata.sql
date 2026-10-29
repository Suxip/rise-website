-- Phase 1: program type, data source, visibility, and edit tracking.
-- Safe to run more than once.

alter table public.programs
  -- What kind of incentive this is. Most values come from the DSIRE placeholder
  -- descriptions ("Rebate Program. Attribution: ..."), split out by the import script.
  add column if not exists program_type text check (program_type in (
    'Rebate Program', 'Loan Program', 'Grant Program', 'Leasing Program',
    'PACE Financing', 'Personal Tax Credit', 'Personal Tax Deduction',
    'Personal Tax Exemption', 'Corporate Tax Exemption', 'Property Tax Incentive',
    'Sales Tax Incentive', 'Building Energy Code', 'Net Metering',
    'Solar/Wind Permitting Standards'
  )),
  -- Where the record came from, e.g. 'DSIRE'. DSIRE records must show attribution.
  add column if not exists source text,
  -- Hidden programs stay in the table but are not shown on the public site.
  add column if not exists is_published boolean not null default true,
  -- Supabase Auth user who last saved or reviewed the row.
  add column if not exists updated_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

create index if not exists programs_program_type_idx on public.programs (program_type);
create index if not exists programs_is_published_idx on public.programs (is_published);

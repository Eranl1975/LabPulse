-- 028: column_catalog — one row per vendor column SKU.
--
-- The in-app catalogue (lib/column-catalog.ts) lists stationary-phase product
-- lines and lets the operator pick dimensions from dropdowns. That is the right
-- shape for a quick browse but it cannot answer "is my exact column, with this
-- part number and these dimensions, known to the app?". This table holds the
-- operator-supplied vendor tables at SKU level: ~7,200 columns with part
-- number, dimensions, pore size, phase, pH and temperature limits and the
-- source each row came from. /api/columns/search reads it.
--
-- Numbering note: 026 and 027 are reserved by the unpushed
-- security/owasp-2025-audit branch (RLS hardening and the audit trail), so this
-- migration takes 028 to avoid a collision when that branch lands.
--
-- `families` is an array because a row can legitimately be offered under two
-- pickers: Daicel's chiral phases are sold for HPLC *and* SFC, and a GPC/SEC
-- packing is run on an LC stack. Storing one row with two tags is what keeps
-- the catalogue duplicate-free while still putting each column "in the right
-- place". GC is exclusive.

create table if not exists column_catalog (
  -- Deterministic identity: vendor + name + part number + dimensions + pack.
  -- Re-running the seeder upserts on this key, so an import can never double
  -- insert the same SKU.
  natural_key     text primary key,

  name            text not null,
  vendor          text not null,
  product_line    text,
  part_number     text,

  families        text[] not null default '{}'
                    check (
                      array_length(families, 1) >= 1
                      and families <@ array['gc','lc','ic','sfc','sec']::text[]
                    ),

  kind            text not null
                    check (kind in ('analytical','prep','guard','cartridge','family')),

  -- Dimensions. LC/IC/SFC/SEC lengths are millimetres, GC lengths are metres,
  -- which is how both the vendor tables and the app's pickers express them.
  length_mm       numeric,
  length_m        numeric,
  id_mm           numeric,
  particle_um     numeric,
  pore_a          numeric,
  film_um         numeric,
  bed_volume_ml   numeric,

  separation_mode text,
  phase           text,
  item_type       text,
  mesh            text,
  ph_range        text,
  temperature     text,
  max_pressure    text,
  ion_capacity    text,
  mw_range        text,
  ship_solvent    text,
  hardware        text,
  usp             text,
  pack            text,
  notes           text,

  -- Vendor specifics with no column of their own (Endcapping, Carbon Load,
  -- Particle Type, …), plus the unstructured remainder of the source line.
  attributes      jsonb not null default '{}'::jsonb,
  source_row      text,

  source_name     text,
  source_url      text,
  collected       text,

  tsv             tsvector,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Search ────────────────────────────────────────────────────────────────
-- Word search over the fields an operator would type: the column name, the
-- vendor, the product line, the part number, the phase and the USP code.

create or replace function cc_tsv_trigger() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.tsv := to_tsvector('pg_catalog.english',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.vendor, '') || ' ' ||
    coalesce(new.product_line, '') || ' ' ||
    coalesce(new.part_number, '') || ' ' ||
    coalesce(new.phase, '') || ' ' ||
    coalesce(new.separation_mode, '') || ' ' ||
    coalesce(new.usp, '')
  );
  new.updated_at := now();
  return new;
end;
$$;

-- Created conditionally rather than dropped and recreated, so the migration is
-- re-runnable without a DROP.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_cc_tsv' and tgrelid = 'public.column_catalog'::regclass
  ) then
    create trigger trg_cc_tsv before insert or update on column_catalog
      for each row execute function cc_tsv_trigger();
  end if;
end $$;

create index if not exists idx_cc_tsv          on column_catalog using gin(tsv);
create index if not exists idx_cc_families     on column_catalog using gin(families);
create index if not exists idx_cc_part_number  on column_catalog (part_number);
create index if not exists idx_cc_vendor       on column_catalog (vendor);
create index if not exists idx_cc_product_line on column_catalog (product_line);
-- Name prefix/substring matching for the picker's "starts typing" behaviour.
create index if not exists idx_cc_name_lower   on column_catalog (lower(name));

-- ── Row Level Security ────────────────────────────────────────────────────
-- Same posture as the knowledge tables (024): signed-in users read, every
-- write goes through the service role, which bypasses RLS. No policy grants
-- anything to anon.

alter table column_catalog enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'column_catalog'
      and policyname = 'Authenticated users can read the column catalogue'
  ) then
    create policy "Authenticated users can read the column catalogue" on column_catalog
      for select to authenticated using (true);
  end if;
end $$;

comment on table column_catalog is
  'Vendor column SKUs (name, part number, dimensions, phase) behind /api/columns/search. Written only by scripts/seed-column-catalog.ts with the service role.';

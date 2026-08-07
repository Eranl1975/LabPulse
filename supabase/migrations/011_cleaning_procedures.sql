-- ============================================================
-- 011  cleaning_procedures
-- Cached cleaning procedures for analytical instruments.
-- One row per (technique, manufacturer, model) combination.
-- ============================================================

create table if not exists cleaning_procedures (
  id                   uuid    primary key default gen_random_uuid(),
  technique            text    not null,
  manufacturer         text,
  model                text,
  instrument_type      text,

  -- Structured content (the main payload)
  procedure_json       jsonb   not null default '{}',

  -- Source tracking
  source_type          text    not null default 'ai_generated'
                         check (source_type in (
                           'official_manufacturer',
                           'manufacturer_documentation',
                           'ai_generated'
                         )),
  source_url           text,
  source_title         text,

  -- Denormalised arrays for quick display
  what_not_to_do       text[]  not null default '{}',
  materials            text[]  not null default '{}',
  cleaning_frequency   text,

  -- AI metadata
  ai_model_used        text,
  ai_confidence        numeric(3,2) check (ai_confidence between 0 and 1),

  -- Cache management
  retrieval_date       timestamptz not null default now(),
  last_verified_at     timestamptz,
  validation_status    text    not null default 'unverified'
                         check (validation_status in ('verified', 'unverified', 'outdated', 'flagged')),
  expires_at           timestamptz not null default (now() + interval '90 days'),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Unique cache key: one procedure per technique + manufacturer + model.
-- NULLs are coalesced to '__generic__' so the constraint works properly.
create unique index if not exists idx_cp_cache_key
  on cleaning_procedures (
    technique,
    coalesce(manufacturer, '__generic__'),
    coalesce(model, '__generic__')
  );

create index if not exists idx_cp_technique on cleaning_procedures(technique);
create index if not exists idx_cp_mfr       on cleaning_procedures(manufacturer);
create index if not exists idx_cp_expires   on cleaning_procedures(expires_at);
create index if not exists idx_cp_status    on cleaning_procedures(validation_status);

-- RLS: allow authenticated users to read/write cleaning procedure cache.
-- This is a shared cache table (not user-specific data).
alter table cleaning_procedures enable row level security;

create policy "Authenticated users can read cleaning procedures"
  on cleaning_procedures for select
  to authenticated
  using (true);

create policy "Authenticated users can insert cleaning procedures"
  on cleaning_procedures for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete cleaning procedures"
  on cleaning_procedures for delete
  to authenticated
  using (true);

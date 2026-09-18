-- documents: one row per vendor manual, troubleshooting guide, application note or article.
-- Curated entries (data/instrument-docs.json) and crawled entries live in the same table;
-- `discovered_by` distinguishes them.

create table if not exists documents (
  id                 text primary key,          -- stable slug: vendor--doctype--identifier
  source_id          text references sources(id),
  vendor             text    not null,
  techniques         text[]  not null default '{}',
  instrument_family  text,
  model              text,

  doc_type           text    not null
                       check (doc_type in (
                         'troubleshooting_guide','service_manual','user_guide',
                         'maintenance_guide','quick_reference','application_note',
                         'tech_note','faq','article'
                       )),

  title              text    not null,
  document_number    text,
  url                text    not null,
  language           text    not null default 'en',
  publication_date   date,

  -- Change detection
  content_hash       text,
  http_etag          text,
  http_last_modified text,
  page_count         int,

  -- Optional original file in Supabase Storage (only when redistribution is permitted)
  storage_path       text,

  -- Authority tier, aligned with lib/evidence-hierarchy.ts:
  -- 1 exact-model vendor doc, 2 instrument-family vendor doc, 5 app/tech note.
  authority_tier     int     not null default 2 check (authority_tier between 1 and 7),

  status             text    not null default 'active'
                       check (status in ('active','stale','removed')),
  discovered_by      text    not null default 'crawler'
                       check (discovered_by in ('crawler','seed','manual')),

  first_seen_at      timestamptz not null default now(),
  last_checked_at    timestamptz,
  last_changed_at    timestamptz,
  created_at         timestamptz not null default now()
);

-- RLS: writes are performed by the monthly agent with the service-role key,
-- which bypasses RLS. Without RLS enabled, Supabase's default grants would let
-- any anon key insert or delete rows here, so it must stay on.
alter table documents enable row level security;

create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (status = 'active');

create index if not exists idx_doc_vendor     on documents(vendor);
create index if not exists idx_doc_type       on documents(doc_type);
create index if not exists idx_doc_status     on documents(status) where status = 'active';
create index if not exists idx_doc_techniques on documents using gin(techniques);
create index if not exists idx_doc_model      on documents(model);
create unique index if not exists idx_doc_url on documents(url);

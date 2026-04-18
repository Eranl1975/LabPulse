-- Knowledge items: one row per processed troubleshooting entry.
-- primary_source_id is denormalised for fast lookup;
-- full multi-source links live in evidence_links.
create table if not exists knowledge_items (
  id                   text primary key,     -- stable slug: technique--issue--source
  technique            text    not null check (technique in ('LCMS','HPLC','GC','GCMS')),
  instrument_family    text    not null default 'generic',
  model                text,
  issue_category       text    not null,
  symptom              text    not null,
  likely_causes        text[]  not null default '{}',
  diagnostics          text[]  not null default '{}',
  corrective_actions   text[]  not null default '{}',
  severity             text    not null default 'medium'
                         check (severity in ('low','medium','high','critical')),
  escalation_conditions text[] not null default '{}',

  -- Primary source (denormalised)
  primary_source_id    text references sources(id),
  source_type          text    not null default 'vendor'
                         check (source_type in ('vendor','scientific','community')),

  -- Scoring
  confidence_score     numeric(3,2) not null default 0.50
                         check (confidence_score between 0 and 1),
  evidence_strength    text    not null default 'moderate'
                         check (evidence_strength in ('strong','moderate','weak','anecdotal')),
  source_quality_score numeric(3,2)
                         check (source_quality_score between 0 and 1),

  -- Versioning & lifecycle
  version              int     not null default 1,
  is_deprecated        boolean not null default false,

  -- Timestamps
  publication_date     date,
  extracted_at         timestamptz,
  monthly_refresh_at   timestamptz,
  updated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now(),

  -- Metadata
  tags                 text[]  not null default '{}',
  contradiction_flags  text[]  not null default '{}'  -- IDs of conflicting items
);

create index if not exists idx_ki_technique        on knowledge_items(technique);
create index if not exists idx_ki_issue_category   on knowledge_items(issue_category);
create index if not exists idx_ki_tech_issue       on knowledge_items(technique, issue_category);
create index if not exists idx_ki_active           on knowledge_items(is_deprecated) where not is_deprecated;
create index if not exists idx_ki_primary_source   on knowledge_items(primary_source_id);

-- LabPulse — full combined schema
-- Run once in the Supabase SQL editor (idempotent: uses IF NOT EXISTS).
-- Individual migration files live in supabase/migrations/ (001–010).
-- Execution order matters: tables must be created before their dependants.

-- ============================================================
-- 001  sources
-- ============================================================
create table if not exists sources (
  id                   text    primary key,  -- slug: vendor--name
  name                 text    not null,
  vendor               text,
  source_type          text    not null default 'vendor'
                         check (source_type in ('vendor','scientific','community')),
  url                  text,
  authority_score      numeric(3,2) not null default 0.50
                         check (authority_score between 0 and 1),
  is_active            boolean not null default true,
  last_fetched_at      timestamptz,
  next_refresh_at      timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_src_type       on sources(source_type);
create index if not exists idx_src_active     on sources(is_active) where is_active;

-- ============================================================
-- 002  knowledge_items
-- ============================================================
create table if not exists knowledge_items (
  id                   text    primary key,  -- stable slug: technique--issue--source
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
  contradiction_flags  text[]  not null default '{}'
);

create index if not exists idx_ki_technique      on knowledge_items(technique);
create index if not exists idx_ki_issue_category on knowledge_items(issue_category);
create index if not exists idx_ki_tech_issue     on knowledge_items(technique, issue_category);
create index if not exists idx_ki_active         on knowledge_items(is_deprecated) where not is_deprecated;
create index if not exists idx_ki_primary_source on knowledge_items(primary_source_id);

-- ============================================================
-- 003  evidence_links
-- ============================================================
create table if not exists evidence_links (
  id                   uuid    primary key default gen_random_uuid(),
  knowledge_item_id    text    not null references knowledge_items(id) on delete cascade,
  source_id            text    not null references sources(id),
  excerpt              text,
  evidence_strength    text    not null default 'moderate'
                         check (evidence_strength in ('strong','moderate','weak','anecdotal')),
  publication_date     date,
  created_at           timestamptz not null default now(),

  unique (knowledge_item_id, source_id)
);

create index if not exists idx_el_item   on evidence_links(knowledge_item_id);
create index if not exists idx_el_source on evidence_links(source_id);

-- ============================================================
-- 004  evidence_conflicts
-- ============================================================
create table if not exists evidence_conflicts (
  id               uuid    primary key default gen_random_uuid(),
  item_a_id        text    not null references knowledge_items(id) on delete cascade,
  item_b_id        text    not null references knowledge_items(id) on delete cascade,
  conflict_summary text    not null,
  severity         text    not null default 'medium'
                     check (severity in ('low','medium','high','critical')),
  resolved         boolean not null default false,
  resolved_at      timestamptz,
  resolver_note    text,
  detected_at      timestamptz not null default now(),

  check (item_a_id < item_b_id),
  unique (item_a_id, item_b_id)
);

create index if not exists idx_ec_item_a     on evidence_conflicts(item_a_id);
create index if not exists idx_ec_item_b     on evidence_conflicts(item_b_id);
create index if not exists idx_ec_unresolved on evidence_conflicts(resolved) where not resolved;

-- ============================================================
-- 005  user_queries
-- ============================================================
create table if not exists user_queries (
  id                   uuid    primary key default gen_random_uuid(),
  session_id           uuid,
  technique            text    not null check (technique in ('LCMS','HPLC','GC','GCMS')),
  instrument_family    text,
  model                text,
  issue_category       text,
  symptom_description  text    not null,
  method_conditions    text,
  already_checked      text[],
  urgency              text    not null default 'medium'
                         check (urgency in ('low','medium','high','critical')),
  created_at           timestamptz not null default now()
);

create index if not exists idx_uq_session   on user_queries(session_id);
create index if not exists idx_uq_technique on user_queries(technique);
create index if not exists idx_uq_created   on user_queries(created_at desc);

-- ============================================================
-- 006  answer_sessions
-- ============================================================
create table if not exists answer_sessions (
  id                   uuid    primary key default gen_random_uuid(),
  query_id             uuid    references user_queries(id) on delete set null,
  confidence_tier      text    not null
                         check (confidence_tier in ('highly_likely','plausible','low_confidence','insufficient')),
  confidence_score     numeric(3,2) check (confidence_score between 0 and 1),
  items_considered     int     not null default 0,
  items_matched        int     not null default 0,
  ranked_answer_json   jsonb   not null default '{}',
  mode_concise         text,
  mode_standard        text,
  mode_deep            text,
  mode_manager         jsonb,
  helpful              boolean,
  feedback_note        text,
  feedback_at          timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists idx_as_query   on answer_sessions(query_id);
create index if not exists idx_as_created on answer_sessions(created_at desc);
create index if not exists idx_as_tier    on answer_sessions(confidence_tier);

-- ============================================================
-- 007  source_refresh_runs
-- ============================================================
create table if not exists source_refresh_runs (
  id                   uuid    primary key default gen_random_uuid(),
  run_date             date    not null,
  triggered_by         text    not null default 'scheduler'
                         check (triggered_by in ('scheduler','manual','test')),
  dry_run              boolean not null default false,
  sources_checked      int     not null default 0,
  items_fetched        int     not null default 0,
  items_new            int     not null default 0,
  items_updated        int     not null default 0,
  items_deprecated     int     not null default 0,
  conflicts_found      int     not null default 0,
  status               text    not null default 'running'
                         check (status in ('running','success','partial','failed')),
  error_message        text,
  report_json          jsonb   not null default '{}',
  started_at           timestamptz not null default now(),
  finished_at          timestamptz
);

create index if not exists idx_srr_run_date on source_refresh_runs(run_date desc);
create index if not exists idx_srr_status   on source_refresh_runs(status);

-- ============================================================
-- 008  generated_reports
-- ============================================================
create table if not exists generated_reports (
  id                   uuid    primary key default gen_random_uuid(),
  refresh_run_id       uuid    references source_refresh_runs(id) on delete set null,
  report_type          text    not null default 'monthly_update'
                         check (report_type in ('monthly_update','gap_analysis','conflict_summary','custom')),
  title                text    not null,
  body_text            text    not null,
  report_json          jsonb   not null default '{}',
  generated_at         timestamptz not null default now()
);

create index if not exists idx_gr_run     on generated_reports(refresh_run_id);
create index if not exists idx_gr_type    on generated_reports(report_type);
create index if not exists idx_gr_created on generated_reports(generated_at desc);

-- ============================================================
-- 009  agent_runs
-- ============================================================
create table if not exists agent_runs (
  id                   uuid    primary key default gen_random_uuid(),
  agent_name           text    not null
                         check (agent_name in ('acquisition','ranking','presentation')),
  trigger_context      text,
  input_summary        jsonb   not null default '{}',
  status               text    not null default 'running'
                         check (status in ('running','success','error')),
  error_message        text,
  items_processed      int     not null default 0,
  duration_ms          int,
  started_at           timestamptz not null default now(),
  finished_at          timestamptz
);

create index if not exists idx_ar_agent   on agent_runs(agent_name);
create index if not exists idx_ar_status  on agent_runs(status);
create index if not exists idx_ar_started on agent_runs(started_at desc);

-- ============================================================
-- 010  audit_logs
-- ============================================================
create table if not exists audit_logs (
  id                   bigserial primary key,
  entity_type          text    not null
                         check (entity_type in ('knowledge_item','source','evidence_link','evidence_conflict')),
  entity_id            text    not null,
  action               text    not null
                         check (action in ('create','update','deprecate','restore','conflict_detected','conflict_resolved')),
  changed_fields       text[]  not null default '{}',
  old_values           jsonb,
  new_values           jsonb,
  actor                text    not null default 'system',
  source_run_id        uuid,
  is_redacted          boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists idx_al_entity     on audit_logs(entity_type, entity_id);
create index if not exists idx_al_action     on audit_logs(action);
create index if not exists idx_al_created    on audit_logs(created_at desc);
create index if not exists idx_al_source_run on audit_logs(source_run_id);

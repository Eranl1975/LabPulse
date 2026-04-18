-- answer_sessions: one row per ranked-answer returned to a user.
-- Stores the full ranked_answer payload + every mode's formatted output.
create table if not exists answer_sessions (
  id                   uuid    primary key default gen_random_uuid(),
  query_id             uuid    references user_queries(id) on delete set null,

  -- Ranked answer core fields (denormalised for fast display)
  confidence_tier      text    not null
                         check (confidence_tier in ('highly_likely','plausible','low_confidence','insufficient')),
  confidence_score     numeric(3,2) check (confidence_score between 0 and 1),
  items_considered     int     not null default 0,
  items_matched        int     not null default 0,

  -- Full payloads (JSONB for flexibility)
  ranked_answer_json   jsonb   not null default '{}',
  mode_concise         text,
  mode_standard        text,
  mode_deep            text,
  mode_manager         jsonb,

  -- Feedback (populated later)
  helpful              boolean,
  feedback_note        text,
  feedback_at          timestamptz,

  created_at           timestamptz not null default now()
);

create index if not exists idx_as_query     on answer_sessions(query_id);
create index if not exists idx_as_created   on answer_sessions(created_at desc);
create index if not exists idx_as_tier      on answer_sessions(confidence_tier);

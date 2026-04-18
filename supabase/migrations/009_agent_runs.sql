-- agent_runs: one row per agent invocation (acquisition, ranking, presentation).
-- Lightweight observability — not a full trace, just top-level stats.
create table if not exists agent_runs (
  id                   uuid    primary key default gen_random_uuid(),
  agent_name           text    not null
                         check (agent_name in ('acquisition','ranking','presentation')),
  trigger_context      text,   -- e.g. query_id, refresh_run_id, or 'health-check'
  input_summary        jsonb   not null default '{}',

  -- Outcome
  status               text    not null default 'running'
                         check (status in ('running','success','error')),
  error_message        text,
  items_processed      int     not null default 0,
  duration_ms          int,

  started_at           timestamptz not null default now(),
  finished_at          timestamptz
);

create index if not exists idx_ar_agent    on agent_runs(agent_name);
create index if not exists idx_ar_status   on agent_runs(status);
create index if not exists idx_ar_started  on agent_runs(started_at desc);

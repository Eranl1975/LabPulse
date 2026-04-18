-- source_refresh_runs: audit trail for each monthly acquisition pipeline run.
create table if not exists source_refresh_runs (
  id                   uuid    primary key default gen_random_uuid(),
  run_date             date    not null,
  triggered_by         text    not null default 'scheduler'
                         check (triggered_by in ('scheduler','manual','test')),
  dry_run              boolean not null default false,

  -- Outcome counters
  sources_checked      int     not null default 0,
  items_fetched        int     not null default 0,
  items_new            int     not null default 0,
  items_updated        int     not null default 0,
  items_deprecated     int     not null default 0,
  conflicts_found      int     not null default 0,

  -- Status
  status               text    not null default 'running'
                         check (status in ('running','success','partial','failed')),
  error_message        text,

  -- Full pipeline report (JSONB)
  report_json          jsonb   not null default '{}',

  started_at           timestamptz not null default now(),
  finished_at          timestamptz
);

create index if not exists idx_srr_run_date on source_refresh_runs(run_date desc);
create index if not exists idx_srr_status   on source_refresh_runs(status);

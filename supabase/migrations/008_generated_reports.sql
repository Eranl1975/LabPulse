-- generated_reports: stores user-facing monthly or on-demand reports.
create table if not exists generated_reports (
  id                   uuid    primary key default gen_random_uuid(),
  refresh_run_id       uuid    references source_refresh_runs(id) on delete set null,
  report_type          text    not null default 'monthly_update'
                         check (report_type in ('monthly_update','gap_analysis','conflict_summary','custom')),
  title                text    not null,
  body_text            text    not null,   -- plain-text formatted report
  report_json          jsonb   not null default '{}',
  generated_at         timestamptz not null default now()
);

create index if not exists idx_gr_run      on generated_reports(refresh_run_id);
create index if not exists idx_gr_type     on generated_reports(report_type);
create index if not exists idx_gr_created  on generated_reports(generated_at desc);

-- Error tracking table for structured logging persistence
create table if not exists error_logs (
  id              bigserial   primary key,
  level           text        not null check (level in ('info', 'warn', 'error')),
  module          text        not null,
  message         text        not null,
  stack           text,
  user_id         uuid,
  request_context jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_errlog_ts     on error_logs(created_at desc);
create index if not exists idx_errlog_module on error_logs(module);
create index if not exists idx_errlog_level  on error_logs(level);

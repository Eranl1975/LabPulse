-- audit_logs: immutable append-only change log for knowledge_items and sources.
-- Never delete rows; soft-flag with is_redacted for sensitive entries.
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
  actor                text    not null default 'system',  -- 'system' | 'pipeline' | user identifier
  source_run_id        uuid,   -- references source_refresh_runs(id), nullable
  is_redacted          boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists idx_al_entity      on audit_logs(entity_type, entity_id);
create index if not exists idx_al_action      on audit_logs(action);
create index if not exists idx_al_created     on audit_logs(created_at desc);
create index if not exists idx_al_source_run  on audit_logs(source_run_id);

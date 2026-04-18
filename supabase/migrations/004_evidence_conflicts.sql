-- evidence_conflicts: records contradictions detected between knowledge items.
-- item_a_id < item_b_id enforced to avoid duplicate pairs.
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

create index if not exists idx_ec_item_a    on evidence_conflicts(item_a_id);
create index if not exists idx_ec_item_b    on evidence_conflicts(item_b_id);
create index if not exists idx_ec_unresolved on evidence_conflicts(resolved) where not resolved;

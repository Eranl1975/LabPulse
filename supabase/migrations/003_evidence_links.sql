-- evidence_links: maps knowledge_items to supporting sources (many-to-many).
-- Supplements the denormalised primary_source_id on knowledge_items.
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

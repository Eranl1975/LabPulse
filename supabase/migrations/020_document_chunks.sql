-- document_chunks: searchable passages of a document, one row per section/page slice.
-- Mirrors the full-text pattern used for knowledge_items in 017_kb_fulltext.sql.

create table if not exists document_chunks (
  id           bigserial primary key,
  document_id  text    not null references documents(id) on delete cascade,
  chunk_index  int     not null,
  heading      text,
  page_number  int,
  text         text    not null,
  tsv          tsvector,
  created_at   timestamptz not null default now(),

  unique (document_id, chunk_index)
);

-- RLS, for the same reason as documents: only the service-role key writes here.
alter table document_chunks enable row level security;

create policy "Authenticated users can read document chunks"
  on document_chunks for select
  to authenticated
  using (true);

create index if not exists idx_dc_document on document_chunks(document_id);
create index if not exists idx_dc_tsv      on document_chunks using gin(tsv);

-- Keep tsv in sync (same approach as ki_tsv_trigger).
create or replace function dc_tsv_trigger() returns trigger as $$
begin
  new.tsv := to_tsvector('english',
    coalesce(new.heading, '') || ' ' || coalesce(new.text, '')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_dc_tsv on document_chunks;
create trigger trg_dc_tsv before insert or update on document_chunks
  for each row execute function dc_tsv_trigger();

-- Backfill any rows inserted before the trigger existed.
update document_chunks set tsv = to_tsvector('english',
  coalesce(heading, '') || ' ' || coalesce(text, '')
) where tsv is null;

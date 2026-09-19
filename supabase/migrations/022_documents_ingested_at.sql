-- Operator-supplied ingestion, and making an un-ingested document visible.
--
-- Agilent and Restek return HTTP 403 to automated clients, so their curated rows
-- can never gain chunks from a crawl. An operator who may read those manuals in
-- a browser downloads them and ingests the local files instead. `ingested_at`
-- records when that last happened, and distinguishes those rows from ones whose
-- content came from the monthly crawl.

alter table documents
  add column if not exists ingested_at timestamptz;

comment on column documents.ingested_at is
  'When an operator last ingested a local PDF for this document. Null for crawler-sourced content.';

create index if not exists idx_doc_ingested_at on documents(ingested_at) where ingested_at is not null;

-- Per-document chunk counts for the admin view.
--
-- PostgREST aggregate functions are disabled on this project, so the API cannot
-- ask for count() directly and counting client-side would mean reading every
-- chunk row. The view does it in the database instead.
--
-- security_invoker = on so the view is subject to the caller's RLS rather than
-- the owner's: reading it gives exactly the rows the underlying tables allow.
create or replace view document_chunk_counts
  with (security_invoker = on) as
  select
    d.id                       as document_id,
    count(c.id)::bigint        as chunk_count
  from documents d
  left join document_chunks c on c.document_id = d.id
  group by d.id;

comment on view document_chunk_counts is
  'One row per document with its searchable passage count. 0 means metadata only.';

-- RLS pattern of 019/020: readable by authenticated, written only via the
-- service-role key. The view inherits both from documents and document_chunks
-- through security_invoker, so it needs a grant but no policy of its own.
grant select on document_chunk_counts to authenticated;

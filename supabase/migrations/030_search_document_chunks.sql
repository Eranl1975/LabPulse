-- 030: ranked full-text search over vendor-manual passages (v8.2).
--
-- The answer pipeline used to query document_chunks through PostgREST with every
-- search term joined by AND, so a passage matched only if it contained every
-- word of the user's description ("Problem in openning openlab CDS" needed all
-- five). Real descriptions almost never match that way, so stored manuals were
-- rarely cited. This function matches ANY term and orders passages by relevance
-- (ts_rank_cd), so the best passages of the right vendor's manuals come first.
--
-- Called only by the server with the service-role key (lib/document-search.ts);
-- EXECUTE is revoked from everyone else, as for the other server-side functions
-- (migration 025). SECURITY INVOKER, so RLS on both tables still applies.

create or replace function public.search_document_chunks(
  p_terms     text[],
  p_technique text,
  p_vendor    text default null,
  p_limit     int  default 6
)
returns table (
  document_id      text,
  heading          text,
  page_number      int,
  text             text,
  rank             real,
  title            text,
  vendor           text,
  doc_type         text,
  document_number  text,
  url              text,
  publication_date date,
  model            text,
  techniques       text[],
  authority_tier   int,
  status           text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('pg_catalog.english', array_to_string(p_terms, ' or ')) as tsq
  )
  select c.document_id, c.heading, c.page_number, c.text,
         ts_rank_cd(c.tsv, q.tsq) as rank,
         d.title, d.vendor, d.doc_type, d.document_number, d.url, d.publication_date,
         d.model, d.techniques, d.authority_tier, d.status
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  cross join q
  where d.status = 'active'
    and p_technique = any (d.techniques)
    and (p_vendor is null or d.vendor ilike '%' || p_vendor || '%')
    and c.tsv @@ q.tsq
  order by rank desc, c.document_id, c.chunk_index
  limit least(greatest(coalesce(p_limit, 6), 1), 25);
$$;

revoke execute on function public.search_document_chunks(text[], text, text, int) from public, anon, authenticated;
grant execute on function public.search_document_chunks(text[], text, text, int) to service_role;

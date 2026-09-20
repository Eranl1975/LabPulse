-- knowledge_items.deleted_at was introduced in 014_v4_upgrades.sql, but 014 was
-- never applied to the hosted project and is absent from the bootstrap script,
-- so the column does not exist.
--
-- lib/store.ts readItemsFromSupabase() filters on `deleted_at=is.null`, so every
-- call returned HTTP 400 ("column knowledge_items.deleted_at does not exist").
-- The error is swallowed by the `!res.ok` branch, which returns null, so the
-- failure was invisible: the caller just fell back to the on-disk catalogue.
--
-- Only this column is taken from 014. The three tables 014 also creates
-- (query_history, api_keys, usage_metrics) are not referenced anywhere in the
-- application, so creating them here would add unused schema — and 014's own
-- CREATE INDEX / CREATE POLICY statements are not idempotent.

alter table knowledge_items
  add column if not exists deleted_at timestamptz;

comment on column knowledge_items.deleted_at is
  'Soft-delete timestamp. Null means active. Originally from 014_v4_upgrades.sql.';

create index if not exists idx_knowledge_items_active
  on knowledge_items(technique, issue_category)
  where deleted_at is null;

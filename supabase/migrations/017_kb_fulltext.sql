-- Full-text search on knowledge_items
alter table knowledge_items add column if not exists tsv tsvector;

-- Populate existing rows
update knowledge_items set tsv = to_tsvector('english',
  coalesce(symptom, '') || ' ' ||
  coalesce(issue_category, '') || ' ' ||
  coalesce(array_to_string(likely_causes, ' '), '')
);

-- GIN index for fast search
create index if not exists idx_ki_tsv on knowledge_items using gin(tsv);

-- Auto-update trigger
create or replace function ki_tsv_trigger() returns trigger as $$
begin
  new.tsv := to_tsvector('english',
    coalesce(new.symptom, '') || ' ' ||
    coalesce(new.issue_category, '') || ' ' ||
    coalesce(array_to_string(new.likely_causes, ' '), '')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ki_tsv on knowledge_items;
create trigger trg_ki_tsv before insert or update on knowledge_items
  for each row execute function ki_tsv_trigger();

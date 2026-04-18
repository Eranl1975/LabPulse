-- Sources: every knowledge item traces back to one or more entries here.
create table if not exists sources (
  id             text primary key,          -- stable slug, e.g. 'agilent-hplc-guide'
  name           text    not null,
  source_type    text    not null check (source_type in ('vendor','scientific','community')),
  vendor         text,                      -- null for non-vendor sources
  url            text,
  authority_score numeric(3,2) not null default 0.50
                   check (authority_score between 0 and 1),
  last_fetched_at timestamptz,
  created_at     timestamptz not null default now()
);

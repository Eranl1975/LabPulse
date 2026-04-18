-- user_queries: one row per troubleshooting question submitted by a user.
create table if not exists user_queries (
  id                   uuid    primary key default gen_random_uuid(),
  session_id           uuid,   -- links to answer_sessions; nullable before session created
  technique            text    not null check (technique in ('LCMS','HPLC','GC','GCMS')),
  instrument_family    text,
  model                text,
  issue_category       text,
  symptom_description  text    not null,
  method_conditions    text,
  already_checked      text[], -- steps user already tried
  urgency              text    not null default 'medium'
                         check (urgency in ('low','medium','high','critical')),
  created_at           timestamptz not null default now()
);

create index if not exists idx_uq_session   on user_queries(session_id);
create index if not exists idx_uq_technique on user_queries(technique);
create index if not exists idx_uq_created   on user_queries(created_at desc);

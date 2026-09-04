-- Rate limit entries (replaces in-memory Map for multi-instance deployments)
create table if not exists rate_limit_entries (
  key          text        primary key,
  count        int         not null default 1,
  reset_at     timestamptz not null,
  updated_at   timestamptz not null default now()
);

create index if not exists idx_rl_reset on rate_limit_entries(reset_at);

-- Atomic check-and-increment function
create or replace function check_rate_limit(p_key text, p_limit int, p_window_ms int)
returns jsonb as $$
declare
  v_entry rate_limit_entries;
  v_reset_at timestamptz;
begin
  v_reset_at := now() + (p_window_ms || ' milliseconds')::interval;

  select * into v_entry from rate_limit_entries where key = p_key for update;

  if v_entry is null or v_entry.reset_at < now() then
    insert into rate_limit_entries (key, count, reset_at, updated_at)
    values (p_key, 1, v_reset_at, now())
    on conflict (key) do update set count = 1, reset_at = v_reset_at, updated_at = now();
    return jsonb_build_object('allowed', true);
  end if;

  if v_entry.count >= p_limit then
    return jsonb_build_object('allowed', false);
  end if;

  update rate_limit_entries set count = count + 1, updated_at = now() where key = p_key;
  return jsonb_build_object('allowed', true);
end;
$$ language plpgsql;

-- Cleanup expired entries (call periodically or via pg_cron)
create or replace function cleanup_expired_rate_limits() returns void as $$
  delete from rate_limit_entries where reset_at < now();
$$ language sql;

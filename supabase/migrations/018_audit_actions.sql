-- Expand audit_logs action constraint for auth events
alter table audit_logs drop constraint if exists audit_logs_action_check;
alter table audit_logs add constraint audit_logs_action_check
  check (action in (
    'create', 'update', 'deprecate', 'restore',
    'conflict_detected', 'conflict_resolved',
    'auth_blocked', 'auth_rate_limited', 'auth_trial_expired', 'auth_locked'
  ));

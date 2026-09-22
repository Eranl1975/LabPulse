-- 025: Clear the remaining function-level security advisories
-- (anon/authenticated_security_definer_function_executable,
--  function_search_path_mutable), 2026-09-22.
--
-- 1. handle_new_user() is a SECURITY DEFINER trigger function that inserts
--    into public.profiles. It was granted EXECUTE to anon and authenticated,
--    exposing it at /rest/v1/rpc/handle_new_user. Nothing should call it
--    directly — it fires from a trigger on auth.users, and trigger execution
--    does not check EXECUTE privilege — so revoke it from every caller.
--
-- 2. Pin search_path on the four functions. An unpinned search_path lets a
--    caller's session resolve unqualified names, which matters most for the
--    SECURITY DEFINER function. Bodies below fully qualify every non-builtin
--    reference; pg_catalog is always searched implicitly, so now() and
--    to_tsvector still resolve under search_path = ''.

-- ── 1. Revoke RPC access to the SECURITY DEFINER function ────────────────

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Tighten from 'public' to '' — the body already qualifies public.profiles.
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- ── 2. Pin search_path on the three trigger functions ────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ki_tsv_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  new.tsv := to_tsvector('pg_catalog.english',
    coalesce(new.symptom, '') || ' ' ||
    coalesce(new.issue_category, '') || ' ' ||
    coalesce(array_to_string(new.likely_causes, ' '), '')
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dc_tsv_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  new.tsv := to_tsvector('pg_catalog.english',
    coalesce(new.heading, '') || ' ' || coalesce(new.text, '')
  );
  return new;
end;
$function$;

-- 024: Enable Row Level Security on the four acquisition tables that were
-- left exposed (Supabase advisor: rls_disabled_in_public, 2026-09-22).
--
-- Without RLS these tables are readable AND writable by anyone holding the
-- anon key, which ships to the browser. Policies below mirror the pattern
-- already used by documents/document_chunks (019/020):
--
--   * knowledge base (sources, knowledge_items) — authenticated users read;
--     all writes go through the service role, which bypasses RLS.
--   * operational run logs (source_refresh_runs, agent_runs) — admins read;
--     the pipeline writes them with the service role.
--
-- No policy grants anything to the anon role: signed-out callers get nothing.

-- ── Knowledge base ────────────────────────────────────────────────────────

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sources" ON public.sources
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Matches the filter the app already applies when reading the KB.
CREATE POLICY "Authenticated users can read knowledge items" ON public.knowledge_items
  FOR SELECT TO authenticated
  USING (is_deprecated = false AND deleted_at IS NULL);

-- ── Operational run logs ──────────────────────────────────────────────────

ALTER TABLE public.source_refresh_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read refresh runs" ON public.source_refresh_runs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read agent runs" ON public.agent_runs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id             BIGSERIAL   PRIMARY KEY,
  admin_id       UUID        NOT NULL REFERENCES auth.users(id),
  admin_email    TEXT,
  action         TEXT        NOT NULL,
  target_user_id UUID        REFERENCES auth.users(id),
  target_email   TEXT,
  details        JSONB,
  ip_address     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_select_admin" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "admin_audit_insert_admin" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

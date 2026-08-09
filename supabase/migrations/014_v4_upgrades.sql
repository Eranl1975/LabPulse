-- LabPulse v4.0.0 migration
-- Adds: query_history, api_keys, soft-delete support, usage_metrics

-- 1. Query history (persisted, replaces localStorage reports)
CREATE TABLE IF NOT EXISTS query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique TEXT NOT NULL,
  vendor TEXT,
  model TEXT,
  issue_category TEXT,
  symptom_description TEXT NOT NULL,
  method_conditions TEXT,
  already_checked TEXT[] DEFAULT '{}',
  confidence NUMERIC(3,2),
  ai_assisted BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'partially', 'not_resolved')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  response_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_history_user ON query_history(user_id, created_at DESC);
CREATE INDEX idx_query_history_technique ON query_history(technique);

-- RLS: users see only their own queries
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY query_history_own ON query_history
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY query_history_admin ON query_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. API keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'default',
  scopes TEXT[] DEFAULT '{query}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_own ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- 3. Add soft-delete column to knowledge_items if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_items') THEN
    ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_active ON knowledge_items(technique, issue_category) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- 4. Usage metrics (for billing and analytics)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'query',
  technique TEXT,
  ai_model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_metrics_user_date ON usage_metrics(user_id, created_at DESC);
CREATE INDEX idx_usage_metrics_billing ON usage_metrics(user_id, action, created_at);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_metrics_own ON usage_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY usage_metrics_admin ON usage_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

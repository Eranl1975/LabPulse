// Lazy Supabase clients — not created at module level to avoid Next.js SSR prerender
// failures when environment variables are absent.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  _client = createClient(url, key);
  return _client;
}

/**
 * Server-only client that bypasses RLS. The knowledge tables (sources,
 * knowledge_items) have RLS enabled with no write policy — writes belong to
 * trusted server code, never to the anon key. Same key the rest of the
 * pipeline already uses (run-state.ts, document-persist.ts, store.ts).
 *
 * Never import this into a client component: the service role key must not
 * reach the browser.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  _serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

import { NextResponse } from 'next/server';
import { readItems } from '@/lib/store';
import { validateEnv } from '@/lib/env';

export async function GET() {
  const env = validateEnv();
  const items = readItems();

  // Check Supabase connectivity
  let dbStatus = 'unconfigured';
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(3000),
      });
      dbStatus = res.ok ? 'connected' : `error (${res.status})`;
    } catch {
      dbStatus = 'unreachable';
    }
  }

  // Check AI availability
  const aiStatus = process.env.ANTHROPIC_API_KEY ? 'configured' : 'unconfigured';

  const overall = env.valid && dbStatus === 'connected' ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overall,
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      ai_service: aiStatus,
      knowledge_base: { items_count: items.length, status: items.length > 0 ? 'ok' : 'empty' },
      environment: { valid: env.valid, missing: env.missing, warnings: env.warnings },
    },
  });
}

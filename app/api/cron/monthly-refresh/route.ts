// GET /api/cron/monthly-refresh — first-of-month vendor documentation refresh.
//
// Scheduled by vercel.json ("0 6 1 * *"). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; every other caller is rejected.
//
// One invocation processes a bounded batch of vendors. When vendors remain, the
// response sets resume_required and the run stays open for the next call.

import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyBatch, formatMonthlyRun } from '@/agents/acquisition/monthly-run';
import { MockPersistenceAdapter, SupabasePersistenceAdapter, type PersistenceAdapter } from '@/agents/acquisition';
import {
  MockDocumentStore, SupabaseDocumentStore, hasDocumentStoreCredentials, type DocumentStore,
} from '@/agents/acquisition/pipeline/document-persist';
import {
  MockRunStateStore, SupabaseRunStateStore, hasRunStateCredentials, type RunStateStore,
} from '@/agents/acquisition/pipeline/run-state';
import { sendRefreshReport } from '@/lib/refresh-report-email';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const log = createLogger('api/cron/monthly-refresh');

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && timingSafeEqual(header, expected);
}

/** Constant-time compare so the secret cannot be recovered by timing the endpoint. */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    log.error('config', 'CRON_SECRET is not set; refusing to run the scheduled refresh');
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this deployment.' },
      { status: 503 },
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') === 'true';
  const live = hasRunStateCredentials() && hasDocumentStoreCredentials();

  let runState: RunStateStore;
  let documents: DocumentStore;
  let persistence: PersistenceAdapter;

  if (live && !dryRun) {
    runState = new SupabaseRunStateStore();
    documents = new SupabaseDocumentStore();
    try {
      persistence = new SupabasePersistenceAdapter();
    } catch {
      persistence = new MockPersistenceAdapter();
    }
  } else {
    runState = new MockRunStateStore();
    documents = new MockDocumentStore();
    persistence = new MockPersistenceAdapter();
  }

  try {
    const outcome = await runMonthlyBatch({
      runState, persistence, documents,
      triggeredBy: 'scheduler',
      dryRun,
    });

    const summary = formatMonthlyRun(outcome);
    log.info('run', 'monthly refresh batch finished', {
      run_id: outcome.run_id, status: outcome.status, pending: outcome.pending.length,
    });

    // Report once the whole run is done, not after every batch.
    let report: Awaited<ReturnType<typeof sendRefreshReport>> | null = null;
    if (!outcome.resume_required && !dryRun) {
      report = await sendRefreshReport(
        `LabPulse documentation refresh — ${outcome.status}`,
        summary,
      );
    }

    return NextResponse.json({
      ...outcome,
      persistence_mode: live && !dryRun ? 'supabase' : 'mock',
      report_email: report,
      summary,
    });
  } catch (err) {
    log.error('run', 'monthly refresh batch failed', { error: String(err) });
    return NextResponse.json({ error: `Refresh failed: ${String(err)}` }, { status: 500 });
  }
}

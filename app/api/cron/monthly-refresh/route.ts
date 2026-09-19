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

/**
 * Kept at 60 s, the ceiling on Vercel's lowest paid-feature tier, so the route
 * deploys on any plan. The run is time-budgeted below this and resumes across
 * invocations, so a longer limit only means fewer calls, never more coverage.
 * If your plan allows longer functions, raise this and BUDGET_MS together.
 */
export const maxDuration = 60;

/** Leaves headroom for run bookkeeping and the report email after the crawl stops. */
const BUDGET_MS = 45_000;

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
  // Drain call: finish an open run, and do nothing when none is open.
  const continueOnly = req.nextUrl.searchParams.get('continue') === 'true';
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
      budgetMs: BUDGET_MS,
      continueOnly,
    });

    if (outcome.status === 'idle') {
      return NextResponse.json({ ...outcome, summary: 'No run in progress; nothing to do.' });
    }

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

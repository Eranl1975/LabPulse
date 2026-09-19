// Monthly run orchestrator.
//
// One invocation processes a bounded number of vendors and returns; the run row
// keeps the remaining vendors in report_json.pending so the next invocation
// (cron retry or admin trigger) resumes exactly where this one stopped.

import type { Technique } from '@/lib/types';
import type { PersistenceAdapter } from './pipeline/persist';
import type { DocumentStore } from './pipeline/document-persist';
import type { RunStateStore, RefreshRun, VendorResult, RunReport } from './pipeline/run-state';
import { getCrawlableVendorSites, getVendorSite } from './config/vendor-sites';
import { VendorWebAdapter } from './adapters/vendor-web';
import { PoliteFetcher, type FetcherOptions } from './discovery/fetcher';
import { runAcquisitionPipeline } from './index';
import { EMPTY_REPORT } from './pipeline/run-state';

const DEFAULT_TECHNIQUES: Technique[] = ['LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC'];

/**
 * Upper bound on vendors per invocation. The real limiter is the time budget
 * below: a measured live crawl of two vendors took ~73 s, so a batch normally
 * stops on the clock and re-queues the rest.
 */
export const DEFAULT_VENDORS_PER_BATCH = 3;

/**
 * Wall-clock budget for one invocation. Set below the function's maxDuration so
 * the run always returns a saved, resumable state instead of being killed
 * mid-batch. Raise both together if the deployment allows longer functions.
 */
export const DEFAULT_BUDGET_MS = 45_000;

export interface MonthlyRunOptions {
  runState: RunStateStore;
  persistence: PersistenceAdapter;
  documents: DocumentStore;
  triggeredBy: 'scheduler' | 'manual' | 'test';
  dryRun?: boolean;
  techniques?: Technique[];
  vendorsPerBatch?: number;
  /** Restrict the run to these source_ids (used by the dry-run smoke test). */
  onlySourceIds?: string[];
  /** Also attempt vendors whose sites currently reject automated clients. */
  includeBlocked?: boolean;
  /** Wall-clock budget for this invocation; defaults to DEFAULT_BUDGET_MS. */
  budgetMs?: number;
  /**
   * Resume an open run only; never start a new one. The drain schedule uses this
   * so a frequent trigger finishes the month's run without starting extra ones.
   */
  continueOnly?: boolean;
  fetcherOptions?: FetcherOptions;
}

export interface MonthlyRunOutcome {
  run_id: string | null;
  status: RefreshRun['status'] | 'idle';
  processed: VendorResult[];
  pending: string[];
  /** True when more vendors remain and another invocation is needed. */
  resume_required: boolean;
  dry_run: boolean;
}

/**
 * Run one batch. Creates a new run when none is in progress, otherwise resumes
 * the open one.
 */
export async function runMonthlyBatch(opts: MonthlyRunOptions): Promise<MonthlyRunOutcome> {
  const {
    runState, persistence, documents,
    triggeredBy, dryRun = false,
    techniques = DEFAULT_TECHNIQUES,
    vendorsPerBatch = DEFAULT_VENDORS_PER_BATCH,
  } = opts;

  const allSourceIds = opts.onlySourceIds
    ?? getCrawlableVendorSites(opts.includeBlocked).map(v => v.source_id);

  let run = await runState.findResumable();

  // Drain mode: nothing open means there is nothing to do. Without this, a
  // frequent trigger would start a brand-new run on every invocation.
  if (!run && opts.continueOnly) {
    return {
      run_id: null, status: 'idle', processed: [], pending: [],
      resume_required: false, dry_run: dryRun,
    };
  }

  if (!run) {
    run = await runState.create({
      run_date: new Date().toISOString().slice(0, 10),
      triggered_by: triggeredBy,
      dry_run: dryRun,
      status: 'running',
      sources_checked: 0,
      items_fetched: 0,
      items_new: 0,
      items_updated: 0,
      items_deprecated: 0,
      conflicts_found: 0,
      error_message: null,
      report_json: { ...EMPTY_REPORT, pending: allSourceIds },
      // started_at/finished_at are assigned by the store.
    } as Omit<RefreshRun, 'id' | 'started_at' | 'finished_at'>);
  }

  const report: RunReport = run.report_json;
  const batch = report.pending.slice(0, Math.max(1, vendorsPerBatch));
  const processed: VendorResult[] = [];
  /** Vendors that ran out of time and must be attempted again next invocation. */
  const incomplete: string[] = [];

  // One fetcher for the batch so robots.txt and per-host delays are shared.
  const fetcher = new PoliteFetcher(opts.fetcherOptions);

  const deadlineAt = Date.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS);
  let fatal: string | null = null;

  for (const sourceId of batch) {
    const site = getVendorSite(sourceId);
    if (!site) {
      processed.push(emptyResult(sourceId, sourceId, ['unknown source_id — not in vendor-sites.ts']));
      continue;
    }

    // Out of time before this vendor even started: leave it for the next call.
    if (Date.now() >= deadlineAt) {
      incomplete.push(sourceId);
      continue;
    }

    try {
      const known = await documents.getKnown(sourceId);
      const adapter = new VendorWebAdapter(site, { fetcher, known, deadlineAt });

      const { stats } = await runAcquisitionPipeline([adapter], persistence, {
        techniques,
        dry_run: dryRun,
        since: null,
      });

      if (!dryRun) {
        const docs = adapter.getDocuments();
        if (docs.length > 0) {
          await documents.upsertDocuments(docs);
          await documents.replaceChunks(adapter.getChunks());
        }
      }

      // Partially crawled vendors are re-queued so no documents are silently lost.
      if (adapter.stat.hit_deadline) incomplete.push(sourceId);

      processed.push({
        source_id: sourceId,
        vendor: site.vendor,
        pages_visited: adapter.stat.pages_visited,
        documents_found: adapter.stat.documents_found,
        documents_unchanged: adapter.stat.documents_unchanged,
        documents_skipped: adapter.stat.documents_skipped,
        hit_deadline: adapter.stat.hit_deadline,
        items_new: stats.items_new,
        items_updated: stats.items_updated,
        errors: [...adapter.stat.errors, ...stats.errors].slice(0, 10),
        finished_at: new Date().toISOString(),
      });
    } catch (err) {
      // One vendor failing must not abort the run; record it and continue.
      processed.push(emptyResult(sourceId, site.vendor, [String(err)]));
    }
  }

  const completed = [...report.completed, ...processed];
  // Re-queued vendors go to the front so a half-crawled site is finished first.
  const pending = [...incomplete, ...report.pending.slice(batch.length)];
  const resume_required = pending.length > 0;

  const totals = completed.reduce(
    (acc, r) => ({
      new: acc.new + r.items_new,
      updated: acc.updated + r.items_updated,
      errors: acc.errors + r.errors.length,
    }),
    { new: 0, updated: 0, errors: 0 },
  );

  const status: RefreshRun['status'] = resume_required
    ? 'running'
    : fatal ? 'failed' : totals.errors > 0 ? 'partial' : 'success';

  await runState.update(run.id, {
    status,
    sources_checked: completed.length,
    items_new: totals.new,
    items_updated: totals.updated,
    error_message: fatal,
    report_json: { ...report, pending, completed },
    finished_at: resume_required ? null : new Date().toISOString(),
  });

  return {
    run_id: run.id,
    status,
    processed,
    pending,
    resume_required,
    dry_run: dryRun,
  };
}

function emptyResult(source_id: string, vendor: string, errors: string[]): VendorResult {
  return {
    source_id, vendor,
    pages_visited: 0, documents_found: 0, documents_unchanged: 0, documents_skipped: 0,
    hit_deadline: false, items_new: 0, items_updated: 0,
    errors,
    finished_at: new Date().toISOString(),
  };
}

/** Short, actionable summary for the admin email and the run log. */
export function formatMonthlyRun(outcome: MonthlyRunOutcome): string {
  const lines = [
    `LabPulse monthly documentation refresh — ${outcome.status}${outcome.dry_run ? ' (dry run)' : ''}`,
    '',
  ];

  for (const r of outcome.processed) {
    lines.push(
      `${r.vendor}: ${r.documents_found} new/changed, ${r.documents_unchanged} unchanged, ` +
      `${r.items_new} new KB items, ${r.items_updated} updated` +
      (r.errors.length > 0 ? `, ${r.errors.length} error(s)` : '') +
      (r.hit_deadline ? ' — stopped on time budget, re-queued' : ''),
    );
    for (const e of r.errors.slice(0, 3)) lines.push(`  - ${e}`);
  }

  if (outcome.pending.length > 0) {
    lines.push('', `Pending vendors (${outcome.pending.length}): ${outcome.pending.join(', ')}`);
  }

  return lines.join('\n');
}

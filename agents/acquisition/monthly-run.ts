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

/** Vendors processed per invocation. Kept low so a request finishes well inside the function timeout. */
export const DEFAULT_VENDORS_PER_BATCH = 2;

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
  fetcherOptions?: FetcherOptions;
}

export interface MonthlyRunOutcome {
  run_id: string;
  status: RefreshRun['status'];
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

  // One fetcher for the batch so robots.txt and per-host delays are shared.
  const fetcher = new PoliteFetcher(opts.fetcherOptions);

  let fatal: string | null = null;

  for (const sourceId of batch) {
    const site = getVendorSite(sourceId);
    if (!site) {
      processed.push(emptyResult(sourceId, sourceId, ['unknown source_id — not in vendor-sites.ts']));
      continue;
    }

    try {
      const known = await documents.getKnown(sourceId);
      const adapter = new VendorWebAdapter(site, { fetcher, known });

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

      processed.push({
        source_id: sourceId,
        vendor: site.vendor,
        pages_visited: adapter.stat.pages_visited,
        documents_found: adapter.stat.documents_found,
        documents_unchanged: adapter.stat.documents_unchanged,
        documents_skipped: adapter.stat.documents_skipped,
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
  const pending = report.pending.slice(batch.length);
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
    items_new: 0, items_updated: 0,
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
      (r.errors.length > 0 ? `, ${r.errors.length} error(s)` : ''),
    );
    for (const e of r.errors.slice(0, 3)) lines.push(`  - ${e}`);
  }

  if (outcome.pending.length > 0) {
    lines.push('', `Pending vendors (${outcome.pending.length}): ${outcome.pending.join(', ')}`);
  }

  return lines.join('\n');
}

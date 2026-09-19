import { describe, it, expect } from 'vitest';
import { runMonthlyBatch, formatMonthlyRun } from '@/agents/acquisition/monthly-run';
import { MockRunStateStore } from '@/agents/acquisition/pipeline/run-state';
import { MockDocumentStore } from '@/agents/acquisition/pipeline/document-persist';
import { MockPersistenceAdapter } from '@/agents/acquisition/pipeline/persist';
import { VENDOR_SITES, getCrawlableVendorSites } from '@/agents/acquisition/config/vendor-sites';

/** Offline fetch: every request 404s, so no vendor yields documents. */
const offlineFetch = async (): Promise<Response> =>
  new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });

function deps() {
  return {
    runState: new MockRunStateStore(),
    persistence: new MockPersistenceAdapter(),
    documents: new MockDocumentStore(),
    triggeredBy: 'test' as const,
    fetcherOptions: { fetchImpl: offlineFetch, sleep: async () => {}, delayMs: 0 },
  };
}

describe('runMonthlyBatch', () => {
  it('processes only one batch and leaves the rest pending', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 2 });

    expect(outcome.processed).toHaveLength(2);
    expect(outcome.resume_required).toBe(true);
    expect(outcome.pending).toHaveLength(getCrawlableVendorSites().length - 2);
    expect(outcome.status).toBe('running');
  });

  it('skips vendors whose sites reject automated clients', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 50 });

    const blocked = VENDOR_SITES.filter(v => v.access === 'blocked').map(v => v.source_id);
    expect(blocked.length).toBeGreaterThan(0);
    const attempted = outcome.processed.map(p => p.source_id);
    expect(attempted.some(id => blocked.includes(id))).toBe(false);
  });

  it('attempts blocked vendors when explicitly asked to', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 50, includeBlocked: true });
    expect(outcome.processed).toHaveLength(VENDOR_SITES.length);
  });

  it('resumes the open run instead of starting a new one', async () => {
    const d = deps();
    const first = await runMonthlyBatch({ ...d, vendorsPerBatch: 2 });
    const second = await runMonthlyBatch({ ...d, vendorsPerBatch: 2 });

    expect(second.run_id).toBe(first.run_id);
    expect(d.runState.runs).toHaveLength(1);
    // The second batch picks up where the first stopped.
    expect(second.processed.map(p => p.source_id))
      .not.toEqual(first.processed.map(p => p.source_id));
    expect(second.pending.length).toBeLessThan(first.pending.length);
  });

  it('closes the run once every vendor has been processed', async () => {
    const d = deps();
    let outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 4 });
    let guard = 0;

    while (outcome.resume_required && guard++ < 20) {
      outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 4 });
    }

    expect(outcome.resume_required).toBe(false);
    expect(outcome.pending).toEqual([]);
    expect(['success', 'partial']).toContain(outcome.status);
    expect(d.runState.runs[0].finished_at).not.toBeNull();
  });

  it('restricts the run to the requested vendors', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({
      ...d,
      onlySourceIds: ['agilent-support-library'],
      vendorsPerBatch: 5,
    });

    expect(outcome.processed).toHaveLength(1);
    expect(outcome.processed[0].vendor).toBe('Agilent');
    expect(outcome.resume_required).toBe(false);
  });

  it('records an unknown source id without aborting the batch', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({
      ...d,
      onlySourceIds: ['not-a-real-source', 'agilent-support-library'],
      vendorsPerBatch: 5,
    });

    expect(outcome.processed).toHaveLength(2);
    expect(outcome.processed[0].errors[0]).toMatch(/unknown source_id/);
    expect(outcome.status).toBe('partial');
  });

  it('re-queues a vendor that runs out of time instead of dropping it', async () => {
    const d = deps();
    // Zero budget: the deadline has already passed when the vendor is reached.
    const outcome = await runMonthlyBatch({
      ...d,
      onlySourceIds: ['sciex-support-library', 'shimadzu-support-library'],
      vendorsPerBatch: 2,
      budgetMs: 0,
    });

    expect(outcome.resume_required).toBe(true);
    // Nothing was crawled, and both vendors are still queued.
    expect(outcome.pending).toContain('sciex-support-library');
    expect(outcome.pending).toContain('shimadzu-support-library');
    expect(outcome.processed).toEqual([]);
  });

  it('puts a re-queued vendor at the front of the queue', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({
      ...d,
      onlySourceIds: ['sciex-support-library', 'shimadzu-support-library'],
      vendorsPerBatch: 1,
      budgetMs: 0,
    });

    expect(outcome.pending[0]).toBe('sciex-support-library');
  });

  it('does nothing in drain mode when no run is open', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({ ...d, continueOnly: true });

    expect(outcome.status).toBe('idle');
    expect(outcome.run_id).toBeNull();
    expect(outcome.resume_required).toBe(false);
    // Critically, it must not create a run row.
    expect(d.runState.runs).toHaveLength(0);
  });

  it('drain mode resumes an open run without creating another', async () => {
    const d = deps();
    const started = await runMonthlyBatch({ ...d, vendorsPerBatch: 1 });
    expect(started.resume_required).toBe(true);

    const drained = await runMonthlyBatch({ ...d, vendorsPerBatch: 1, continueOnly: true });

    expect(drained.run_id).toBe(started.run_id);
    expect(d.runState.runs).toHaveLength(1);
  });

  it('writes no documents on a dry run', async () => {
    const d = deps();
    await runMonthlyBatch({
      ...d, dryRun: true, onlySourceIds: ['agilent-support-library'],
    });

    expect(d.documents.documents.size).toBe(0);
    expect(d.runState.runs[0].dry_run).toBe(true);
  });
});

describe('formatMonthlyRun', () => {
  it('summarises each vendor and flags a dry run', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({
      ...d, dryRun: true, onlySourceIds: ['agilent-support-library'],
    });

    const text = formatMonthlyRun(outcome);
    expect(text).toContain('dry run');
    expect(text).toContain('Agilent');
  });

  it('lists the vendors still pending', async () => {
    const d = deps();
    const outcome = await runMonthlyBatch({ ...d, vendorsPerBatch: 1 });
    expect(formatMonthlyRun(outcome)).toMatch(/Pending vendors \(\d+\)/);
  });
});

import { describe, it, expect } from 'vitest';
import { runAcquisitionPipeline } from '@/agents/acquisition/index';
import { MockVendorAdapter }      from '@/agents/acquisition/adapters/mock-vendor';
import { MockCommunityAdapter }   from '@/agents/acquisition/adapters/mock-community';
import { MockPersistenceAdapter } from '@/agents/acquisition/pipeline/persist';

describe('runAcquisitionPipeline', () => {
  it('runs without errors and returns a report', async () => {
    const persistence = new MockPersistenceAdapter();
    const { report, stats } = await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
    );
    expect(report.run_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(stats.errors).toHaveLength(0);
  });

  it('inserts new items from mock vendor adapter', async () => {
    const persistence = new MockPersistenceAdapter();
    const { stats } = await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
    );
    expect(stats.items_fetched).toBeGreaterThan(0);
    expect(stats.items_extracted).toBe(stats.items_fetched);
    expect(stats.items_new).toBeGreaterThan(0);
  });

  it('persists items to the store', async () => {
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline([new MockVendorAdapter()], persistence);
    const stored = persistence.snapshot();
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0]).toHaveProperty('id');
    expect(stored[0]).toHaveProperty('technique');
    expect(stored[0]).toHaveProperty('source_type', 'vendor');
  });

  it('skips unchanged community adapter when since is after its publication date', async () => {
    const persistence = new MockPersistenceAdapter();
    const { stats } = await runAcquisitionPipeline(
      [new MockCommunityAdapter()],
      persistence,
      { since: '2024-01-01' }, // after community source publication date 2023-11-15
    );
    expect(stats.sources_skipped_unchanged).toBe(1);
    expect(stats.items_fetched).toBe(0);
  });

  it('does not persist in dry_run mode', async () => {
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
      { dry_run: true },
    );
    expect(persistence.snapshot()).toHaveLength(0);
  });

  it('second run with same adapter marks items as duplicate', async () => {
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline([new MockVendorAdapter()], persistence);
    const { stats } = await runAcquisitionPipeline([new MockVendorAdapter()], persistence);
    expect(stats.items_duplicate).toBeGreaterThan(0);
    expect(stats.items_new).toBe(0);
  });

  it('report has all required MonthlyUpdateReport fields', async () => {
    const persistence = new MockPersistenceAdapter();
    const { report } = await runAcquisitionPipeline([new MockVendorAdapter()], persistence);
    expect(report).toHaveProperty('run_date');
    expect(report).toHaveProperty('new_sources');
    expect(report).toHaveProperty('updated_sources');
    expect(report).toHaveProperty('deprecated_items');
    expect(report).toHaveProperty('conflicts_found');
    expect(report).toHaveProperty('knowledge_gaps');
  });

  it('knowledge_gaps are flagged when coverage is incomplete', async () => {
    const persistence = new MockPersistenceAdapter();
    const { report } = await runAcquisitionPipeline([new MockVendorAdapter()], persistence);
    // Mock vendor only covers 2 categories; the rest are gaps
    expect(report.knowledge_gaps.length).toBeGreaterThan(0);
  });

  it('runs with both vendor and community adapters without error', async () => {
    const persistence = new MockPersistenceAdapter();
    const { stats } = await runAcquisitionPipeline(
      [new MockVendorAdapter(), new MockCommunityAdapter()],
      persistence,
    );
    expect(stats.errors).toHaveLength(0);
    expect(stats.sources_checked).toBe(2);
  });
});

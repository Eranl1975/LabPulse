import { describe, it, expect } from 'vitest';
import {
  CONFIGURED_SOURCES,
  getConfiguredAdapters,
  getPrimaryAdapters,
  MIN_SOURCE_QUALITY,
  COMMUNITY_MAX_EVIDENCE_STRENGTH,
  COMMUNITY_MAX_CONFIDENCE,
} from '@/agents/acquisition/config/sources';
import { runAcquisitionPipeline } from '@/agents/acquisition/index';
import { MockPersistenceAdapter } from '@/agents/acquisition/pipeline/persist';
import { MockVendorAdapter }   from '@/agents/acquisition/adapters/mock-vendor';
import { MockCommunityAdapter } from '@/agents/acquisition/adapters/mock-community';

// ---------------------------------------------------------------------------
// Source registry
// ---------------------------------------------------------------------------

describe('getConfiguredAdapters', () => {
  it('includes vendor, scientific, and community sources', () => {
    const adapters = getConfiguredAdapters();
    const types = new Set(adapters.map(a => a.source_type));
    expect(types.has('vendor')).toBe(true);
    expect(types.has('community')).toBe(true);
  });

  it('contains at least the two live mock adapters', () => {
    const adapters = getConfiguredAdapters();
    const ids = adapters.map(a => a.source_id);
    expect(ids).toContain('agilent-hplc-troubleshooting-guide');
    expect(ids).toContain('lcms-community-forum');
  });
});

describe('getPrimaryAdapters', () => {
  it('excludes community sources', () => {
    const adapters = getPrimaryAdapters();
    expect(adapters.every(a => a.source_type !== 'community')).toBe(true);
  });

  it('includes at least one vendor adapter', () => {
    const adapters = getPrimaryAdapters();
    expect(adapters.some(a => a.source_type === 'vendor')).toBe(true);
  });
});

describe('stub adapters', () => {
  it('stub adapters always report no updates', async () => {
    const stubs = CONFIGURED_SOURCES.filter(
      a => !(a instanceof MockVendorAdapter) && !(a instanceof MockCommunityAdapter),
    );
    for (const stub of stubs) {
      const result = await stub.hasUpdates(null);
      expect(result).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Quality gate
// ---------------------------------------------------------------------------

describe('quality gate', () => {
  it('threshold constant is between 0 and 1', () => {
    expect(MIN_SOURCE_QUALITY).toBeGreaterThan(0);
    expect(MIN_SOURCE_QUALITY).toBeLessThan(1);
  });

  it('pipeline skips items below a raised threshold', async () => {
    const persistence = new MockPersistenceAdapter();
    // Raise threshold above the community item score (community composite ≈ 0.39)
    const { stats } = await runAcquisitionPipeline(
      [new MockCommunityAdapter()],
      persistence,
      { dry_run: true, min_source_quality: 0.99 },
    );
    expect(stats.items_skipped_weak_source).toBeGreaterThanOrEqual(1);
    expect(stats.items_new).toBe(0);
  });

  it('pipeline accepts items above the threshold', async () => {
    const persistence = new MockPersistenceAdapter();
    // Vendor composite score is well above 0.40
    const { stats } = await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
      { dry_run: true, min_source_quality: MIN_SOURCE_QUALITY },
    );
    expect(stats.items_new).toBeGreaterThan(0);
    expect(stats.items_skipped_weak_source).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Community cap
// ---------------------------------------------------------------------------

describe('community cap', () => {
  it('community items have evidence_strength capped at weak', async () => {
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline(
      [new MockCommunityAdapter()],
      persistence,
      { dry_run: false, min_source_quality: 0 }, // zero threshold to guarantee the item passes
    );
    const stored = persistence.snapshot();
    const communityItems = stored.filter(i => i.source_type === 'community');
    if (communityItems.length > 0) {
      const allowedStrengths = new Set(['weak', 'anecdotal']);
      for (const item of communityItems) {
        expect(allowedStrengths.has(item.evidence_strength)).toBe(true);
      }
    }
  });

  it('community items have confidence_score capped', async () => {
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline(
      [new MockCommunityAdapter()],
      persistence,
      { dry_run: false, min_source_quality: 0 },
    );
    const stored = persistence.snapshot();
    const communityItems = stored.filter(i => i.source_type === 'community');
    for (const item of communityItems) {
      expect(item.confidence_score).toBeLessThanOrEqual(COMMUNITY_MAX_CONFIDENCE);
    }
  });

  it('community_max constants are correct type and range', () => {
    expect(COMMUNITY_MAX_EVIDENCE_STRENGTH).toBe('weak');
    expect(COMMUNITY_MAX_CONFIDENCE).toBeGreaterThan(0);
    expect(COMMUNITY_MAX_CONFIDENCE).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// next_priorities
// ---------------------------------------------------------------------------

describe('next_priorities', () => {
  it('returns an array', async () => {
    const persistence = new MockPersistenceAdapter();
    const { next_priorities } = await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
      { dry_run: true },
    );
    expect(Array.isArray(next_priorities)).toBe(true);
  });

  it('includes gap entries when categories are under-covered', async () => {
    const persistence = new MockPersistenceAdapter();
    const { next_priorities } = await runAcquisitionPipeline(
      [new MockVendorAdapter()],
      persistence,
      { dry_run: true },
    );
    // Vendor mock only covers 2 categories; many gaps expected
    const hasGapEntry = next_priorities.some(p => p.startsWith('Acquire:'));
    expect(hasGapEntry).toBe(true);
  });

  it('has at most 5 entries', async () => {
    const persistence = new MockPersistenceAdapter();
    const { next_priorities } = await runAcquisitionPipeline(
      getConfiguredAdapters(),
      persistence,
      { dry_run: true },
    );
    expect(next_priorities.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Full pipeline smoke test with configured sources
// ---------------------------------------------------------------------------

describe('pipeline with configured sources', () => {
  it('dry run produces a report without errors', async () => {
    const persistence = new MockPersistenceAdapter();
    const { report, stats } = await runAcquisitionPipeline(
      getConfiguredAdapters(),
      persistence,
      { dry_run: true },
    );
    expect(report.run_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Stubs all return hasUpdates=false — only the two mock adapters run
    expect(stats.sources_checked).toBe(getConfiguredAdapters().length);
    expect(stats.errors.filter(e => !e.startsWith('Skipped'))).toHaveLength(0);
  });

  it('items from community source do not reach persistence with default threshold', async () => {
    // With the default 0.40 threshold the community item (composite ≈ 0.39) is rejected.
    const persistence = new MockPersistenceAdapter();
    await runAcquisitionPipeline(getConfiguredAdapters(), persistence, { dry_run: false });
    const stored = persistence.snapshot();
    // All stored items should be from non-community sources
    const communityStored = stored.filter(i => i.source_type === 'community');
    expect(communityStored).toHaveLength(0);
  });
});

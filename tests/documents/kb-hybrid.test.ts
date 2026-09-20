import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readItems, readItemsHybrid, invalidateCache } from '@/lib/store';

// The curated catalogue on disk; the merge must never drop these.
const CURATED = readItems();

const ENV = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function crawledItem(id: string, symptom = 'Crawled symptom') {
  return {
    id,
    technique: 'HPLC',
    instrument_family: 'generic',
    model: null,
    issue_category: 'crawled category',
    symptom,
    likely_causes: ['cause'],
    diagnostics: ['diagnostic'],
    corrective_actions: ['action'],
    severity: 'medium',
    escalation_conditions: [],
    source_id: 'shimadzu-support-library',
    confidence_score: 0.6,
    evidence_strength: 'moderate',
    updated_at: '2026-10-01T06:00:00Z',
  };
}

/** Stub the one fetch readItemsFromSupabase makes. */
function stubSupabase(payload: unknown, ok = true): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  })));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key';
  invalidateCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.NEXT_PUBLIC_SUPABASE_URL = ENV.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = ENV.key;
  invalidateCache();
});

describe('readItemsHybrid', () => {
  it('has a curated catalogue to protect', () => {
    expect(CURATED.length).toBeGreaterThan(100);
  });

  it('adds crawled items to the curated set instead of replacing it', async () => {
    stubSupabase([crawledItem('crawl-001'), crawledItem('crawl-002')]);

    const merged = await readItemsHybrid();

    // This is the regression the merge exists to prevent: two crawled items
    // must not displace the whole curated knowledge base.
    expect(merged.length).toBe(CURATED.length + 2);
    for (const item of CURATED) {
      expect(merged.some(m => m.id === item.id), `curated ${item.id} survived`).toBe(true);
    }
    expect(merged.some(m => m.id === 'crawl-001')).toBe(true);
  });

  it('lets a Supabase row supersede the curated item with the same id', async () => {
    const target = CURATED[0];
    stubSupabase([{ ...crawledItem(target.id), symptom: 'Refreshed symptom' }]);

    const merged = await readItemsHybrid();

    expect(merged.length).toBe(CURATED.length);
    expect(merged.find(m => m.id === target.id)?.symptom).toBe('Refreshed symptom');
  });

  it('keeps both curated items that share the id tga-002', async () => {
    // Pre-existing data bug in data/knowledge-items.json: two different TGA
    // items carry the same id. Merging must not silently drop one.
    const duplicated = CURATED.filter(i => i.id === 'tga-002');
    expect(duplicated).toHaveLength(2);
    expect(duplicated[0].symptom).not.toBe(duplicated[1].symptom);

    stubSupabase([crawledItem('crawl-001')]);

    const merged = await readItemsHybrid();
    expect(merged.filter(m => m.id === 'tga-002')).toHaveLength(2);
    expect(merged.length).toBe(CURATED.length + 1);
  });

  it('returns exactly the curated catalogue when Supabase is empty', async () => {
    stubSupabase([]);

    const merged = await readItemsHybrid();
    expect(merged.map(m => m.id)).toEqual(CURATED.map(c => c.id));
  });

  it('returns the curated catalogue when the Supabase query fails', async () => {
    stubSupabase({ message: 'boom' }, false);

    const merged = await readItemsHybrid();
    expect(merged.map(m => m.id)).toEqual(CURATED.map(c => c.id));
  });

  it('returns the curated catalogue when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const merged = await readItemsHybrid();
    expect(merged.map(m => m.id)).toEqual(CURATED.map(c => c.id));
  });

  it('requests only non-deleted, non-deprecated rows, bounded', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal('fetch', fetchMock);

    await readItemsHybrid();

    const endpoint = String(fetchMock.mock.calls[0][0]);
    expect(endpoint).toContain('is_deprecated=eq.false');
    // deleted_at requires migration 023; without it PostgREST returns HTTP 400.
    expect(endpoint).toContain('deleted_at=is.null');
    expect(endpoint).toMatch(/limit=\d+/);
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildSearchEndpoint, toTsQuery, rankHits, type DocumentSearchQuery,
} from '@/lib/document-search';

const BASE = 'https://project.supabase.co';

const QUERY: DocumentSearchQuery = {
  text: 'high backpressure during the run',
  technique: 'HPLC',
  vendor: 'Agilent',
  model: 'G6170A',
};

describe('toTsQuery', () => {
  it('joins meaningful terms with AND', () => {
    expect(toTsQuery('high backpressure')).toBe('high & backpressure');
  });

  it('drops stop words and very short tokens', () => {
    expect(toTsQuery('the pressure is very high')).toBe('pressure & high');
  });

  it('removes punctuation that would break the tsquery', () => {
    // "what" is a stop word and the stray "s" from the apostrophe is too short.
    expect(toTsQuery("peak tailing: what's wrong?")).toBe('peak & tailing & wrong');
    expect(toTsQuery('pressure & | ! high')).toBe('pressure & high');
  });

  it('de-duplicates repeated terms', () => {
    expect(toTsQuery('pressure pressure pressure')).toBe('pressure');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(toTsQuery('a an of')).toBe('');
    expect(toTsQuery('   ')).toBe('');
  });
});

describe('buildSearchEndpoint', () => {
  const url = buildSearchEndpoint(BASE, QUERY);

  it('targets document_chunks and joins the parent document', () => {
    expect(url.startsWith(`${BASE}/rest/v1/document_chunks?`)).toBe(true);
    expect(decodeURIComponent(url)).toContain('documents!inner(');
  });

  it('filters to active documents only', () => {
    expect(url).toContain('documents.status=eq.active');
  });

  it('filters by technique using array containment', () => {
    expect(decodeURIComponent(url)).toContain('documents.techniques=cs.{HPLC}');
  });

  it('constrains the vendor so one vendor never answers for another', () => {
    expect(decodeURIComponent(url)).toContain('documents.vendor=ilike.%Agilent%');
  });

  it('omits the vendor filter when no vendor was supplied', () => {
    const anyVendor = buildSearchEndpoint(BASE, { ...QUERY, vendor: null });
    expect(anyVendor).not.toContain('documents.vendor');
  });

  it('clamps the limit to a sane maximum', () => {
    expect(buildSearchEndpoint(BASE, { ...QUERY, limit: 9999 })).toContain('limit=25');
    expect(buildSearchEndpoint(BASE, { ...QUERY, limit: 0 })).toContain('limit=1');
  });

  it('tolerates a base URL with a trailing slash', () => {
    expect(buildSearchEndpoint(`${BASE}/`, QUERY)).toContain(`${BASE}/rest/v1/`);
    expect(buildSearchEndpoint(`${BASE}/`, QUERY)).not.toContain('//rest');
  });
});

function row(over: Partial<{
  document_id: string; vendor: string; model: string | null; tier: number; title: string;
}> = {}) {
  return {
    document_id: over.document_id ?? 'doc-1',
    heading: 'Backpressure',
    page_number: 12,
    text: 'System pressure exceeds the expected operating range during the run.',
    documents: {
      title: over.title ?? 'Agilent HPLC Troubleshooting Guide',
      vendor: over.vendor ?? 'Agilent',
      doc_type: 'troubleshooting_guide' as const,
      document_number: 'D0133020',
      url: 'https://www.agilent.com/guide.pdf',
      publication_date: null,
      model: over.model ?? 'G6170A',
      techniques: ['HPLC'],
      authority_tier: over.tier ?? 2,
      status: 'active',
    },
  };
}

describe('rankHits', () => {
  it('promotes a document matching the queried model to tier 1', () => {
    const [hit] = rankHits([row({ model: 'G6170A' })], QUERY);
    expect(hit.tier).toBe(1);
  });

  it('keeps a same-vendor document without a model match at tier 2', () => {
    const [hit] = rankHits([row({ model: '1260 Infinity' })], QUERY);
    expect(hit.tier).toBe(2);
  });

  it('never returns another vendor\'s document for a vendor-specific query', () => {
    const hits = rankHits([row({ vendor: 'Waters', document_id: 'waters-1' })], QUERY);
    expect(hits).toEqual([]);
  });

  it('returns all vendors when the query names none', () => {
    const hits = rankHits(
      [row({ vendor: 'Waters', document_id: 'w' }), row({ vendor: 'Agilent', document_id: 'a' })],
      { ...QUERY, vendor: null },
    );
    expect(hits).toHaveLength(2);
  });

  it('orders hits by tier, strongest evidence first', () => {
    const hits = rankHits(
      [
        row({ document_id: 'note', tier: 5, model: null, title: 'App note' }),
        row({ document_id: 'manual', tier: 1, model: 'G6170A', title: 'Manual' }),
      ],
      QUERY,
    );
    expect(hits.map(h => h.document_id)).toEqual(['manual', 'note']);
  });

  it('preserves the citation fields needed to reference a page', () => {
    const [hit] = rankHits([row()], QUERY);
    expect(hit.page_number).toBe(12);
    expect(hit.document_number).toBe('D0133020');
    expect(hit.url).toContain('agilent.com');
  });

  it('skips rows whose joined document is missing', () => {
    const orphan = { ...row(), documents: null };
    expect(rankHits([orphan], QUERY)).toEqual([]);
  });
});

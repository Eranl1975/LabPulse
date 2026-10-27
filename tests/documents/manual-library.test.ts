/**
 * v8.2: manuals for any instrument can be added, are searched by relevance
 * (any matching word, best first), and every listed manual shows its real status.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildManualRecord, LOCAL_MANUAL_SCHEME } from '@/lib/manual-registration';
import { buildRankedSearchBody, rankHits, searchDocuments, searchTerms } from '@/lib/document-search';
import { internalReferences, referenceStatusNote } from '@/lib/visual-query';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import type { DocumentRecord } from '@/lib/document-types';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const INPUT = {
  vendor: 'Waters', techniques: ['UHPLC', 'HPLC'], model: 'ACQUITY UPLC H-Class PLUS',
  doc_type: 'user_guide', title: 'ACQUITY UPLC H-Class PLUS System Guide', document_number: '715005008', url: '',
};

describe('adding a manual for any instrument', () => {
  it('builds a searchable row with the catalogue tier rules', () => {
    const r = buildManualRecord(INPUT, '2026-10-27T00:00:00Z');
    if (!('record' in r)) throw new Error(r.error);
    expect(r.record).toMatchObject({
      vendor: 'Waters', techniques: ['UHPLC', 'HPLC'], doc_type: 'user_guide', status: 'active',
      discovered_by: 'manual', authority_tier: 1, document_number: '715005008',
    });
    expect(r.record.id).toMatch(/^waters--user-guide--715005008-[a-z0-9]+$/);
    // No public link: a local id the UI never renders as a link.
    expect(r.record.url).toBe(`${LOCAL_MANUAL_SCHEME}${r.record.id}`);
  });

  it('is tier 2 without a model, tier 5 for an application note', () => {
    const noModel = buildManualRecord({ ...INPUT, model: '' });
    const note = buildManualRecord({ ...INPUT, doc_type: 'application_note' });
    expect('record' in noModel && noModel.record.authority_tier).toBe(2);
    expect('record' in note && note.record.authority_tier).toBe(5);
  });

  it('rejects missing or invalid fields', () => {
    expect(buildManualRecord({ ...INPUT, vendor: ' ' })).toEqual({ error: 'Manufacturer is required.' });
    expect(buildManualRecord({ ...INPUT, title: '' })).toEqual({ error: 'Title is required.' });
    expect(buildManualRecord({ ...INPUT, doc_type: 'brochure' })).toEqual({ error: 'Document type is not valid.' });
    expect(buildManualRecord({ ...INPUT, techniques: ['NotATechnique'] })).toEqual({ error: 'Choose at least one technique.' });
    expect(buildManualRecord({ ...INPUT, url: 'javascript:alert(1)' })).toEqual({ error: 'The link must be an http(s) URL, or left empty.' });
  });

  it('keeps a real public link', () => {
    const r = buildManualRecord({ ...INPUT, url: 'https://www.waters.com/webassets/cms/support/docs/715005008.pdf' });
    expect('record' in r && r.record.url).toBe('https://www.waters.com/webassets/cms/support/docs/715005008.pdf');
  });
});

describe('ranked manual search', () => {
  it('sends the distinct words of the description, matched as ANY word', () => {
    expect(searchTerms('Problem in openninh openlab CDS')).toEqual(['problem', 'openninh', 'openlab', 'cds']);
    expect(buildRankedSearchBody({ text: 'Problem in openninh openlab CDS', technique: 'LCMS', vendor: 'Agilent', model: '6135B', limit: 99 }))
      .toEqual({ p_terms: ['problem', 'openninh', 'openlab', 'cds'], p_technique: 'LCMS', p_vendor: 'Agilent', p_limit: 25 });
  });

  const row = (id: string, rank: number, tier = 2) => ({
    document_id: id, heading: null, page_number: 3, text: `passage ${id}`, rank,
    title: `Manual ${id}`, vendor: 'Agilent', doc_type: 'user_guide', document_number: null,
    url: `https://www.agilent.com/${id}.pdf`, publication_date: null, model: null, techniques: ['LCMS'],
    authority_tier: tier, status: 'active',
  });

  it('uses the ranked function and keeps relevance order within a tier', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([row('zeta', 0.9), row('alpha', 0.2)]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const hits = await searchDocuments({ text: 'openlab license error', technique: 'LCMS', vendor: 'Agilent', model: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/rest/v1/rpc/search_document_chunks');
    // Relevance, not alphabetical: "zeta" ranked higher.
    expect(hits!.map(h => h.document_id)).toEqual(['zeta', 'alpha']);
  });

  it('falls back to the older query when the function is not deployed', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"code":"PGRST202"}', { status: 404 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const hits = await searchDocuments({ text: 'openlab license error', technique: 'LCMS', vendor: 'Agilent', model: null });
    expect(hits).toEqual([]);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/rest/v1/document_chunks?');
  });

  it('still orders stronger evidence first', () => {
    const chunk = (id: string, tier: number) => ({
      document_id: id, heading: null, page_number: null, text: 't',
      documents: { title: id, vendor: 'Agilent', doc_type: 'user_guide' as const, document_number: null, url: 'https://x.y/z', publication_date: null, model: null, techniques: ['LCMS'], authority_tier: tier, status: 'active' },
    });
    expect(rankHits([chunk('note', 5), chunk('manual', 2)], { text: 'x', technique: 'LCMS', vendor: 'Agilent', model: null }).map(h => h.document_id))
      .toEqual(['manual', 'note']);
  });
});

describe('status of each listed manual', () => {
  const doc = (id: string, extra: Partial<DocumentRecord> = {}): DocumentRecord => ({
    id, source_id: null, vendor: 'Agilent', techniques: ['LCMS'], instrument_family: null, model: null,
    doc_type: 'user_guide', title: `Guide ${id}`, document_number: `D-${id}`, url: `https://www.agilent.com/${id}.pdf`,
    language: 'en', publication_date: null, content_hash: null, http_etag: null, http_last_modified: null,
    page_count: null, storage_path: null, authority_tier: 2, status: 'active', discovered_by: 'seed',
    first_seen_at: '2026-01-01', last_checked_at: null, last_changed_at: null, ingested_at: null, ...extra,
  });

  it('tells quoted, stored-but-unmatched and title-only manuals apart', async () => {
    const { answer } = await runTroubleshootingPipeline(
      { technique: 'LCMS', vendor: 'Agilent', model: '6135B', issue_category: null, symptom_description: 'No signal', method_conditions: null, already_checked: [] },
      { hasAIKey: false, useDocuments: false },
    );
    answer.sources_with_metadata.push({ source_id: 'cited', excerpt: 'x', evidence_strength: 'strong', classification: 'instrument-family', source_metadata: null });
    const refs = internalReferences({
      technique: 'LCMS', vendor: 'Agilent', model: '6135B',
      catalogue: [doc('cited'), doc('stored'), doc('empty'), doc('local', { url: `${LOCAL_MANUAL_SCHEME}local`, document_number: null })],
      cleaning: null, answer,
      chunkCounts: new Map([['cited', 40], ['stored', 12], ['local', 5]]),
    });
    const byTitle = Object.fromEntries(refs.map(r => [r.title.replace(/ \(.*/, ''), r]));
    expect(byTitle['Guide cited'].content_status).toBe('cited');
    expect(byTitle['Guide stored'].content_status).toBe('stored');
    expect(byTitle['Guide empty'].content_status).toBe('title_only');
    expect(byTitle['Guide local'].url).toBeNull();
    expect(referenceStatusNote(byTitle['Guide cited'])).toBe('quoted in this report');
    expect(referenceStatusNote(byTitle['Guide stored'])).toMatch(/text held in LabPulse/);
    expect(referenceStatusNote(byTitle['Guide empty'])).toMatch(/upload the PDF/);
  });

  it('keeps the old wording for reports saved before v8.2', () => {
    expect(referenceStatusNote({ kind: 'manual', content_read: false })).toBe('cited by title and link; content not read');
    expect(referenceStatusNote({ kind: 'manual', content_read: true })).toBeNull();
  });
});

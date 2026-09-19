import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractPdfText } from '@/agents/acquisition/extract/pdf-text';
import { MockDocumentStore } from '@/agents/acquisition/pipeline/document-persist';
import {
  ingestExtractedPages, validateExtraction, contentHashOf, NO_TEXT_REASON,
} from '@/lib/document-ingest';
import { summarizeSearchability } from '@/lib/document-chunk-counts';
import type { DocumentRecord } from '@/lib/document-types';

const FIXTURES = path.join(__dirname, '..', 'acquisition', 'fixtures');
const TEXT_PDF = path.join(FIXTURES, 'D0133020_Pro iQ Series User Guide.pdf');
const SCANNED_PDF = path.join(FIXTURES, 'scanned-no-text.pdf');

const DOC: DocumentRecord = {
  id: 'agilent--user-guide--d0133020-abc123',
  source_id: null,
  vendor: 'Agilent',
  techniques: ['LCMS'],
  instrument_family: 'InfinityLab Pro iQ Series',
  model: 'Pro iQ',
  doc_type: 'user_guide',
  title: 'Pro iQ Series User Guide',
  document_number: 'D0133020',
  url: 'https://www.agilent.com/cs/library/usermanuals/public/D0133020_Pro%20iQ%20Series%20User%20Guide.pdf',
  language: 'en',
  publication_date: null,
  content_hash: null,
  http_etag: null,
  http_last_modified: null,
  page_count: null,
  storage_path: null,
  authority_tier: 1,
  status: 'active',
  discovered_by: 'seed',
  first_seen_at: '2026-09-19T00:00:00.000Z',
  last_checked_at: null,
  last_changed_at: null,
  ingested_at: null,
};

async function extract(file: string) {
  return extractPdfText(fs.readFileSync(file));
}

describe('extractPdfText on the fixtures', () => {
  it('returns per-page text for a PDF with a text layer', async () => {
    const result = await extract(TEXT_PDF);

    expect(result.ok).toBe(true);
    expect(result.pageCount).toBe(3);
    expect(result.pages.map(p => p.page)).toEqual([1, 2, 3]);
    expect(result.pages[1].text).toMatch(/backpressure/i);
  });

  it('reports a scanned, text-free PDF as a failure rather than throwing', async () => {
    const result = await extract(SCANNED_PDF);

    expect(result.ok).toBe(false);
    expect(result.pages).toEqual([]);
    expect(result.reason).toBe(NO_TEXT_REASON);
  });
});

describe('ingestExtractedPages', () => {
  it('writes chunks that keep headings and page numbers', async () => {
    const store = new MockDocumentStore();
    const extracted = await extract(TEXT_PDF);

    const outcome = await ingestExtractedPages(
      DOC, { pages: extracted.pages, pageCount: extracted.pageCount }, store,
    );

    const chunks = store.chunks.get(DOC.id) ?? [];
    expect(outcome.chunks_written).toBe(chunks.length);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.document_id === DOC.id)).toBe(true);

    // Page numbers survive, so a citation can say "p. 2".
    expect([...new Set(chunks.map(c => c.page_number))].sort()).toEqual([1, 2, 3]);
    expect(chunks.find(c => c.page_number === 2)?.heading).toMatch(/Backpressure/i);
    expect(chunks.map(c => c.chunk_index)).toEqual(chunks.map((_, i) => i));
  });

  it('updates page_count, content_hash and ingested_at on the parent row', async () => {
    const store = new MockDocumentStore();
    const extracted = await extract(TEXT_PDF);

    const outcome = await ingestExtractedPages(
      DOC, { pages: extracted.pages, pageCount: extracted.pageCount }, store,
      '2026-09-19T10:00:00.000Z',
    );

    const stored = store.documents.get(DOC.id)!;
    expect(stored.page_count).toBe(3);
    expect(stored.content_hash).toBe(contentHashOf(extracted.pages));
    expect(stored.ingested_at).toBe('2026-09-19T10:00:00.000Z');
    expect(outcome.page_count).toBe(3);

    // A hand-ingested PDF does not change how the document was discovered.
    expect(stored.discovered_by).toBe('seed');
    expect(stored.url).toBe(DOC.url);
  });

  it('replaces rather than duplicates when the same file is ingested twice', async () => {
    const store = new MockDocumentStore();
    const extracted = await extract(TEXT_PDF);
    const input = { pages: extracted.pages, pageCount: extracted.pageCount };

    const first = await ingestExtractedPages(DOC, input, store);
    const firstCount = (store.chunks.get(DOC.id) ?? []).length;

    const second = await ingestExtractedPages(DOC, input, store);
    const secondCount = (store.chunks.get(DOC.id) ?? []).length;

    expect(second.chunks_written).toBe(first.chunks_written);
    expect(secondCount).toBe(firstCount);
    expect(store.documents.size).toBe(1);
  });

  it('refuses a scanned PDF instead of storing an empty document', async () => {
    const store = new MockDocumentStore();

    await expect(
      ingestExtractedPages(DOC, { pages: [], pageCount: 12 }, store),
    ).rejects.toThrow(NO_TEXT_REASON);

    expect(store.chunks.size).toBe(0);
    expect(store.documents.size).toBe(0);
  });

  it('refuses pages that are whitespace only', () => {
    expect(validateExtraction({ pages: [{ page: 1, text: '   \n ' }], pageCount: 1 }))
      .toBe(NO_TEXT_REASON);
    expect(validateExtraction({ pages: [{ page: 1, text: 'real text' }], pageCount: 1 }))
      .toBeNull();
  });
});

describe('summarizeSearchability', () => {
  it('separates searchable documents from metadata-only ones', () => {
    const summary = summarizeSearchability(
      ['a', 'b', 'c'],
      new Map([['a', 42], ['b', 0]]),
    );

    expect(summary.byDocument.get('a')).toEqual({ document_id: 'a', chunk_count: 42, state: 'searchable' });
    expect(summary.byDocument.get('b')!.state).toBe('metadata_only');
    // A document absent from the counts has no chunks; it is not "unknown".
    expect(summary.byDocument.get('c')).toEqual({ document_id: 'c', chunk_count: 0, state: 'metadata_only' });

    expect(summary.searchable).toBe(1);
    expect(summary.metadataOnly).toBe(2);
    expect(summary.banner).toBe('2 of 3 documents are metadata only and cannot be cited yet.');
  });

  it('states the 17-document case the way the admin banner shows it', () => {
    const ids = Array.from({ length: 17 }, (_, i) => `doc-${i}`);
    const counts = new Map(ids.slice(0, 5).map(id => [id, 10] as const));

    expect(summarizeSearchability(ids, counts).banner)
      .toBe('12 of 17 documents are metadata only and cannot be cited yet.');
  });

  it('has no banner once every document is searchable', () => {
    const summary = summarizeSearchability(['a', 'b'], new Map([['a', 3], ['b', 4]]));
    expect(summary.banner).toBeNull();
    expect(summary.metadataOnly).toBe(0);
  });
});

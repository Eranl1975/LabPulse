import { describe, it, expect } from 'vitest';
import {
  matchFileToDocument, normalizeToken, baseName, urlBaseName,
} from '@/lib/document-match';
import { loadSeedDocuments } from '@/lib/document-seed';
import type { DocumentRecord } from '@/lib/document-types';

/** The real curated rows: 17 Agilent documents, one of them without a number. */
const CATALOGUE = loadSeedDocuments();

function doc(partial: Partial<DocumentRecord> & { id: string; url: string }): DocumentRecord {
  return {
    source_id: null,
    vendor: 'Agilent',
    techniques: ['LCMS'],
    instrument_family: null,
    model: null,
    doc_type: 'user_guide',
    title: 'Test document',
    document_number: null,
    language: 'en',
    publication_date: null,
    content_hash: null,
    http_etag: null,
    http_last_modified: null,
    page_count: null,
    storage_path: null,
    authority_tier: 2,
    status: 'active',
    discovered_by: 'seed',
    first_seen_at: '2026-09-19T00:00:00.000Z',
    last_checked_at: null,
    last_changed_at: null,
    ingested_at: null,
    ...partial,
  };
}

describe('normalization helpers', () => {
  it('collapses separators and case', () => {
    expect(normalizeToken('5990-8580EN')).toBe('59908580en');
    expect(normalizeToken('5990_8580 en')).toBe('59908580en');
  });

  it('strips directories and the .pdf extension', () => {
    expect(baseName('C:\\manuals\\D0133020_Guide.PDF')).toBe('D0133020_Guide');
    expect(baseName('./manuals/D0133020_Guide.pdf')).toBe('D0133020_Guide');
  });

  it('percent-decodes the basename of a url', () => {
    expect(urlBaseName('https://www.agilent.com/cs/library/usermanuals/public/Infinity%20LCMSD%20Series%20Site%20Prep%20Guide.pdf'))
      .toBe('Infinity LCMSD Series Site Prep Guide');
  });
});

describe('matchFileToDocument — document_number rule', () => {
  it('matches a leading document number: D0133020_Pro iQ Series User Guide.pdf', () => {
    const result = matchFileToDocument('D0133020_Pro iQ Series User Guide.pdf', CATALOGUE);

    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.rule).toBe('document_number');
    expect(result.document.document_number).toBe('D0133020');
  });

  it('matches a number buried in a long hyphenated filename', () => {
    const result = matchFileToDocument(
      'quick-reference-lcmsd-supplies-infinitylab-5990-8580en-agilent_HR.pdf',
      CATALOGUE,
    );

    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.rule).toBe('document_number');
    expect(result.document.document_number).toBe('5990-8580EN');
  });

  it('ignores case and separators', () => {
    const rows = [doc({ id: 'a', url: 'https://x.test/a.pdf', document_number: '5990-8580EN' })];

    for (const name of ['5990_8580_en.pdf', '5990 8580 EN.pdf', 'report59908580En.PDF']) {
      const result = matchFileToDocument(name, rows);
      expect(result.matched, name).toBe(true);
    }
  });

  it('prefers the longer document number when one number contains another', () => {
    const rows = [
      doc({ id: 'short', url: 'https://x.test/s.pdf', document_number: 'G1960-90' }),
      doc({ id: 'long', url: 'https://x.test/l.pdf', document_number: 'G1960-90104' }),
    ];

    const result = matchFileToDocument('G1960-90104_ChemStation_ConceptsGuide.pdf', rows);
    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.document.id).toBe('long');
  });

  it('reports ambiguity instead of picking one of two equal matches', () => {
    const rows = [
      doc({ id: 'one', url: 'https://x.test/1.pdf', document_number: '5994-8330EN' }),
      doc({ id: 'two', url: 'https://x.test/2.pdf', document_number: '5994_8330_en' }),
    ];

    const result = matchFileToDocument('br-5994-8330en-agilent.pdf', rows);
    expect(result.matched).toBe(false);
    if (result.matched) return;
    expect(result.reason).toBe('ambiguous');
    expect(result.candidates.sort()).toEqual(['one', 'two']);
  });
});

describe('matchFileToDocument — url basename fallback', () => {
  it('matches the one curated row that has no document number', () => {
    const numberless = CATALOGUE.filter(d => d.document_number === null);
    expect(numberless).toHaveLength(1);

    const result = matchFileToDocument('Infinity LCMSD Series Site Prep Guide.pdf', CATALOGUE);

    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.rule).toBe('url_basename');
    expect(result.document.id).toBe(numberless[0].id);
  });

  it('tolerates separator and case differences in the saved filename', () => {
    const result = matchFileToDocument('infinity-lcmsd-series-site-prep-guide.pdf', CATALOGUE);

    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.rule).toBe('url_basename');
  });
});

describe('matchFileToDocument — misses', () => {
  it('reports a file belonging to no stored document', () => {
    const result = matchFileToDocument('some-unrelated-vendor-note.pdf', CATALOGUE);

    expect(result.matched).toBe(false);
    if (result.matched) return;
    expect(result.reason).toBe('unmatched');
    expect(result.candidates).toEqual([]);
  });

  it('does not match on a document number too short to be distinctive', () => {
    const rows = [doc({ id: 'a', url: 'https://x.test/a.pdf', document_number: '12' })];
    expect(matchFileToDocument('manual-12-pages.pdf', rows).matched).toBe(false);
  });
});

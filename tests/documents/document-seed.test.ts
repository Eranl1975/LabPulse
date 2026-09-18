import { describe, it, expect } from 'vitest';
import { seedDocumentsFrom, loadSeedDocuments } from '@/lib/document-seed';
import { DOC_TYPES } from '@/lib/document-types';

const CATALOGUE = {
  instruments: {
    'agilent-pro-iq-plus': {
      technique: 'LCMS',
      manufacturer: 'Agilent',
      model: 'InfinityLab Pro iQ Plus (G6170A)',
      full_name: 'Agilent InfinityLab Pro iQ Plus Mass Detector',
      documentation: [
        { type: 'user_guide', title: 'Pro iQ Series User Guide', document_number: 'D0133020', url: 'https://www.agilent.com/a.pdf' },
        { type: 'site_preparation', title: 'Site Prep Checklist', document_number: 'D0129562', url: 'https://www.agilent.com/b.pdf' },
        { type: 'application_note', title: 'Assay App Note', document_number: '5991-1234EN', url: 'https://www.agilent.com/c.pdf' },
        { type: 'unknown_kind', title: 'Mystery', url: 'https://www.agilent.com/d.pdf' },
        { type: 'user_guide', title: 'No URL', document_number: 'X' },
      ],
    },
  },
};

describe('seedDocumentsFrom', () => {
  const docs = seedDocumentsFrom(CATALOGUE);

  it('imports each document that has a title, URL and known type', () => {
    expect(docs).toHaveLength(3);
  });

  it('maps catalogue-specific types onto the stored enum', () => {
    const sitePrep = docs.find(d => d.title === 'Site Prep Checklist');
    expect(sitePrep!.doc_type).toBe('tech_note');
    expect(docs.every(d => DOC_TYPES.includes(d.doc_type))).toBe(true);
  });

  it('skips documents with an unrecognised type or no URL', () => {
    expect(docs.some(d => d.title === 'Mystery')).toBe(false);
    expect(docs.some(d => d.title === 'No URL')).toBe(false);
  });

  it('marks model-specific manuals as tier 1 and notes as tier 5', () => {
    expect(docs.find(d => d.title === 'Pro iQ Series User Guide')!.authority_tier).toBe(1);
    expect(docs.find(d => d.title === 'Assay App Note')!.authority_tier).toBe(5);
  });

  it('records the technique, vendor and provenance', () => {
    const guide = docs.find(d => d.title === 'Pro iQ Series User Guide')!;
    expect(guide.techniques).toEqual(['LCMS']);
    expect(guide.vendor).toBe('Agilent');
    expect(guide.discovered_by).toBe('seed');
    expect(guide.status).toBe('active');
  });

  it('gives every document a unique id', () => {
    expect(new Set(docs.map(d => d.id)).size).toBe(docs.length);
  });

  it('returns nothing for malformed input', () => {
    expect(seedDocumentsFrom(null)).toEqual([]);
    expect(seedDocumentsFrom({})).toEqual([]);
    expect(seedDocumentsFrom({ instruments: 'nope' })).toEqual([]);
  });

  it('skips instruments with an unknown technique', () => {
    expect(seedDocumentsFrom({
      instruments: { x: { technique: 'MAGIC', manufacturer: 'Acme', documentation: [
        { type: 'user_guide', title: 'T', url: 'https://acme.test/x.pdf' },
      ] } },
    })).toEqual([]);
  });
});

describe('loadSeedDocuments', () => {
  it('reads the real catalogue shipped in the repository', () => {
    const docs = loadSeedDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every(d => d.url.startsWith('http'))).toBe(true);
    expect(docs.every(d => d.vendor.length > 0)).toBe(true);
  });

  it('returns an empty list when the file is missing', () => {
    expect(loadSeedDocuments('does/not/exist.json')).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import {
  chunkHtmlSections, chunkPdfPages, MAX_CHUNK_CHARS,
} from '@/agents/acquisition/extract/chunk';
import { parseHtmlSections, parseHtml } from '@/agents/acquisition/extract/html-text';
import { TROUBLESHOOTING_HTML } from '../acquisition/fixtures/vendor-pages';

describe('parseHtmlSections', () => {
  it('pairs each heading with the text beneath it', () => {
    const sections = parseHtmlSections(TROUBLESHOOTING_HTML);
    const pressure = sections.find(s => s.heading?.includes('High backpressure'));

    expect(pressure).toBeDefined();
    expect(pressure!.text).toMatch(/Blocked inlet frit/);
    // Content from the next section must not leak into this one.
    expect(pressure!.text).not.toMatch(/Retention times shift earlier/);
  });

  it('drops script content', () => {
    const sections = parseHtmlSections(TROUBLESHOOTING_HTML);
    expect(sections.map(s => s.text).join(' ')).not.toMatch(/var tracking/);
  });

  it('renders list items as bullets so structure survives tag stripping', () => {
    const { text } = parseHtml(TROUBLESHOOTING_HTML);
    expect(text).toMatch(/- Blocked inlet frit or guard column/);
  });
});

describe('chunkHtmlSections', () => {
  it('assigns the document id and sequential indexes', () => {
    const chunks = chunkHtmlSections('doc-1', parseHtmlSections(TROUBLESHOOTING_HTML));

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.document_id === 'doc-1')).toBe(true);
    expect(chunks.map(c => c.chunk_index)).toEqual(chunks.map((_, i) => i));
  });

  it('keeps every chunk within the maximum size', () => {
    const long = 'Sentence about instrument behaviour. '.repeat(400);
    const chunks = chunkHtmlSections('doc-2', [{ heading: 'Long', text: long }]);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.text.length <= MAX_CHUNK_CHARS)).toBe(true);
  });

  it('carries the heading onto each chunk of a split section', () => {
    const long = 'Diagnostic detail for this fault condition. '.repeat(120);
    const chunks = chunkHtmlSections('doc-3', [{ heading: 'ESI Source Cleaning', text: long }]);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.heading === 'ESI Source Cleaning')).toBe(true);
  });

  it('returns nothing for empty input', () => {
    expect(chunkHtmlSections('doc-4', [])).toEqual([]);
    expect(chunkHtmlSections('doc-4', [{ heading: null, text: '   ' }])).toEqual([]);
  });
});

describe('chunkPdfPages', () => {
  const pages = [
    {
      page: 7,
      text: [
        '3.2 Troubleshooting the ESI Source',
        'The source may become contaminated after extended use with non-volatile buffers.',
        'Inspect the spray shield and capillary for deposits before each maintenance interval.',
        'Clean the components with the recommended solvent and allow them to dry completely.',
      ].join('\n'),
    },
    {
      page: 8,
      text: [
        'MAINTENANCE SCHEDULE',
        'Replace the calibrant reservoir every six months or after 500 injections, whichever comes first.',
        'Record each replacement in the instrument log so the service history stays complete.',
      ].join('\n'),
    },
  ];

  it('keeps the page number on every chunk', () => {
    const chunks = chunkPdfPages('manual-1', pages);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.page_number === 7 || c.page_number === 8)).toBe(true);
  });

  it('promotes numbered and all-caps lines to headings', () => {
    const chunks = chunkPdfPages('manual-1', pages);
    const headings = chunks.map(c => c.heading);

    expect(headings).toContain('3.2 Troubleshooting the ESI Source');
    expect(headings).toContain('MAINTENANCE SCHEDULE');
  });

  it('never mixes text from two pages into one chunk', () => {
    const chunks = chunkPdfPages('manual-1', pages);
    const p7 = chunks.filter(c => c.page_number === 7).map(c => c.text).join(' ');
    expect(p7).not.toMatch(/calibrant reservoir/);
  });
});

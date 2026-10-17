import { describe, it, expect, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { classifyWebSource, buildWebQueries, collectSources, runWebResearch, VENDOR_DOMAINS } from '@/lib/web-research';
import { VENDOR_OPTIONS } from '@/components/query-form-options';
import type { VisualAnalysis } from '@/lib/visual-types';

const ANALYSIS: VisualAnalysis = {
  summary: '',
  ocr_text: [
    { text: 'Error 6550 communication', confidence: 0.9, image_index: 0, low_confidence: false },
    { text: 'Err 999', confidence: 0.2, image_index: 0, low_confidence: true },
  ],
  components: [],
  observations: [{ description: 'Red status LED on the MSD', category: 'warning_light', confidence: 0.8, image_index: 0, hazard: false, low_confidence: false }],
  instrument_consistency: { status: 'consistent', explanation: '' },
  uncertainties: [],
};

describe('source priority', () => {
  it('ranks official manufacturer documentation first', () => {
    const r = classifyWebSource('https://www.agilent.com/cs/library/usermanuals/public/G6170A.pdf', 'Pro iQ Plus G6170A user guide', 'Agilent', 'InfinityLab Pro iQ Plus (G6170A)');
    expect(r.priority).toBe(1);
    expect(r.tier).toBe(1);
  });

  it('separates the knowledge base, service documents and application notes', () => {
    expect(classifyWebSource('https://www.agilent.com/en/support/knowledge/kb123', 'KB article', 'Agilent', null).priority).toBe(2);
    expect(classifyWebSource('https://www.waters.com/support/service-notice', 'Service notice', 'Waters', null).priority).toBe(3);
    expect(classifyWebSource('https://www.shimadzu.com/an/applications/app-note-12', 'Application note', 'Shimadzu', null).priority).toBe(4);
  });

  it('never treats a forum as official, even on a manufacturer domain', () => {
    expect(classifyWebSource('https://community.agilent.com/t5/LC-MS/error-6550', 'Error 6550?', 'Agilent', null).priority).toBe(6);
    expect(classifyWebSource('https://www.chromforum.org/viewtopic.php?t=1', 'help', 'Agilent', null).priority).toBe(6);
  });

  it('ranks scientific sources and labels everything else as unverified', () => {
    expect(classifyWebSource('https://pubs.acs.org/doi/10.1021/x', 'Paper', null, null)).toMatchObject({ priority: 5, tier: 4 });
    expect(classifyWebSource('https://random-blog.example/post', 'Post', null, null)).toMatchObject({ priority: 7, category: 'Other web source (unverified)' });
  });

  it('knows a domain for every vendor in VENDOR_OPTIONS', () => {
    for (const v of VENDOR_OPTIONS) expect(VENDOR_DOMAINS[v], v).toBeDefined();
  });
});

describe('model-specific queries', () => {
  it('builds "Agilent G6170A error 6550 …", not "LC-MS error"', () => {
    const q = buildWebQueries({ technique: 'LCMS', vendor: 'Agilent', model: 'InfinityLab Pro iQ Plus (G6170A)', description: null, analysis: ANALYSIS });
    expect(q[0]).toBe('Agilent G6170A Error 6550 communication troubleshooting');
    expect(q.every(x => x.startsWith('Agilent G6170A'))).toBe(true);
    expect(q.join(' ')).not.toContain('999');
  });

  it('caps the number of queries', () => {
    expect(buildWebQueries({ technique: 'HPLC', vendor: 'Waters', model: 'Arc', description: 'pressure drop', analysis: ANALYSIS }).length).toBeLessThanOrEqual(3);
  });
});

function searchResult(urls: string[]): Anthropic.Messages.ContentBlock {
  return {
    type: 'web_search_tool_result',
    tool_use_id: 't1',
    content: urls.map(url => ({ type: 'web_search_result', url, title: `Title ${url}`, encrypted_content: '', page_age: null })),
  } as unknown as Anthropic.Messages.ContentBlock;
}

describe('collecting sources', () => {
  it('only cites URLs the search tool returned and ranks them', () => {
    const content = [
      searchResult(['https://www.reddit.com/r/chemistry/1', 'https://www.agilent.com/manual.pdf']),
      { type: 'text', text: '{"findings":[{"url":"https://www.agilent.com/manual.pdf","summary":"Reseat the LAN cable."},{"url":"https://invented.example/x","summary":"made up"}]}' },
    ] as unknown as Anthropic.Messages.ContentBlock[];
    const sources = collectSources(content, 'Agilent', null);
    expect(sources.map(s => s.url)).toEqual(['https://www.agilent.com/manual.pdf', 'https://www.reddit.com/r/chemistry/1']);
    expect(sources[0].summary).toBe('Reseat the LAN cable.');
    expect(sources[0].label).toBe('OFFICIAL MANUFACTURER GUIDANCE');
    expect(sources[1].label).not.toBe('OFFICIAL MANUFACTURER GUIDANCE');
    expect(sources.some(s => s.url.includes('invented'))).toBe(false);
  });
});

describe('runWebResearch is skippable', () => {
  const params = { technique: 'LCMS', vendor: 'Agilent', model: 'G6170A', description: null, analysis: ANALYSIS };

  it('reports skipped_no_key without calling anything', async () => {
    const r = await runWebResearch(params, { hasAIKey: false, timeoutMs: 20_000 });
    expect(r.status).toBe('skipped_no_key');
    expect(r.sources).toEqual([]);
  });

  it('reports an error instead of throwing', async () => {
    const create = vi.fn().mockRejectedValue(new Error('network down'));
    const r = await runWebResearch(params, { hasAIKey: true, timeoutMs: 20_000, client: { messages: { create } } as never });
    expect(r.status).toBe('error');
  });

  it('uses the server-side web search tool with a capped number of searches', async () => {
    const create = vi.fn().mockResolvedValue({ content: [searchResult(['https://www.agilent.com/a'])] });
    const r = await runWebResearch(params, { hasAIKey: true, timeoutMs: 20_000, client: { messages: { create } } as never });
    expect(r.status).toBe('ok');
    const tool = create.mock.calls[0][0].tools[0];
    expect(tool).toMatchObject({ type: 'web_search_20260209', name: 'web_search', max_uses: 3 });
  });

  it('reports a search-tool error result as an error', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'web_search_tool_result', tool_use_id: 't', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } }] });
    const r = await runWebResearch(params, { hasAIKey: true, timeoutMs: 20_000, client: { messages: { create } } as never });
    expect(r.status).toBe('error');
  });
});

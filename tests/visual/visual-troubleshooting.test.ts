import { describe, it, expect, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { runVisualTroubleshooting, TIME_BUDGET, type VisualDeps } from '@/lib/visual-troubleshooting';
import type { VisualPayload } from '@/lib/visual-payload';
import type { VisualAnalysis } from '@/lib/visual-types';

const PAYLOAD: VisualPayload = {
  technique: 'LCMS',
  vendor: 'Agilent',
  model: 'InfinityLab Pro iQ Plus (G6170A)',
  description: 'No signal, TIC is flat after source cleaning',
  images: [{ data: 'AAAA', media_type: 'image/jpeg', kind: 'photo', label: 'Photo 1' }],
  media: [{ kind: 'photo', label: 'Photo 1' }],
  video: null,
};

const ANALYSIS: VisualAnalysis = {
  summary: 'MS front with a red LED.',
  ocr_text: [{ text: 'Error 6550', confidence: 0.9, image_index: 0, low_confidence: false }],
  components: [{ name: 'ESI source', confidence: 0.85, image_index: 0, low_confidence: false }],
  observations: [{ description: 'Solvent leaking near the power connector', category: 'leak', confidence: 0.8, image_index: 0, hazard: true, low_confidence: false }],
  instrument_consistency: { status: 'consistent', explanation: 'Matches.' },
  uncertainties: [],
};

// Offline pipeline: curated KB only, no Supabase, no document search.
const OFFLINE = { useDocuments: false } as const;

function billingError(): Error {
  return new Anthropic.BadRequestError(400, { error: { message: 'Your credit balance is too low to access the Anthropic API.' } }, 'Your credit balance is too low to access the Anthropic API.', new Headers());
}

describe('AI-unavailable degradation (no empty report)', () => {
  it('with no AI key, still returns the user text, KB/generic content and clear statuses', async () => {
    const { answer, generation } = await runVisualTroubleshooting(PAYLOAD, { hasAIKey: false, pipeline: OFFLINE });

    const vf = answer.visual_findings!;
    expect(vf.status.vision_status).toBe('skipped_no_key');
    expect(vf.status.web_status).toBe('skipped_no_key');
    expect(vf.user_description).toBe(PAYLOAD.description);
    expect(vf.status.notices.join(' ')).toMatch(/not configured/);
    expect(['skipped_no_key', 'skipped_not_needed']).toContain(generation.ai_status);
    // The report is never empty.
    expect(answer.hypotheses.length + answer.likely_causes.length).toBeGreaterThan(0);
    expect(answer.checks.length).toBeGreaterThan(0);
    expect(vf.recommendations_label).toBe('LABPULSE INTERNAL KNOWLEDGE');
  });

  it('on a billing error, reports it, skips the other paid calls and still answers', async () => {
    const aiFallback = vi.fn();
    const webResearch = vi.fn();
    const { answer, generation } = await runVisualTroubleshooting(PAYLOAD, {
      hasAIKey: true,
      analyze: vi.fn().mockRejectedValue(billingError()),
      aiFallback, webResearch: webResearch as unknown as VisualDeps['webResearch'],
      pipeline: OFFLINE,
    });
    const vf = answer.visual_findings!;
    expect(vf.status.vision_status).toBe('error');
    expect(vf.status.vision_error_code).toBe('billing');
    expect(vf.status.web_status).toBe('skipped_no_ai');
    expect(aiFallback).not.toHaveBeenCalled();
    expect(webResearch).not.toHaveBeenCalled();
    expect(generation.ai_status).toBe('error');
    expect(generation.ai_error_code).toBe('billing');
    expect(answer.checks.length).toBeGreaterThan(0);
  });

  it('keeps LC-MS detector checks for a photo (v7 detector rule)', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, { hasAIKey: false, pipeline: OFFLINE });
    expect((answer.detector_checks ?? []).length).toBeGreaterThan(0);
  });
});

describe('with vision available', () => {
  const deps = (over: Partial<VisualDeps> = {}): VisualDeps => ({
    hasAIKey: true,
    analyze: vi.fn().mockResolvedValue({ analysis: ANALYSIS, model_used: 'claude-sonnet-4-6' }),
    webResearch: vi.fn().mockResolvedValue({ status: 'ok', reason: null, queries: ['Agilent G6170A Error 6550 troubleshooting'], sources: [] }),
    pipeline: OFFLINE,
    ...over,
  });

  it('feeds the OCR’d code into the existing pipeline query, keyed on the selected model', async () => {
    const documentSearch = vi.fn().mockResolvedValue([]);
    await runVisualTroubleshooting(PAYLOAD, deps({ pipeline: { items: [], documentSearch } }));
    const q = documentSearch.mock.calls[0][0];
    expect(q.text).toContain('Error 6550');
    expect(q.text).toContain('No signal, TIC is flat');
    expect(q).toMatchObject({ technique: 'LCMS', vendor: 'Agilent', model: 'InfinityLab Pro iQ Plus (G6170A)' });
  });

  it('leads with the safety step and records the findings', async () => {
    const stages: string[] = [];
    const { answer } = await runVisualTroubleshooting(PAYLOAD, deps(), s => stages.push(s));
    const vf = answer.visual_findings!;
    expect(vf.status.vision_status).toBe('ok');
    expect(vf.safety_first[0]).toMatch(/Liquid near electronics/);
    expect(answer.safety_warnings[0]).toBe(vf.safety_first[0]);
    expect(vf.analysis?.ocr_text[0].text).toBe('Error 6550');
    expect(stages).toEqual(['reading_image', 'searching_labpulse', 'searching_web', 'building_report']);
  });

  it('runs the internal search and web research in parallel', async () => {
    // The document search waits until web research has started. Run one after
    // the other, this would never finish.
    let release!: () => void;
    const webStarted = new Promise<void>(r => { release = r; });
    const documentSearch = vi.fn().mockImplementation(async () => { await webStarted; return []; });
    const webResearch = vi.fn().mockImplementation(async () => {
      release();
      return { status: 'ok', reason: null, queries: [], sources: [] };
    });
    const { generation } = await runVisualTroubleshooting(PAYLOAD, deps({ webResearch, pipeline: { items: [], documentSearch } }));
    expect(documentSearch).toHaveBeenCalled();
    expect(generation.document_search).toBe('no_matches');
  }, 5000);

  it('marks the report partial, with a notice, when web research times out', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, deps({
      webResearch: vi.fn().mockResolvedValue({ status: 'timeout', reason: 'late', queries: [], sources: [] }),
    }));
    const vf = answer.visual_findings!;
    expect(vf.status.partial).toBe(true);
    expect(vf.status.notices.join(' ')).toMatch(/partial/);
  });

  it('gives the pipeline AI only the time left before the deadline', async () => {
    let t = 0;
    const now = () => t;
    const analyze = vi.fn().mockImplementation(async () => { t = TIME_BUDGET.finishBy - 1000; return { analysis: ANALYSIS, model_used: 'm' }; });
    const aiFallback = vi.fn().mockResolvedValue({});
    const { generation } = await runVisualTroubleshooting(PAYLOAD, deps({ analyze, aiFallback, now }));
    // Less than 5 s left: the AI layer is skipped as a timeout, not run.
    expect(aiFallback).not.toHaveBeenCalled();
    if (generation.ai_status === 'error') expect(generation.ai_error_code).toBe('timeout');
  });

  it('flags an instrument mismatch in the uncertainties', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, deps({
      analyze: vi.fn().mockResolvedValue({ analysis: { ...ANALYSIS, instrument_consistency: { status: 'mismatch', explanation: 'This is a Waters QDa.' } }, model_used: 'm' }),
    }));
    expect(answer.uncertainties[0]).toMatch(/may not show the selected instrument/);
  });

  it('sanitises model text before it reaches the browser', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, deps({
      analyze: vi.fn().mockResolvedValue({ analysis: { ...ANALYSIS, summary: 'Panel <script>alert(1)</script><img src=x onerror="x()">' }, model_used: 'm' }),
    }));
    expect(answer.visual_findings!.analysis!.summary).not.toMatch(/<script|onerror|<img/);
  });
});

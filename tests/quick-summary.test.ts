/**
 * Quick Summary (v8.1). The summary is a second view of the same validated
 * analysis, so these tests check that it only selects from the answer (never
 * invents), keeps every safety-first step and every AI-status notice, keeps to
 * the 150–250-word target, and that the email follows the chosen format. (The
 * PDF is .tsx, which this vitest setup cannot import; it is checked by build.)
 */
import { describe, it, expect, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import { runVisualTroubleshooting } from '@/lib/visual-troubleshooting';
import {
  buildQuickSummary, quickSummaryText, shortenStep, leadingSentences, isResponseFormat,
  SUMMARY_WORD_BUDGET, DEFAULT_RESPONSE_FORMAT,
} from '@/lib/quick-summary';
import { buildTroubleshootingEmailHtml } from '@/lib/troubleshooting-email-html';
import { labelForSource } from '@/lib/evidence-labels';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';
import type { VisualAnalysis } from '@/lib/visual-types';

const OFFLINE = { hasAIKey: false, useDocuments: false } as const;

function q(technique: RankingQueryV2['technique'], symptom: string, extra: Partial<RankingQueryV2> = {}): RankingQueryV2 {
  return { technique, vendor: null, model: null, issue_category: null, symptom_description: symptom, method_conditions: null, already_checked: [], ...extra };
}

const QUERIES: RankingQueryV2[] = [
  q('GC', 'A peak that appear at the start of the FID in all the runs with mass of CO2 and Ar, seen in the TIC too. ghost peaks', { vendor: 'Agilent', model: '7890B' }),
  q('HPLC', 'System pressure fluctuates by +/- 40 bar and slowly rises over the sequence', { vendor: 'Waters', issue_category: 'pressure' }),
  q('UHPLC', 'Carryover of the main peak in the blank after the highest standard', { vendor: 'Agilent', model: '1290 Infinity II' }),
  q('LCMS', 'No signal, TIC is flat after source cleaning', { vendor: 'Agilent', model: 'G6170A' }),
  q('NMR', 'Lock signal unstable and shimming fails'),
  q('TGA', 'Baseline drift at high temperature'),
];

function billingError(): Error {
  return new Anthropic.BadRequestError(400, { error: { message: 'Your credit balance is too low to access the Anthropic API.' } }, 'Your credit balance is too low to access the Anthropic API.', new Headers());
}

/** Every string an answer holds, for "was this text taken from the answer?" checks. */
function answerStrings(a: RankedAnswerV2): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(a);
  return out;
}

/** Shortened text is a leading part of an answer string (minus a closing full stop it may gain). */
function fromAnswer(text: string, a: RankedAnswerV2): boolean {
  const t = text.replace(/\.$/, '');
  return answerStrings(a).some(s => s.replace(/^SAFETY:\s*/i, '').startsWith(t) || s.includes(t));
}

describe('Quick Summary is derived from the analysis, never invented', () => {
  it.each(QUERIES.map(x => [x.technique, x] as const))('%s: causes, actions, warnings and sources all come from the answer', async (_t, query) => {
    const { answer } = await runTroubleshootingPipeline(query, OFFLINE);
    const s = buildQuickSummary(answer);

    for (const c of s.causes) expect(fromAnswer(c.text, answer), `cause not in answer: ${c.text}`).toBe(true);
    for (const x of s.actions) expect(fromAnswer(x.text, answer), `action not in answer: ${x.text}`).toBe(true);
    for (const w of s.warnings) expect(fromAnswer(w, answer), `warning not in answer: ${w}`).toBe(true);
    if (s.escalate) expect(fromAnswer(s.escalate, answer)).toBe(true);

    const sourceTitles = answer.sources_with_metadata.map(x => x.source_metadata?.title ?? x.source_id);
    for (const src of s.sources) {
      expect(sourceTitles).toContain(src.title);
      // The label is the one the detailed report shows for that source.
      const original = answer.sources_with_metadata.find(x => (x.source_metadata?.title ?? x.source_id) === src.title)!;
      expect(src.label).toBe(labelForSource(original));
    }
  });

  it.each(QUERIES.map(x => [x.technique, x] as const))('%s: 2–3 causes, 3–5 actions, within the word budget', async (_t, query) => {
    const { answer } = await runTroubleshootingPipeline(query, OFFLINE);
    const s = buildQuickSummary(answer);
    if (answer.hypotheses.length >= 2) {
      expect(s.causes.length).toBeGreaterThanOrEqual(2);
      expect(s.causes.length).toBeLessThanOrEqual(3);
    }
    expect(s.actions.length).toBeGreaterThanOrEqual(3);
    expect(s.actions.length).toBeLessThanOrEqual(5);
    expect(s.word_count).toBeLessThanOrEqual(SUMMARY_WORD_BUDGET);
  });

  it('is much shorter than the detailed report, and is not a truncation of it', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[0], OFFLINE);
    const { formatStandard } = await import('@/agents/presentation/index');
    const detailed = formatStandard(answer).text;
    const summary = quickSummaryText(buildQuickSummary(answer));
    expect(summary.split(/\s+/).length).toBeLessThan(detailed.split(/\s+/).length / 3);
    expect(detailed.startsWith(summary.slice(0, 200))).toBe(false);
  });

  it('ranks causes in the analysis order', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[0], OFFLINE);
    const s = buildQuickSummary(answer);
    const ranked = [...answer.hypotheses].sort((a, b) => a.rank - b.rank);
    s.causes.forEach((c, i) => expect(ranked[i].cause.startsWith(c.text.replace(/\.$/, ''))).toBe(true));
  });

  it('is deterministic: the same answer always gives the same summary', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[1], OFFLINE);
    expect(buildQuickSummary(answer)).toEqual(buildQuickSummary(structuredClone(answer)));
  });

  it('handles a legacy V1 answer with no structured fields', () => {
    const v1: RankedAnswer = {
      problem_summary: 'Noisy baseline', likely_causes: ['Air in the detector cell', 'Lamp ageing'],
      checks: ['Purge the detector'], corrective_actions: ['Degas mobile phase'], stop_conditions: [],
      confidence: 0.45, evidence_summary: [], uncertainties: [], next_questions: ['Which detector wavelength?'],
    };
    const s = buildQuickSummary(v1);
    expect(s.causes.map(c => c.text)).toEqual(['Air in the detector cell', 'Lamp ageing']);
    expect(s.actions.length).toBeGreaterThanOrEqual(3);
    expect(s.assessment).toMatch(/Preliminary hypothesis — 45%/);
    expect(s.sources).toEqual([]);
  });
});

describe('safety and AI status are never summarised away', () => {
  const ANALYSIS: VisualAnalysis = {
    summary: 'MS front with a red LED.',
    ocr_text: [{ text: 'Error 6550', confidence: 0.9, image_index: 0, low_confidence: false }],
    components: [],
    observations: [{ description: 'Solvent leaking near the power connector', category: 'leak', confidence: 0.8, image_index: 0, hazard: true, low_confidence: false }],
    instrument_consistency: { status: 'consistent', explanation: 'Matches.' },
    uncertainties: [],
  };
  const PAYLOAD = {
    technique: 'LCMS', vendor: 'Agilent', model: 'G6170A', description: 'No signal, TIC is flat',
    images: [{ data: 'AAAA', media_type: 'image/jpeg', kind: 'photo', label: 'Photo 1' }],
    media: [{ kind: 'photo', label: 'Photo 1' }], video: null,
  } as never;

  it('keeps every safety-first step from the image analysis, first', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, {
      hasAIKey: true,
      analyze: vi.fn().mockResolvedValue({ analysis: ANALYSIS, model_used: 'claude-sonnet-4-6' }),
      webResearch: vi.fn().mockResolvedValue({ status: 'ok', reason: null, queries: [], sources: [] }),
      pipeline: { useDocuments: false },
    });
    const s = buildQuickSummary(answer);
    expect(answer.visual_findings!.safety_first.length).toBeGreaterThan(0);
    expect(s.warnings.slice(0, answer.visual_findings!.safety_first.length)).toEqual(answer.visual_findings!.safety_first);
    expect(s.observed).toMatch(/Error 6550/);
  });

  it('a credit-exhausted vision call is stated in the summary, not hidden', async () => {
    const { answer } = await runVisualTroubleshooting(PAYLOAD, { hasAIKey: true, analyze: vi.fn().mockRejectedValue(billingError()), pipeline: { useDocuments: false } });
    const s = buildQuickSummary(answer);
    expect(s.notices.join(' ')).toMatch(/credit balance is exhausted|billing/i);
    // Nothing in a degraded report is labelled as manufacturer guidance by the AI.
    expect(s.recommendations_label).not.toBe('AI-GENERATED RECOMMENDATION');
  });

  it('a failed AI call on a text query is stated in the summary', async () => {
    const { answer } = await runTroubleshootingPipeline(q('NMR', 'Lock signal unstable and shimming fails'), {
      hasAIKey: true, useDocuments: false, aiFallback: vi.fn().mockRejectedValue(billingError()),
    });
    const s = buildQuickSummary(answer);
    if (answer.generation?.ai_status === 'error') {
      expect(s.notices.join(' ')).toMatch(/AI|credit|billing/i);
    }
    if (answer.generation?.notice) expect(s.notices).toContain(answer.generation.notice);
  });

  it('labels an AI-produced answer as AI-generated', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[1], OFFLINE);
    const ai: RankedAnswerV2 = { ...answer, generation: { ...answer.generation!, content_source: 'ai', ai_status: 'ok' } };
    expect(buildQuickSummary(ai).recommendations_label).toBe('AI-GENERATED RECOMMENDATION');
  });
});

describe('shortening rules', () => {
  it('drops an explanatory clause', () => {
    const long = 'Replace the inlet liner with a deactivated liner of the same geometry and volume as the original part — liners that are visibly discoloured or contain septum particles accumulate active sites over time';
    expect(shortenStep(long)).toBe('Replace the inlet liner with a deactivated liner of the same geometry and volume as the original part.');
  });

  it('never drops a clause that carries a warning, condition or negation', () => {
    const risky = 'Open the pump head and replace both piston seals and the seal wash gaskets with the correct kit for this model — never do this while the system is still pressurised above ambient pressure';
    expect(shortenStep(risky)).toBe(risky);
  });

  it('leaves short steps untouched and keeps whole sentences', () => {
    expect(shortenStep('Purge the pump.')).toBe('Purge the pump.');
    expect(leadingSentences('One two three. Four five six. Seven.', 6)).toBe('One two three. Four five six.');
    expect(leadingSentences('A very long single sentence that is over the limit', 3)).toBe('A very long single sentence that is over the limit');
  });
});

describe('format option', () => {
  it('defaults to the Detailed Analysis and validates input', () => {
    expect(DEFAULT_RESPONSE_FORMAT).toBe('detailed');
    expect(isResponseFormat('summary')).toBe(true);
    expect(isResponseFormat('detailed')).toBe(true);
    expect(isResponseFormat('SUMMARY')).toBe(false);
    expect(isResponseFormat(undefined)).toBe(false);
  });

  it('email: summary format sends the summary; no format keeps the detailed email', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[0], OFFLINE);
    const opts = { technique: 'GC', vendor: 'Agilent', model: '7890B' };
    const detailed = buildTroubleshootingEmailHtml(answer, opts);
    const summary = buildTroubleshootingEmailHtml(answer, { ...opts, format: 'summary' });
    expect(detailed).toContain('Most Likely Causes (ranked)');
    expect(detailed).not.toContain('Quick Summary');
    expect(summary).toContain('Quick Summary');
    expect(summary).toContain('Critical warnings');
    expect(summary).not.toContain('Most Likely Causes (ranked)');
    expect(summary.length).toBeLessThan(detailed.length);
    expect(summary).toMatch(/<\/html>\s*$/);
  });

  it('email: summary escapes answer text', async () => {
    const { answer } = await runTroubleshootingPipeline(QUERIES[1], OFFLINE);
    const hostile: RankedAnswerV2 = { ...answer, problem_summary: '<script>alert(1)</script> pressure' };
    const html = buildTroubleshootingEmailHtml(hostile, { technique: 'HPLC', format: 'summary' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

/**
 * Regression: the 2026-09-18 UHPLC / Agilent 1290 Infinity II Bio LC carryover
 * query returned an empty "Insufficient evidence — 0%" report because the AI
 * call failed silently and free-text method details were ignored.
 */
import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import { classifyAIError } from '@/lib/ai-errors';
import { rankItemsV2 } from '@/agents/ranking/index';
import { filterItems } from '@/agents/ranking/filter';
import { readItems } from '@/lib/store';
import { formatStandard, formatConcise } from '@/agents/presentation/index';
import { buildTroubleshootingEmailHtml } from '@/lib/troubleshooting-email-html';
import { findGenericProcedure } from '@/lib/generic-procedures';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { RankedAnswerV2, Technique } from '@/lib/types';

const query: RankingQueryV2 = {
  technique: 'UHPLC',
  vendor: 'Agilent',
  model: '1290 Infinity II Bio LC',
  issue_category: 'carryover',
  symptom_description: 'The carry over is seen at the same place by UV and MS carryover carryover',
  method_conditions: null,
  already_checked: [],
};

const billingError = new Anthropic.BadRequestError(
  400,
  { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } },
  'Your credit balance is too low to access the Anthropic API.',
  new Headers(),
);

function expectActionable(answer: RankedAnswerV2) {
  expect(answer.hypotheses.length).toBeGreaterThanOrEqual(3);
  for (const h of answer.hypotheses) {
    expect(h.diagnostic_test.length).toBeGreaterThan(10);
    expect(h.expected_result.length).toBeGreaterThan(5);
  }
  expect(answer.checks.length).toBeGreaterThanOrEqual(4);
  expect(answer.corrective_actions.length).toBeGreaterThanOrEqual(3);
  expect(answer.verification_criteria.length).toBeGreaterThanOrEqual(1);
  expect(answer.escalation_criteria.length).toBeGreaterThanOrEqual(1);
}

describe('UHPLC carryover regression', () => {
  it('AI throwing a billing error is reported, not hidden, and the answer stays actionable', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(query, {
      hasAIKey: true,
      aiFallback: async () => { throw billingError; },
    });
    expect(generation.ai_status).toBe('error');
    expect(generation.ai_error_code).toBe('billing');
    expect(generation.ai_http_status).toBe(400);
    expect(answer.generation?.notice).toContain('AI analysis unavailable');
    expect(answer.uncertainties[0]).toContain('AI analysis unavailable');
    expectActionable(answer);
    expect(answer.uncertainties.join(' ')).not.toContain('No matching knowledge items found');
    // Every presentation mode shows the ranked causes and the notice
    const standard = formatStandard(answer).text;
    expect(standard).toContain('Notice:');
    expect(standard).toContain('## 4. Most Likely Causes (ranked)');
    expect(standard).not.toContain('Insufficient evidence to rank hypotheses');
    expect(formatConcise(answer).text).toContain('Top hypothesis:');
  });

  it('missing API key is reported as skipped_no_key with a generic procedure when the KB is empty', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(query, { hasAIKey: false, items: [] });
    expect(generation.ai_status).toBe('skipped_no_key');
    expect(generation.content_source).toBe('generic_procedure');
    expect(answer.generation?.notice).toContain('not configured');
    expectActionable(answer);
    expect(answer.sources_with_metadata.some(s => s.source_id === 'labpulse-generic-procedure')).toBe(true);
    expect(answer.confidence).toBeLessThanOrEqual(0.30);
    expect(answer.confidence_breakdown.caps_applied.join(' ')).toContain('General best-practice procedure');
  });

  it('related-technique knowledge (HPLC item for UHPLC) is capped at a preliminary hypothesis', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(query, { hasAIKey: false });
    expect(generation.ai_status).toBe('skipped_no_key');
    expect(generation.content_source).toBe('knowledge_base+generic');
    expectActionable(answer);
    expect(answer.confidence).toBeLessThanOrEqual(0.45);
    expect(answer.confidence_breakdown.caps_applied.join(' ')).toContain('related technique');
    expect(answer.sources_with_metadata.some(s => s.source_id.startsWith('knauer'))).toBe(true);
  });

  it('a successful AI answer is not re-downgraded and keeps its content at low confidence', async () => {
    const aiAnswer = (base: RankedAnswerV2): RankedAnswerV2 => ({
      ...base,
      confidence: 0.45,
      confidence_breakdown: { ...base.confidence_breakdown, raw_score: 0.55, final_score: 0.45, label: 'Preliminary hypothesis', caps_applied: ['AI-generated answer (no exact-model source): max 70%'] },
      evidence_summary: [{ source_id: 'claude-sonnet-4-6', excerpt: 'AI-generated answer', evidence_strength: 'moderate' }],
      hypotheses: [{ rank: 1, cause: 'Needle wash solvent too weak', probability: 'high', supporting_evidence: ['tier 6'], contradicting_evidence: [], diagnostic_test: 'Blank after high standard with stronger wash', expected_result: 'Blank response falls', status: 'suspected' }],
      likely_causes: ['Needle wash solvent too weak'],
      checks: ['Run blank after high standard', 'Review wash settings', 'Inspect needle seat', 'Column bypass test'],
      immediate_checks: ['Run blank after high standard'],
      corrective_actions: ['Strengthen wash solvent', 'Replace needle seat', 'Replace rotor seal'],
      verification_criteria: [{ parameter: 'Carryover', expected_value: '< 0.1%', tolerance: 'Per SOP', method: 'Blank after highest standard' }],
      escalation_criteria: ['Persists after seal replacement'],
      stop_conditions: ['Persists after seal replacement'],
      uncertainties: [],
      remaining_uncertainty: [],
    });
    const { answer, generation } = await runTroubleshootingPipeline(query, { hasAIKey: true, aiFallback: async (_q, kb) => aiAnswer(kb) });
    expect(generation.ai_status).toBe('ok');
    expect(answer.confidence).toBe(0.45);
    expect(answer.confidence_breakdown.label).toBe('Preliminary hypothesis');
    expect(answer.hypotheses[0].cause).toBe('Needle wash solvent too weak');
    expect(answer.generation?.notice).toBeNull();
    expect(formatConcise(answer).text).toContain('Top hypothesis: Needle wash solvent too weak');
  });

  it('free-text method details are recognised and no longer reported as missing', () => {
    const withText = {
      ...query,
      method_conditions: 'Column: Zorbax RRHD Eclipse Plus C18 2.1x50mm 1.8um; mobile phase A 0.1% formic acid in water, B acetonitrile; flow 0.4 mL/min',
    };
    const result = detectMissingInfo(withText, 'UHPLC');
    expect(result.critical_missing).toEqual([]);
    expect(result.inferred_from_text?.column).toContain('Zorbax');
    expect(result.inferred_from_text?.flow_rate).toContain('0.4 mL/min');

    const inSymptom = { ...query, symptom_description: `${query.symptom_description}. Column C18 2.1x50, 0.1% FA / ACN, 0.4 ml/min` };
    expect(detectMissingInfo(inSymptom, 'UHPLC').critical_missing).toEqual([]);

    const nothing = detectMissingInfo(query, 'UHPLC');
    expect(nothing.critical_missing).toEqual(['column', 'mobile_phase', 'flow_rate']);
  });

  it('knowledge base surfaces the related HPLC carryover item for a UHPLC query', () => {
    const items = readItems();
    const filtered = filterItems(query, items);
    expect(filtered.map(i => i.id)).toContain('knauer-hplc-003');
    const kb = rankItemsV2(query, items);
    expect(kb.hypotheses.length).toBeGreaterThan(0);
    expect(kb.uncertainties.some(u => u.includes('related technique'))).toBe(true);
  });

  it('classifies common Anthropic errors', () => {
    expect(classifyAIError(billingError).code).toBe('billing');
    expect(classifyAIError(new Anthropic.AuthenticationError(401, {}, 'invalid x-api-key', new Headers())).code).toBe('auth');
    expect(classifyAIError(new Anthropic.NotFoundError(404, {}, 'model not found', new Headers())).code).toBe('model_unavailable');
    expect(classifyAIError(new Anthropic.RateLimitError(429, {}, 'rate limited', new Headers())).code).toBe('rate_limit');
    expect(classifyAIError(new Error('boom')).code).toBe('unknown');
  });

  it('every technique has an issue or technique-level generic procedure', () => {
    const techniques: Technique[] = ['LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC'];
    for (const t of techniques) {
      const { procedure } = findGenericProcedure(t, null, 'unspecified problem');
      expect(procedure.hypotheses.length, t).toBeGreaterThanOrEqual(3);
      expect(procedure.checks.length, t).toBeGreaterThanOrEqual(3);
      expect(procedure.corrective_actions.length, t).toBeGreaterThanOrEqual(2);
      expect(procedure.verification_criteria.length, t).toBeGreaterThanOrEqual(1);
    }
    expect(findGenericProcedure('UHPLC', 'carryover', '').match).toBe('issue');
    expect(findGenericProcedure('HPLC', 'high system pressure', '').procedure.key).toBe('high backpressure');
    expect(findGenericProcedure('GCMS', 'gcms signal loss', '').match).toBe('issue');
    expect(findGenericProcedure('DSC', 'DSC Tg shift', '').match).toBe('technique');
  });

  it('other technique/issue combinations also return a full procedure without AI', async () => {
    const cases: Array<[Technique, string | null, string]> = [
      ['HPLC', 'peak tailing', 'Main peak tailing factor 2.1 on C18'],
      ['GCMS', null, 'Loss of sensitivity over the last week, tune shows high water'],
      ['DSC', null, 'Glass transition shifted by 5 degrees between runs'],
    ];
    for (const [technique, issue, symptom] of cases) {
      const { answer } = await runTroubleshootingPipeline(
        { technique, vendor: 'Agilent', model: 'X', issue_category: issue, symptom_description: symptom, method_conditions: null, already_checked: [] },
        { hasAIKey: false },
      );
      expectActionable(answer);
    }
  });

  it('the emailed report is built from the same answer and shows the notice and hypotheses', async () => {
    const { answer } = await runTroubleshootingPipeline(query, { hasAIKey: true, aiFallback: async () => { throw billingError; } });
    const html = buildTroubleshootingEmailHtml(answer, { technique: 'UHPLC', vendor: 'Agilent', model: '1290 Infinity II Bio LC', issueCategory: 'carryover' });
    expect(html).toContain(`${Math.round(answer.confidence * 100)}%`);
    expect(html).toContain('Notice:');
    expect(html).toContain('Most Likely Causes (ranked)');
    expect(html).toContain(answer.hypotheses[0].diagnostic_test.slice(0, 40).replace(/&/g, '&amp;'));
    expect(html).not.toContain('No matching knowledge items found');
  });
});

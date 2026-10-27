/**
 * v8.2: answers below 75% knowledge-base confidence are refined by Claude Sonnet
 * 5.5, with the knowledge-base answer and manual passages as primary evidence.
 * The SDK call is intercepted: these tests make no API request.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { aiAnswerFallbackV2, knowledgeBaseSection, REFINEMENT_MODEL, AIRefusalError, causeText } from '@/lib/ai-fallback';
import { classifyAIError } from '@/lib/ai-errors';
import { runTroubleshootingPipeline, AI_REFINE_BELOW } from '@/lib/troubleshooting-pipeline';
import type { RankingQueryV2 } from '@/agents/ranking/types';

const GC_QUERY: RankingQueryV2 = {
  technique: 'GC', vendor: 'Agilent', model: '7890B', issue_category: null,
  symptom_description: 'A peak that appear at the start of the FID in all the runs with mass of CO2 and Ar, seen in the TIC too. ghost peaks',
  method_conditions: '3mL/min, constant flow 180C 40C(3min)-->15', already_checked: [],
};

function toolResponse(model = REFINEMENT_MODEL) {
  return {
    model,
    stop_reason: 'tool_use',
    stop_details: null,
    content: [{
      type: 'tool_use', id: 'tu_1', name: 'troubleshoot_response',
      input: {
        hypotheses: [{ cause: 'Air leak at the inlet septum', probability: 'high', supporting_evidence: ['m/z 28/32/40 in the background'], contradicting_evidence: [], diagnostic_test: 'Leak-check the inlet', expected_result: 'Leak found' }],
        checks: ['Leak-check the inlet with an electronic leak detector'],
        corrective_actions: ['Replace the septum'],
        stop_conditions: ['Leak persists after septum replacement'],
        safety_warnings: ['Cool the inlet before handling'],
        confidence: 0.7, uncertainties: [], next_questions: [], reported_observations: [],
        verification_steps: [], verification_criteria: [], action_details: [], method_dependent_flags: [],
        sources_with_metadata: [{ title: 'AI reasoning', manufacturer_or_org: 'Anthropic', classification: 'ai-inference' }],
      },
    }],
  };
}

afterEach(() => vi.restoreAllMocks());

describe('refinement threshold', () => {
  it('is 75%', () => {
    expect(AI_REFINE_BELOW).toBe(0.75);
  });

  it('refines an answer the knowledge base scores between 40% and 75% (previously left alone)', async () => {
    const offline = await runTroubleshootingPipeline(GC_QUERY, { hasAIKey: false, useDocuments: false });
    const kbConfidence = offline.answer.confidence_breakdown.raw_score;
    expect(offline.generation.ai_status).toBe('skipped_no_key');

    const aiFallback = vi.fn(async (_q, kb) => ({ ...kb, evidence_summary: [{ source_id: 'claude-sonnet-5-5', excerpt: 'AI', evidence_strength: 'moderate' as const }] }));
    const { generation } = await runTroubleshootingPipeline(GC_QUERY, { hasAIKey: true, useDocuments: false, aiFallback });
    expect(aiFallback).toHaveBeenCalledTimes(1);
    expect(generation.ai_status).toBe('ok');
    expect(generation.notice).toMatch(/^Refined by Claude Sonnet 5\.5 from the LabPulse knowledge base/);
    expect(kbConfidence).toBeGreaterThan(0);
  });

  it('without credit the answer still comes from the knowledge base and says why', async () => {
    const billing = Object.assign(new Error('x'), {});
    const { generation, answer } = await runTroubleshootingPipeline(GC_QUERY, {
      hasAIKey: true, useDocuments: false, aiFallback: vi.fn().mockRejectedValue(billing),
    });
    expect(generation.ai_status).toBe('error');
    expect(answer.hypotheses.length).toBeGreaterThan(0);
    expect(generation.notice).toMatch(/AI analysis unavailable/);
  });
});

describe('Sonnet 5.5 request', () => {
  it('uses claude-sonnet-5-5 without forced tool choice, sampling params or a thinking budget', async () => {
    const create = vi.spyOn(BetaMessages.prototype, 'create').mockResolvedValue(toolResponse() as never);
    const { answer: kb } = await runTroubleshootingPipeline(GC_QUERY, { hasAIKey: false, useDocuments: false });

    await aiAnswerFallbackV2(GC_QUERY, kb, '=== VENDOR DOCUMENTATION ===\nPassage about septum leaks');

    expect(create).toHaveBeenCalledTimes(1);
    const [body, options] = create.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.output_config).toEqual({ effort: 'medium' });
    expect(body.fallbacks).toBe('default');
    expect(body.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('thinking');
    // Measured ~35 s; the old 40 s cap timed out in production (2026-10-27).
    expect(options.timeout).toBeGreaterThanOrEqual(60_000);
    expect(options.timeout).toBeLessThanOrEqual(90_000);

    const user = ((body.messages as Array<{ content: string }>)[0]).content;
    expect(user.indexOf('Passage about septum leaks')).toBeLessThan(user.indexOf('PRIMARY EVIDENCE TO REFINE'));
    expect(user).toContain('PRIMARY EVIDENCE TO REFINE');
    expect(user).toContain(kb.hypotheses[0].cause);
  });

  it('keeps the knowledge-base sources it refined from, next to the model', async () => {
    vi.spyOn(BetaMessages.prototype, 'create').mockResolvedValue(toolResponse() as never);
    const { answer: kb } = await runTroubleshootingPipeline(GC_QUERY, { hasAIKey: false, useDocuments: false });
    const refined = await aiAnswerFallbackV2(GC_QUERY, kb);
    const ids = refined.sources_with_metadata.map(s => s.source_id);
    expect(ids).toContain('claude-sonnet-5-5');
    for (const s of kb.sources_with_metadata) expect(ids).toContain(s.source_id);
    expect(refined.evidence_summary[0].source_id).toBe('claude-sonnet-5-5');
  });

  it('records the model that actually answered when the server-side fallback ran', async () => {
    vi.spyOn(BetaMessages.prototype, 'create').mockResolvedValue(toolResponse('claude-opus-5-5') as never);
    const refined = await aiAnswerFallbackV2(GC_QUERY);
    expect(refined.evidence_summary[0].source_id).toBe('claude-opus-5-5');
  });

  it('asks once more when the model answers in prose instead of the tool', async () => {
    const prose = { model: REFINEMENT_MODEL, stop_reason: 'end_turn', stop_details: null, content: [{ type: 'text', text: 'Here is my answer…' }] };
    const create = vi.spyOn(BetaMessages.prototype, 'create')
      .mockResolvedValueOnce(prose as never)
      .mockResolvedValueOnce(toolResponse() as never);
    const refined = await aiAnswerFallbackV2(GC_QUERY);
    expect(create).toHaveBeenCalledTimes(2);
    expect(refined.hypotheses[0].cause).toBe('Air leak at the inlet septum');
  });

  it('a refusal is an AI error with its own reason, never an answer', async () => {
    vi.spyOn(BetaMessages.prototype, 'create').mockResolvedValue({
      model: REFINEMENT_MODEL, stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms', explanation: null }, content: [],
    } as never);
    const err = await aiAnswerFallbackV2(GC_QUERY).catch(e => e);
    expect(err).toBeInstanceOf(AIRefusalError);
    expect(classifyAIError(err)).toMatchObject({ code: 'refusal', reason: 'The AI model declined to answer this request.' });
  });
});

describe('knowledge-base section of the prompt', () => {
  it('passes hypotheses with their tests, checks, actions, safety and sources, and asks to refine', async () => {
    const { answer: kb } = await runTroubleshootingPipeline(GC_QUERY, { hasAIKey: false, useDocuments: false });
    const text = knowledgeBaseSection(kb).join('\n');
    expect(text).toContain('PRIMARY EVIDENCE TO REFINE');
    expect(text).toMatch(/Keep the causes, checks and actions below that fit/);
    expect(text).toContain(kb.hypotheses[0].cause);
    expect(text).toContain(kb.hypotheses[0].diagnostic_test);
    expect(text).toContain(kb.checks[0]);
    expect(text).toContain(kb.corrective_actions[0]);
    expect(text).toContain('Safety warnings:');
    expect(text).toMatch(/Knowledge-base sources: /);
  });
});

describe('cause text', () => {
  it('drops a leading status label the model adds (seen live with Sonnet 5.5)', () => {
    expect(causeText('Suspected: the license service is stopped')).toBe('the license service is stopped');
    expect(causeText('Possible – network or DNS failure')).toBe('network or DNS failure');
    expect(causeText('Suspected septum leak')).toBe('Suspected septum leak'); // no label, unchanged
    expect(causeText(42)).toBe('');
  });
});

/**
 * Exercises the real /api/query route handler with auth, rate limiting and the
 * AI call mocked, to prove the HTTP contract exposes AI failures explicitly.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

vi.mock('@/lib/auth', () => ({
  getUser: async () => ({ id: 'user-1', email: 'test@example.com' }),
  getProfile: async () => null,
}));
vi.mock('@/lib/rate-limit', () => ({
  checkQueryRateLimit: () => true,
  checkRateLimit: () => true,
}));
vi.mock('@/lib/ai-fallback', () => ({
  aiAnswerFallbackV2: async () => {
    throw new Anthropic.BadRequestError(
      400,
      { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } },
      'Your credit balance is too low to access the Anthropic API.',
      new Headers(),
    );
  },
}));

const body = {
  technique: 'UHPLC',
  vendor: 'Agilent',
  model: '1290 Infinity II Bio LC',
  issue_category: 'carryover',
  symptom_description: 'The carry over is seen at the same place by UV and MS carryover carryover',
  method_conditions: 'C18 2.1x50 1.8um, 0.1% formic acid / acetonitrile, 0.4 mL/min',
};

function request(payload: unknown): NextRequest {
  return new NextRequest('http://localhost/api/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('/api/query AI status contract', () => {
  it('returns ai_status=error with a reason and a full answer when the AI call fails', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const { POST } = await import('@/app/api/query/route');
    const res = await POST(request(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ai_status).toBe('error');
    expect(json.ai_assisted).toBe(false);
    expect(json.ai_reason).toContain('credit balance');
    expect(json.ranked_answer.generation.ai_error_code).toBe('billing');
    expect(json.ranked_answer.hypotheses.length).toBeGreaterThanOrEqual(3);
    expect(json.ranked_answer.checks.length).toBeGreaterThanOrEqual(4);
    expect(json.ranked_answer.verification_criteria.length).toBeGreaterThanOrEqual(1);
    // Method details typed as free text are recognised
    expect(json.ranked_answer.missing_information.critical_missing).toEqual([]);
    expect(json.modes.standard.text).toContain('Notice:');
    expect(json.modes.standard.text).toContain('Most Likely Causes');
  });

  it('returns ai_status=skipped_no_key when no key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import('@/app/api/query/route');
    const json = await (await POST(request(body))).json();
    expect(json.ai_status).toBe('skipped_no_key');
    expect(json.ranked_answer.generation.notice).toContain('not configured');
    expect(json.ranked_answer.hypotheses.length).toBeGreaterThanOrEqual(3);
  });
});

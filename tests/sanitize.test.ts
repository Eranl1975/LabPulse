import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeStringArray, sanitizeAnswer, sanitizeAnswerV2, encodeHtmlEntities } from '@/lib/sanitize';
import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';

describe('sanitizeText', () => {
  it('strips basic HTML tags', () => {
    expect(sanitizeText('hello <b>world</b>')).toBe('hello world');
  });

  it('strips script tags with content', () => {
    expect(sanitizeText('before<script>alert("xss")</script>after')).toBe('beforeafter');
  });

  it('strips event handlers', () => {
    expect(sanitizeText('test onmouseover="alert(1)" done')).toBe('test  done');
  });

  it('strips javascript: URIs', () => {
    expect(sanitizeText('click javascript: void(0)')).toBe('click  void(0)');
  });

  it('strips data: URIs with base64', () => {
    expect(sanitizeText('image data: text/html; base64, abc')).toBe('image , abc');
  });

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('preserves clean text', () => {
    expect(sanitizeText('Normal troubleshooting text with numbers 123')).toBe('Normal troubleshooting text with numbers 123');
  });

  it('strips nested HTML', () => {
    expect(sanitizeText('<div><span onclick="x">test</span></div>')).toBe('test');
  });

  it('strips multiple script tags', () => {
    expect(sanitizeText('a<script>x</script>b<script>y</script>c')).toBe('abc');
  });
});

describe('encodeHtmlEntities', () => {
  it('encodes ampersand', () => {
    expect(encodeHtmlEntities('A & B')).toBe('A &amp; B');
  });

  it('encodes angle brackets', () => {
    expect(encodeHtmlEntities('<div>')).toBe('&lt;div&gt;');
  });

  it('encodes quotes', () => {
    expect(encodeHtmlEntities('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#39;world&#39;');
  });

  it('handles empty string', () => {
    expect(encodeHtmlEntities('')).toBe('');
  });
});

describe('sanitizeStringArray', () => {
  it('sanitizes all items', () => {
    const result = sanitizeStringArray(['<b>bold</b>', 'normal', '<script>x</script>']);
    expect(result).toEqual(['bold', 'normal', '']);
  });

  it('handles empty array', () => {
    expect(sanitizeStringArray([])).toEqual([]);
  });
});

describe('sanitizeAnswer', () => {
  const baseAnswer: RankedAnswer = {
    problem_summary: '<b>problem</b>',
    likely_causes: ['<script>x</script>cause'],
    checks: ['check <b>1</b>'],
    corrective_actions: ['action'],
    stop_conditions: ['stop'],
    confidence: 0.75,
    evidence_summary: [{ source_id: 'test', excerpt: '<img onerror="x">test', evidence_strength: 'strong' }],
    uncertainties: ['unc'],
    next_questions: ['q1'],
  };

  it('sanitizes problem_summary', () => {
    expect(sanitizeAnswer(baseAnswer).problem_summary).toBe('problem');
  });

  it('sanitizes likely_causes', () => {
    expect(sanitizeAnswer(baseAnswer).likely_causes[0]).toBe('cause');
  });

  it('sanitizes evidence_summary excerpts', () => {
    expect(sanitizeAnswer(baseAnswer).evidence_summary[0].excerpt).toBe('test');
  });

  it('preserves confidence', () => {
    expect(sanitizeAnswer(baseAnswer).confidence).toBe(0.75);
  });
});

describe('sanitizeAnswerV2', () => {
  const v2Answer: RankedAnswerV2 = {
    problem_summary: 'test',
    likely_causes: ['cause'],
    checks: ['check'],
    corrective_actions: ['action'],
    stop_conditions: ['stop'],
    confidence: 0.7,
    evidence_summary: [{ source_id: 's', excerpt: 'e', evidence_strength: 'strong' }],
    uncertainties: [],
    next_questions: [],
    missing_information: { missing_fields: [], critical_missing: [], follow_up_questions: [] },
    hypotheses: [{
      rank: 1,
      cause: '<b>bad cause</b>',
      probability: 'high',
      supporting_evidence: ['<script>x</script>support'],
      contradicting_evidence: [],
      diagnostic_test: 'test <img src=x>',
      expected_result: 'result',
      status: 'suspected',
    }],
    immediate_checks: ['<b>check</b>'],
    verification_steps: [],
    escalation_criteria: [],
    sources_with_metadata: [],
    confidence_breakdown: { raw_score: 0.7, caps_applied: [], final_score: 0.7, label: 'Probable cause', factor_scores: { source_authority: 0.8, technique_relevance: 1, issue_relevance: 0.7, recency: 0.9, evidence_strength: 0.8 }, explanation: '' },
    method_dependent_flags: [],
    printable_checklist: [],
    reported_observations: [],
    confirmed_evidence: [],
    remaining_uncertainty: [],
    safety_warnings: ['<script>alert(1)</script>warning'],
    verification_criteria: [{ parameter: '<b>p</b>', expected_value: 'v', tolerance: 't', method: 'm' }],
    action_details: [{
      action: '<img>act',
      condition: 'c',
      materials: ['<b>mat</b>'],
      safety_level: 'operator',
      evidence_source: 'src',
      rollback: 'rb',
    }],
  };

  it('sanitizes hypotheses cause', () => {
    expect(sanitizeAnswerV2(v2Answer).hypotheses[0].cause).toBe('bad cause');
  });

  it('sanitizes hypotheses supporting evidence', () => {
    expect(sanitizeAnswerV2(v2Answer).hypotheses[0].supporting_evidence[0]).toBe('support');
  });

  it('sanitizes safety_warnings', () => {
    expect(sanitizeAnswerV2(v2Answer).safety_warnings[0]).toBe('warning');
  });

  it('sanitizes verification_criteria parameter', () => {
    expect(sanitizeAnswerV2(v2Answer).verification_criteria[0].parameter).toBe('p');
  });

  it('sanitizes action_details action', () => {
    expect(sanitizeAnswerV2(v2Answer).action_details[0].action).toBe('act');
  });

  it('sanitizes action_details materials', () => {
    expect(sanitizeAnswerV2(v2Answer).action_details[0].materials[0]).toBe('mat');
  });

  it('sanitizes immediate_checks', () => {
    expect(sanitizeAnswerV2(v2Answer).immediate_checks[0]).toBe('check');
  });
});

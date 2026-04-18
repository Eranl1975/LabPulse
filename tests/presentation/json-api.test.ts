import { describe, it, expect } from 'vitest';
import { formatJsonApi } from '@/agents/presentation/formatters/json-api';
import { highConfidenceAnswer, noEvidenceAnswer } from './fixtures';

describe('formatJsonApi', () => {
  it('returns mode = json', () => {
    expect(formatJsonApi(highConfidenceAnswer).mode).toBe('json');
  });

  it('includes formatted_at ISO timestamp', () => {
    const result = formatJsonApi(highConfidenceAnswer);
    expect(result.formatted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('passes through problem_summary unchanged', () => {
    const result = formatJsonApi(highConfidenceAnswer);
    expect(result.problem_summary).toBe(highConfidenceAnswer.problem_summary);
  });

  it('passes through confidence unchanged', () => {
    const result = formatJsonApi(highConfidenceAnswer);
    expect(result.confidence).toBe(0.85);
  });

  it('confidence_label is high for confidence >= 0.75', () => {
    expect(formatJsonApi(highConfidenceAnswer).confidence_label).toBe('high');
  });

  it('confidence_label is medium for confidence 0.50–0.74', () => {
    const med = { ...highConfidenceAnswer, confidence: 0.60 };
    expect(formatJsonApi(med).confidence_label).toBe('medium');
  });

  it('confidence_label is low for confidence 0.01–0.49', () => {
    const low = { ...highConfidenceAnswer, confidence: 0.30 };
    expect(formatJsonApi(low).confidence_label).toBe('low');
  });

  it('confidence_label is insufficient for confidence = 0', () => {
    expect(formatJsonApi(noEvidenceAnswer).confidence_label).toBe('insufficient');
  });

  it('passes through all array fields', () => {
    const result = formatJsonApi(highConfidenceAnswer);
    expect(result.likely_causes).toEqual(highConfidenceAnswer.likely_causes);
    expect(result.checks).toEqual(highConfidenceAnswer.checks);
    expect(result.corrective_actions).toEqual(highConfidenceAnswer.corrective_actions);
    expect(result.stop_conditions).toEqual(highConfidenceAnswer.stop_conditions);
    expect(result.evidence_summary).toEqual(highConfidenceAnswer.evidence_summary);
    expect(result.uncertainties).toEqual(highConfidenceAnswer.uncertainties);
    expect(result.next_questions).toEqual(highConfidenceAnswer.next_questions);
  });

  it('evidence_summary preserves source_id and evidence_strength', () => {
    const result = formatJsonApi(highConfidenceAnswer);
    expect(result.evidence_summary[0].source_id).toBe('agilent-hplc-troubleshooting-guide');
    expect(result.evidence_summary[0].evidence_strength).toBe('strong');
  });

  it('handles empty answer without errors', () => {
    const result = formatJsonApi(noEvidenceAnswer);
    expect(result.likely_causes).toHaveLength(0);
    expect(result.evidence_summary).toHaveLength(0);
  });
});

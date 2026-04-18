import { describe, it, expect } from 'vitest';
import { formatManager } from '@/agents/presentation/formatters/manager';
import { highConfidenceAnswer, noEvidenceAnswer, conflictingAnswer, highSeverityAnswer } from './fixtures';

describe('formatManager', () => {
  it('returns mode = manager', () => {
    expect(formatManager(highConfidenceAnswer).mode).toBe('manager');
  });

  it('issue_summary equals problem_summary', () => {
    const result = formatManager(highConfidenceAnswer);
    expect(result.issue_summary).toBe(highConfidenceAnswer.problem_summary);
  });

  it('urgency is High for confidence >= 0.70', () => {
    const result = formatManager(highConfidenceAnswer);
    expect(result.urgency).toMatch(/High/);
  });

  it('urgency is High with escalation conditions flagged', () => {
    const result = formatManager(highSeverityAnswer);
    expect(result.urgency).toContain('High');
    expect(result.urgency.toLowerCase()).toMatch(/escalation|identified/);
  });

  it('urgency is Medium for confidence 0.45–0.69', () => {
    const medConf = { ...highConfidenceAnswer, confidence: 0.55, stop_conditions: [] };
    const result = formatManager(medConf);
    expect(result.urgency).toMatch(/Medium/);
  });

  it('urgency is Unknown for confidence = 0', () => {
    const result = formatManager(noEvidenceAnswer);
    expect(result.urgency).toMatch(/Unknown/);
  });

  it('data_quality_risk mentions stop_condition when present', () => {
    const result = formatManager(highConfidenceAnswer);
    expect(result.data_quality_risk).toContain('shift > 10%');
  });

  it('data_quality_risk flags conflict when uncertainties contain conflict', () => {
    const result = formatManager(conflictingAnswer);
    expect(result.data_quality_risk.toLowerCase()).toContain('conflict');
  });

  it('recommended_action is first corrective_action when available', () => {
    const result = formatManager(highConfidenceAnswer);
    expect(result.recommended_action).toBe('replace column');
  });

  it('recommended_action falls back to first check when no corrective actions', () => {
    const noActions = { ...highConfidenceAnswer, corrective_actions: [] };
    const result = formatManager(noActions);
    expect(result.recommended_action).toContain('check column age');
  });

  it('recommended_action escalates when no checks or actions', () => {
    const empty = { ...noEvidenceAnswer };
    const result = formatManager(empty);
    expect(result.recommended_action).toContain('Escalate');
  });

  it('text includes all four fields', () => {
    const result = formatManager(highConfidenceAnswer);
    expect(result.text).toContain('Issue:');
    expect(result.text).toContain('Urgency:');
    expect(result.text).toContain('Data Quality Risk:');
    expect(result.text).toContain('Recommended Action:');
  });
});

import { describe, it, expect } from 'vitest';
import { formatStandard } from '@/agents/presentation/formatters/standard';
import { highConfidenceAnswer, noEvidenceAnswer, conflictingAnswer } from './fixtures';

describe('formatStandard', () => {
  it('returns mode = standard', () => {
    expect(formatStandard(highConfidenceAnswer).mode).toBe('standard');
  });

  it('includes Problem section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Problem');
    expect(text).toContain(highConfidenceAnswer.problem_summary);
  });

  it('includes Likely Causes section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Likely Causes');
    expect(text).toContain('column degradation');
  });

  it('numbers likely causes', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('1. column degradation');
    expect(text).toContain('2. mobile phase composition change');
  });

  it('includes Step-by-Step Checks section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Step-by-Step Checks');
    expect(text).toContain('check column age and void volume');
  });

  it('includes Corrective Actions section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Corrective Actions');
    expect(text).toContain('replace column');
  });

  it('includes Stop / Escalate If section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Stop / Escalate If');
    expect(text).toContain('shift > 10%');
  });

  it('includes Data Quality Risk section', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Data Quality Risk');
  });

  it('includes Sources with source_id', () => {
    const { text } = formatStandard(highConfidenceAnswer);
    expect(text).toContain('## Sources');
    expect(text).toContain('agilent-hplc-troubleshooting-guide');
    expect(text).toContain('[strong]');
  });

  it('includes Uncertainties section when present', () => {
    const { text } = formatStandard(conflictingAnswer);
    expect(text).toContain('## Uncertainties');
    expect(text).toContain('Conflicting');
  });

  it('data quality risk mentions conflict when contradictions present', () => {
    const { text } = formatStandard(conflictingAnswer);
    expect(text.toLowerCase()).toContain('conflict');
  });

  it('data quality risk flags low confidence correctly', () => {
    const lowConf = { ...highConfidenceAnswer, confidence: 0.30, stop_conditions: [], uncertainties: [] };
    const { text } = formatStandard(lowConf);
    expect(text).toContain('30%');
  });

  it('handles no evidence gracefully without fabrication', () => {
    const { text } = formatStandard(noEvidenceAnswer);
    expect(text).toContain('Insufficient evidence');
    expect(text).not.toContain('## Likely Causes');
  });
});

import { describe, it, expect } from 'vitest';
import { formatDeep } from '@/agents/presentation/formatters/deep';
import { highConfidenceAnswer, noEvidenceAnswer, conflictingAnswer } from './fixtures';

describe('formatDeep', () => {
  it('returns mode = deep', () => {
    expect(formatDeep(highConfidenceAnswer).mode).toBe('deep');
  });

  it('includes Root Cause Analysis section', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('## Root Cause Analysis');
    expect(text).toContain(highConfidenceAnswer.problem_summary);
  });

  it('includes ranked causes', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('Ranked Likely Causes');
    expect(text).toContain('column degradation');
  });

  it('includes Evidence Comparison section with source_id', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('## Evidence Comparison');
    expect(text).toContain('agilent-hplc-troubleshooting-guide');
    expect(text).toContain('[strong]');
  });

  it('includes Rationale section with confidence percentage', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('## Rationale');
    expect(text).toContain('85%');
  });

  it('includes source count in rationale', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('1 source');
  });

  it('includes Conflicting Hypotheses when contradictions present', () => {
    const { text } = formatDeep(conflictingAnswer);
    expect(text).toContain('## Conflicting Hypotheses');
    expect(text).toContain('Verify both sources');
  });

  it('does not include Conflicting Hypotheses when none present', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).not.toContain('## Conflicting Hypotheses');
  });

  it('includes Open Questions section', () => {
    const { text } = formatDeep(highConfidenceAnswer);
    expect(text).toContain('## Open Questions');
    expect(text).toContain(highConfidenceAnswer.next_questions[0]);
  });

  it('handles no evidence without fabrication', () => {
    const { text } = formatDeep(noEvidenceAnswer);
    expect(text).toContain('No evidence available');
    expect(text).toContain('Insufficient evidence');
  });

  it('rationale distinguishes high vs low confidence', () => {
    const high = formatDeep(highConfidenceAnswer).text;
    const low  = formatDeep({ ...highConfidenceAnswer, confidence: 0.3 }).text;
    expect(high).toContain('High confidence');
    expect(low).toContain('Low confidence');
  });
});

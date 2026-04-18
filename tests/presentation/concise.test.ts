import { describe, it, expect } from 'vitest';
import { formatConcise } from '@/agents/presentation/formatters/concise';
import { highConfidenceAnswer, noEvidenceAnswer } from './fixtures';

describe('formatConcise', () => {
  it('returns mode = concise', () => {
    expect(formatConcise(highConfidenceAnswer).mode).toBe('concise');
  });

  it('includes problem summary', () => {
    const { text } = formatConcise(highConfidenceAnswer);
    expect(text).toContain(highConfidenceAnswer.problem_summary);
  });

  it('includes top likely cause', () => {
    const { text } = formatConcise(highConfidenceAnswer);
    expect(text).toContain('column degradation');
  });

  it('includes first check step', () => {
    const { text } = formatConcise(highConfidenceAnswer);
    expect(text).toContain(highConfidenceAnswer.checks[0]);
  });

  it('shows confidence as percentage', () => {
    const { text } = formatConcise(highConfidenceAnswer);
    expect(text).toContain('85%');
  });

  it('reports insufficient evidence when confidence is 0', () => {
    const { text } = formatConcise(noEvidenceAnswer);
    expect(text).toContain('Insufficient evidence');
  });

  it('shows next question when no evidence', () => {
    const { text } = formatConcise(noEvidenceAnswer);
    expect(text).toContain(noEvidenceAnswer.next_questions[0]);
  });

  it('includes uncertainty note when present', () => {
    const answer = { ...highConfidenceAnswer, uncertainties: ['Low confidence match: xyz'] };
    const { text } = formatConcise(answer);
    expect(text).toContain('Note:');
    expect(text).toContain('Low confidence match');
  });

  it('does not add fabricated text not present in the answer', () => {
    const { text } = formatConcise(highConfidenceAnswer);
    // Only fields from RankedAnswer should appear — not generic advice
    expect(text).not.toContain('consult your vendor');
    expect(text).not.toContain('always');
  });
});

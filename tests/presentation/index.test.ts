import { describe, it, expect } from 'vitest';
import { present } from '@/agents/presentation/index';
import { highConfidenceAnswer } from './fixtures';
import type { PresentationMode } from '@/agents/presentation/types';

const MODES: PresentationMode[] = ['concise', 'standard', 'deep', 'manager', 'json'];

describe('present (dispatcher)', () => {
  for (const mode of MODES) {
    it(`dispatches mode="${mode}" and returns correct mode field`, () => {
      const result = present(highConfidenceAnswer, mode);
      expect(result.mode).toBe(mode);
    });
  }

  it('concise output is a short text (≤ 10 lines)', () => {
    const result = present(highConfidenceAnswer, 'concise');
    if (result.mode === 'concise') {
      const lines = result.text.split('\n').filter(Boolean);
      expect(lines.length).toBeLessThanOrEqual(10);
    }
  });

  it('standard output is longer than concise output', () => {
    const concise  = present(highConfidenceAnswer, 'concise');
    const standard = present(highConfidenceAnswer, 'standard');
    if (concise.mode === 'concise' && standard.mode === 'standard') {
      expect(standard.text.length).toBeGreaterThan(concise.text.length);
    }
  });

  it('json output has no markdown syntax', () => {
    const result = present(highConfidenceAnswer, 'json');
    if (result.mode === 'json') {
      // JSON payload fields are plain strings — no ## or **
      expect(result.problem_summary).not.toContain('##');
      expect(result.problem_summary).not.toContain('**');
    }
  });

  it('manager output has all four structured fields', () => {
    const result = present(highConfidenceAnswer, 'manager');
    if (result.mode === 'manager') {
      expect(result.issue_summary).toBeTruthy();
      expect(result.urgency).toBeTruthy();
      expect(result.data_quality_risk).toBeTruthy();
      expect(result.recommended_action).toBeTruthy();
    }
  });
});

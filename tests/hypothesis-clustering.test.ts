import { describe, it, expect } from 'vitest';
import { clusterHypotheses, hypothesisHeading, cleanExpectedResult } from '@/lib/hypothesis-clustering';
import type { Hypothesis } from '@/lib/types';

function h(overrides: Partial<Hypothesis> & { cause: string; diagnostic_test: string }): Hypothesis {
  return {
    rank: 1,
    probability: 'medium',
    supporting_evidence: [],
    contradicting_evidence: [],
    expected_result: '',
    status: 'suspected',
    ...overrides,
  };
}

describe('clusterHypotheses', () => {
  it('merges causes that share one diagnostic test into a single entry', () => {
    const blank = 'Run a blank injection (no sample): if ghost peaks appear, contamination is in the system';
    const result = clusterHypotheses([
      h({ cause: 'contaminated inlet liner', diagnostic_test: blank, probability: 'high', supporting_evidence: ['restek: blank peaks'] }),
      h({ cause: 'septum bleed', diagnostic_test: blank, probability: 'medium', supporting_evidence: ['restek: blank peaks'] }),
      h({ cause: 'column bleed', diagnostic_test: blank, probability: 'medium', supporting_evidence: ['restek: blank peaks'] }),
      h({ cause: 'solvent impurity', diagnostic_test: blank, probability: 'low', supporting_evidence: ['restek: blank peaks'] }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].grouped_causes).toEqual([
      'contaminated inlet liner', 'septum bleed', 'column bleed', 'solvent impurity',
    ]);
    // Highest probability in the group wins, and evidence is unioned, not repeated.
    expect(result[0].probability).toBe('high');
    expect(result[0].supporting_evidence).toEqual(['restek: blank peaks']);
  });

  it('keeps hypotheses with different diagnostic tests separate and renumbers ranks', () => {
    const result = clusterHypotheses([
      h({ cause: 'air leak', diagnostic_test: 'Read m/z 28, 32 and 40 in the tune report.' }),
      h({ cause: 'column bleed', diagnostic_test: 'Compare m/z 207 at the start and end of the ramp.' }),
      h({ cause: 'septum bleed', diagnostic_test: 'Replace the septum and re-acquire a background.' }),
    ]);

    expect(result).toHaveLength(3);
    expect(result.map(r => r.rank)).toEqual([1, 2, 3]);
    expect(result.every(r => r.grouped_causes === undefined)).toBe(true);
  });

  it('treats tests that differ only in case and punctuation as the same test', () => {
    const result = clusterHypotheses([
      h({ cause: 'a', diagnostic_test: 'Run a blank injection.' }),
      h({ cause: 'b', diagnostic_test: 'run a  blank injection' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].grouped_causes).toEqual(['a', 'b']);
  });

  it('does not cluster hypotheses that have no diagnostic test', () => {
    const result = clusterHypotheses([
      h({ cause: 'a', diagnostic_test: '' }),
      h({ cause: 'b', diagnostic_test: '' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('marks the cluster confirmed when any member was confirmed', () => {
    const result = clusterHypotheses([
      h({ cause: 'a', diagnostic_test: 'same test', status: 'suspected' }),
      h({ cause: 'b', diagnostic_test: 'same test', status: 'confirmed' }),
    ]);
    expect(result[0].status).toBe('confirmed');
  });

  it('gives a clustered entry an expected result that explains the discrimination', () => {
    const result = clusterHypotheses([
      h({ cause: 'a', diagnostic_test: 'same test', expected_result: 'If this cause is correct, the diagnostic should confirm the issue' }),
      h({ cause: 'b', diagnostic_test: 'same test', expected_result: 'If this cause is correct, the diagnostic should confirm the issue' }),
    ]);
    expect(result[0].expected_result).toContain('separates all 2 candidates');
  });

  it('handles empty and single-element input', () => {
    expect(clusterHypotheses([])).toEqual([]);
    const one = clusterHypotheses([h({ cause: 'only', diagnostic_test: 'test' })]);
    expect(one).toHaveLength(1);
    expect(one[0].rank).toBe(1);
  });
});

describe('cleanExpectedResult', () => {
  it('drops the placeholder text the old ranking layer emitted', () => {
    expect(cleanExpectedResult('If this cause is correct, the diagnostic should confirm the issue')).toBe('');
  });

  it('keeps real expected results', () => {
    expect(cleanExpectedResult('Ghost peaks disappear.')).toBe('Ghost peaks disappear.');
  });
});

describe('hypothesisHeading', () => {
  it('returns the cause when nothing was clustered', () => {
    expect(hypothesisHeading(h({ cause: 'air leak', diagnostic_test: 't' }))).toBe('air leak');
  });

  it('joins two or three grouped causes', () => {
    const heading = hypothesisHeading(h({
      cause: 'a', diagnostic_test: 't', grouped_causes: ['a', 'b', 'c'],
    }));
    expect(heading).toBe('a, b or c');
  });

  it('summarises four or more grouped causes', () => {
    const heading = hypothesisHeading(h({
      cause: 'a', diagnostic_test: 't', grouped_causes: ['a', 'b', 'c', 'd'],
    }));
    expect(heading).toBe('a, b and 2 further causes');
  });
});

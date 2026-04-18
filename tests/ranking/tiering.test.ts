import { describe, it, expect } from 'vitest';
import { getTier, tierResults } from '@/agents/ranking/tiering';
import type { ScoredItem } from '@/agents/ranking/types';
import type { KnowledgeItem } from '@/lib/types';

const makeScored = (id: string, total: number, issue_category = 'retention time shift'): ScoredItem => ({
  item: {
    id,
    technique: 'HPLC',
    instrument_family: 'generic',
    model: null,
    issue_category,
    symptom: `symptom for ${id}`,
    likely_causes: ['cause-a'],
    diagnostics: ['check-a'],
    corrective_actions: ['action-a'],
    severity: 'medium',
    escalation_conditions: [],
    source_id: 'agilent-guide',
    confidence_score: total,
    evidence_strength: 'strong',
    updated_at: '2024-01-01T00:00:00Z',
  } as KnowledgeItem,
  score: {
    item_id: id,
    source_authority: 1.0,
    technique_relevance: 1.0,
    issue_relevance: 1.0,
    recency: 1.0,
    evidence_strength: 1.0,
    agreement_bonus: 0,
    already_checked_penalty: 0,
    total,
  },
});

describe('getTier', () => {
  it('returns highly_likely for score >= 0.70', () => {
    expect(getTier(0.70)).toBe('highly_likely');
    expect(getTier(0.95)).toBe('highly_likely');
  });

  it('returns plausible for score 0.45–0.69', () => {
    expect(getTier(0.45)).toBe('plausible');
    expect(getTier(0.69)).toBe('plausible');
  });

  it('returns low_confidence for score < 0.45', () => {
    expect(getTier(0.44)).toBe('low_confidence');
    expect(getTier(0.00)).toBe('low_confidence');
  });
});

describe('tierResults', () => {
  it('separates items into correct tiers', () => {
    const scored = [makeScored('a', 0.80), makeScored('b', 0.55), makeScored('c', 0.20)];
    const result = tierResults(scored);
    expect(result.highly_likely.map(t => t.item.id)).toEqual(['a']);
    expect(result.plausible.map(t => t.item.id)).toEqual(['b']);
    expect(result.low_confidence.map(t => t.item.id)).toEqual(['c']);
  });

  it('detects contradictions between same-category strong items with no overlapping causes', () => {
    const a = makeScored('a', 0.80);
    const b: ScoredItem = {
      ...makeScored('b', 0.80),
      item: { ...makeScored('b', 0.80).item, likely_causes: ['completely-different-cause'] },
    };
    const result = tierResults([a, b]);
    expect(result.contradictions.length).toBeGreaterThan(0);
  });

  it('returns no contradictions when causes overlap', () => {
    const a = makeScored('a', 0.80);
    const b: ScoredItem = {
      ...makeScored('b', 0.80),
      item: { ...makeScored('b', 0.80).item, likely_causes: ['cause-a'] }, // same cause
    };
    const result = tierResults([a, b]);
    expect(result.contradictions).toHaveLength(0);
  });
});

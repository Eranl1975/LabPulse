import { describe, it, expect } from 'vitest';
import {
  scoreSourceAuthority,
  scoreTechniqueRelevance,
  scoreIssueRelevance,
  scoreRecency,
  scoreEvidenceStrength,
  scoreAlreadyCheckedPenalty,
  keywordOverlap,
  scoreItem,
} from '@/agents/ranking/scorer';
import type { KnowledgeItem } from '@/lib/types';
import type { RankingQuery } from '@/agents/ranking/types';
import { CHECKED_PENALTY } from '@/agents/ranking/weights';

const baseItem: KnowledgeItem = {
  id: 'x',
  technique: 'HPLC',
  instrument_family: 'generic',
  model: null,
  issue_category: 'retention time shift',
  symptom: 'RT shifted early',
  likely_causes: ['column degradation'],
  diagnostics: ['check void volume'],
  corrective_actions: ['replace column'],
  severity: 'medium',
  escalation_conditions: [],
  source_id: 'agilent-hplc-guide',
  confidence_score: 0.8,
  evidence_strength: 'strong',
  updated_at: '2024-06-01T00:00:00Z',
};

const baseQuery: RankingQuery = {
  technique: 'HPLC',
  vendor: null,
  model: null,
  issue_category: 'retention time shift',
  symptom_description: 'retention time shifted',
  method_conditions: null,
  already_checked: [],
};

// Fixed timestamp: 1 year after item updated_at
const nowMs = new Date('2025-06-01T00:00:00Z').getTime();

describe('scoreSourceAuthority', () => {
  it('returns 1.0 for known vendor prefix', () => {
    expect(scoreSourceAuthority('agilent-hplc-guide')).toBe(1.0);
    expect(scoreSourceAuthority('waters-ms-maintenance')).toBe(1.0);
    expect(scoreSourceAuthority('restek-gc-guide')).toBe(1.0);
  });

  it('returns 0.7 for scientific publication keywords', () => {
    expect(scoreSourceAuthority('analytical-chemistry-journal')).toBe(0.7);
    expect(scoreSourceAuthority('peer-review-paper')).toBe(0.7);
  });

  it('returns 0.4 for unknown sources', () => {
    expect(scoreSourceAuthority('some-forum-post')).toBe(0.4);
    expect(scoreSourceAuthority('unknown')).toBe(0.4);
  });
});

describe('scoreTechniqueRelevance', () => {
  it('returns 1.0 for exact technique match', () => {
    expect(scoreTechniqueRelevance(baseQuery, baseItem)).toBe(1.0);
  });

  it('returns 0.0 for wrong technique', () => {
    const wrongItem = { ...baseItem, technique: 'GC' as const };
    expect(scoreTechniqueRelevance(baseQuery, wrongItem)).toBe(0.0);
  });

  it('caps score at 1.0 even with vendor + model bonus', () => {
    const query: RankingQuery = { ...baseQuery, vendor: 'Agilent', model: '1290' };
    const item: KnowledgeItem = { ...baseItem, instrument_family: 'Agilent', model: '1290' };
    expect(scoreTechniqueRelevance(query, item)).toBeLessThanOrEqual(1.0);
  });
});

describe('scoreIssueRelevance', () => {
  it('returns 1.0 for exact issue_category match', () => {
    expect(scoreIssueRelevance(baseQuery, baseItem)).toBe(1.0);
  });

  it('returns 0.0 when category provided but does not match', () => {
    const item = { ...baseItem, issue_category: 'peak tailing' };
    expect(scoreIssueRelevance(baseQuery, item)).toBe(0.0);
  });

  it('returns keyword overlap when no issue_category in query', () => {
    const query: RankingQuery = { ...baseQuery, issue_category: null, symptom_description: 'retention column degradation' };
    const score = scoreIssueRelevance(query, baseItem);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(0.8);
  });
});

describe('scoreRecency', () => {
  it('returns 1.0 for item updated within 1 year', () => {
    const recent = new Date(nowMs - 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days old
    expect(scoreRecency(recent, nowMs)).toBe(1.0);
  });

  it('returns 0.85 for item 1–2 years old', () => {
    const oneAndHalf = new Date(nowMs - 1000 * 60 * 60 * 24 * 548).toISOString(); // ~1.5 years
    expect(scoreRecency(oneAndHalf, nowMs)).toBe(0.85);
  });

  it('returns 0.40 for item older than 4 years', () => {
    const old = new Date(nowMs - 1000 * 60 * 60 * 24 * 365 * 5).toISOString(); // 5 years
    expect(scoreRecency(old, nowMs)).toBe(0.40);
  });
});

describe('scoreEvidenceStrength', () => {
  it('returns 1.0 for strong', () => expect(scoreEvidenceStrength('strong')).toBe(1.0));
  it('returns 0.7 for moderate', () => expect(scoreEvidenceStrength('moderate')).toBe(0.7));
  it('returns 0.4 for weak', () => expect(scoreEvidenceStrength('weak')).toBe(0.4));
  it('returns 0.2 for anecdotal', () => expect(scoreEvidenceStrength('anecdotal')).toBe(0.2));
});

describe('scoreAlreadyCheckedPenalty', () => {
  it('returns 0 when already_checked is empty', () => {
    expect(scoreAlreadyCheckedPenalty(baseQuery, baseItem)).toBe(0);
  });

  it('returns penalty when corrective action matches already_checked', () => {
    const query: RankingQuery = { ...baseQuery, already_checked: ['replace column'] };
    expect(scoreAlreadyCheckedPenalty(query, baseItem)).toBe(CHECKED_PENALTY);
  });

  it('returns penalty on partial substring match', () => {
    const query: RankingQuery = { ...baseQuery, already_checked: ['column'] };
    expect(scoreAlreadyCheckedPenalty(query, baseItem)).toBe(CHECKED_PENALTY);
  });

  it('returns 0 when checked items do not overlap', () => {
    const query: RankingQuery = { ...baseQuery, already_checked: ['cleaned source'] };
    expect(scoreAlreadyCheckedPenalty(query, baseItem)).toBe(0);
  });
});

describe('keywordOverlap', () => {
  it('returns 0 for completely unrelated strings', () => {
    expect(keywordOverlap('elephant zebra giraffe', 'pressure column void')).toBe(0);
  });

  it('returns > 0 for partial overlap', () => {
    expect(keywordOverlap('column degradation retention', 'column void volume')).toBeGreaterThan(0);
  });

  it('caps at 0.8', () => {
    const identical = 'retention column degradation temperature mobile phase';
    expect(keywordOverlap(identical, identical)).toBeLessThanOrEqual(0.8);
  });
});

describe('scoreItem (composite)', () => {
  it('returns total in [0, 1]', () => {
    const breakdown = scoreItem(baseQuery, baseItem, 0, nowMs);
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(1);
  });

  it('vendor source + exact match + recent + strong = high score', () => {
    const breakdown = scoreItem(baseQuery, baseItem, 0, nowMs);
    expect(breakdown.total).toBeGreaterThanOrEqual(0.70);
  });

  it('already_checked penalty reduces total score', () => {
    const penaltyQuery: RankingQuery = { ...baseQuery, already_checked: ['replace column'] };
    const normal  = scoreItem(baseQuery, baseItem, 0, nowMs);
    const penalised = scoreItem(penaltyQuery, baseItem, 0, nowMs);
    expect(penalised.total).toBeLessThan(normal.total);
  });

  it('agreement_bonus increases total score', () => {
    const without = scoreItem(baseQuery, baseItem, 0, nowMs);
    const with_   = scoreItem(baseQuery, baseItem, 0.05, nowMs);
    expect(with_.total).toBeGreaterThan(without.total);
  });
});

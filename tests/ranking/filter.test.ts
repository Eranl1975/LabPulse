import { describe, it, expect } from 'vitest';
import { filterItems } from '@/agents/ranking/filter';
import type { KnowledgeItem } from '@/lib/types';
import type { RankingQuery } from '@/agents/ranking/types';

const baseQuery: RankingQuery = {
  technique: 'HPLC',
  vendor: null,
  model: null,
  issue_category: null,
  symptom_description: 'retention time shifted',
  method_conditions: null,
  already_checked: [],
};

const hplcItem: KnowledgeItem = {
  id: 'a',
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
  source_id: 'agilent-guide',
  confidence_score: 0.8,
  evidence_strength: 'strong',
  updated_at: '2024-01-01T00:00:00Z',
};

const lcmsItem: KnowledgeItem = {
  ...hplcItem,
  id: 'b',
  technique: 'LCMS',
  issue_category: 'LCMS source contamination',
};

const gcItem: KnowledgeItem = {
  ...hplcItem,
  id: 'c',
  technique: 'GC',
  issue_category: 'GC ghost peaks',
};

describe('filterItems', () => {
  it('keeps only items matching the queried technique', () => {
    const result = filterItems(baseQuery, [hplcItem, lcmsItem, gcItem]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('filters by issue_category when provided', () => {
    const query: RankingQuery = { ...baseQuery, issue_category: 'retention time shift' };
    const wrongCategory: KnowledgeItem = { ...hplcItem, id: 'd', issue_category: 'peak tailing' };
    const result = filterItems(query, [hplcItem, wrongCategory]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns all technique-matching items when issue_category is null', () => {
    const multiHplc: KnowledgeItem = { ...hplcItem, id: 'e', issue_category: 'peak tailing' };
    const result = filterItems(baseQuery, [hplcItem, multiHplc, lcmsItem]);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no items match technique', () => {
    const result = filterItems(baseQuery, [lcmsItem, gcItem]);
    expect(result).toHaveLength(0);
  });
});

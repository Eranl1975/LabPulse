import { describe, it, expect } from 'vitest';
import { rankItems, fromTroubleshootingQuery } from '@/agents/ranking/index';
import { seedKnowledgeItems } from '@/data/seeds/knowledge-items';
import type { RankingQuery } from '@/agents/ranking/types';

const hplcQuery: RankingQuery = {
  technique: 'HPLC',
  vendor: null,
  model: null,
  issue_category: 'retention time shift',
  symptom_description: 'retention time shifted earlier than expected',
  method_conditions: null,
  already_checked: [],
};

const lcmsQuery: RankingQuery = {
  technique: 'LCMS',
  vendor: null,
  model: null,
  issue_category: 'LCMS source contamination',
  symptom_description: 'gradual loss of sensitivity',
  method_conditions: null,
  already_checked: [],
};

describe('rankItems', () => {
  it('returns a RankedAnswer with all required fields', () => {
    const result = rankItems(hplcQuery, seedKnowledgeItems);
    expect(result).toHaveProperty('problem_summary');
    expect(result).toHaveProperty('likely_causes');
    expect(result).toHaveProperty('checks');
    expect(result).toHaveProperty('corrective_actions');
    expect(result).toHaveProperty('stop_conditions');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('evidence_summary');
    expect(result).toHaveProperty('uncertainties');
    expect(result).toHaveProperty('next_questions');
  });

  it('sets problem_summary from symptom_description', () => {
    const result = rankItems(hplcQuery, seedKnowledgeItems);
    expect(result.problem_summary).toBe(hplcQuery.symptom_description);
  });

  it('returns non-empty likely_causes for a matching HPLC query', () => {
    const result = rankItems(hplcQuery, seedKnowledgeItems);
    expect(result.likely_causes.length).toBeGreaterThan(0);
  });

  it('confidence is between 0 and 1', () => {
    const result = rankItems(hplcQuery, seedKnowledgeItems);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('evidence_summary items have source_id and evidence_strength', () => {
    const result = rankItems(hplcQuery, seedKnowledgeItems);
    for (const e of result.evidence_summary) {
      expect(e).toHaveProperty('source_id');
      expect(e).toHaveProperty('evidence_strength');
    }
  });

  it('returns no results and states uncertainty for unknown technique/issue', () => {
    const query: RankingQuery = {
      ...hplcQuery,
      technique: 'GCMS',
      issue_category: 'retention time shift', // no GCMS items in seed
    };
    const result = rankItems(query, seedKnowledgeItems);
    expect(result.confidence).toBe(0);
    expect(result.uncertainties.length).toBeGreaterThan(0);
    expect(result.likely_causes).toHaveLength(0);
  });

  it('auto-detects issue_category from symptom_description when not provided', () => {
    const query: RankingQuery = {
      ...hplcQuery,
      issue_category: null,
      symptom_description: 'retention time shifted earlier than expected',
    };
    const result = rankItems(query, seedKnowledgeItems);
    // Should auto-detect 'retention time shift' and match seed-001
    expect(result.likely_causes.length).toBeGreaterThan(0);
  });

  it('already_checked items reduce confidence relative to unchecked', () => {
    const unchecked = rankItems(hplcQuery, seedKnowledgeItems);
    const checked: RankingQuery = { ...hplcQuery, already_checked: ['replace column'] };
    const penalised = rankItems(checked, seedKnowledgeItems);
    expect(penalised.confidence).toBeLessThanOrEqual(unchecked.confidence);
  });

  it('LCMS query matches LCMS seed item', () => {
    const result = rankItems(lcmsQuery, seedKnowledgeItems);
    expect(result.evidence_summary.some(e => e.source_id === 'waters-ms-source-maintenance')).toBe(true);
  });
});

describe('fromTroubleshootingQuery', () => {
  it('converts correctly', () => {
    const rq = fromTroubleshootingQuery({
      technique: 'GC',
      instrument_family: 'Agilent',
      model: '7890B',
      issue_category: 'GC ghost peaks',
      symptom_description: 'ghost peaks in blank',
    });
    expect(rq.technique).toBe('GC');
    expect(rq.vendor).toBe('Agilent');
    expect(rq.model).toBe('7890B');
    expect(rq.issue_category).toBe('GC ghost peaks');
    expect(rq.already_checked).toEqual([]);
  });

  it('converts empty issue_category to null', () => {
    const rq = fromTroubleshootingQuery({
      technique: 'HPLC',
      instrument_family: null,
      model: null,
      issue_category: '',
      symptom_description: 'something',
    });
    expect(rq.issue_category).toBeNull();
  });
});

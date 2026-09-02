import { describe, it, expect } from 'vitest';
import { runQualityChecks } from '@/lib/quality-control';
import type { RankedAnswerV2 } from '@/lib/types';
import type { RankingQueryV2 } from '@/agents/ranking/types';

function makeAnswer(overrides: Partial<RankedAnswerV2> = {}): RankedAnswerV2 {
  return {
    problem_summary: 'Test problem',
    likely_causes: ['Cause A'],
    checks: ['Check 1'],
    corrective_actions: ['Action 1'],
    stop_conditions: [],
    confidence: 0.65,
    evidence_summary: [{ source_id: 'test-source', excerpt: 'test', evidence_strength: 'moderate' }],
    uncertainties: [],
    next_questions: [],
    missing_information: { missing_fields: [], critical_missing: [], follow_up_questions: [] },
    hypotheses: [],
    immediate_checks: ['Check 1'],
    verification_steps: [],
    escalation_criteria: [],
    sources_with_metadata: [],
    confidence_breakdown: {
      raw_score: 0.65, caps_applied: [], final_score: 0.65,
      label: 'Probable cause', factor_scores: {
        source_authority: 0.7, technique_relevance: 1.0,
        issue_relevance: 0.8, recency: 0.9, evidence_strength: 0.7,
      },
      explanation: 'Test',
    },
    method_dependent_flags: [],
    printable_checklist: [],
    reported_observations: ['symptom'],
    confirmed_evidence: [],
    remaining_uncertainty: [],
    safety_warnings: [],
    verification_criteria: [],
    action_details: [],
    ...overrides,
  };
}

function makeQuery(overrides: Partial<RankingQueryV2> = {}): RankingQueryV2 {
  return {
    technique: 'LCMS',
    vendor: null,
    model: null,
    issue_category: null,
    symptom_description: 'test symptom description',
    method_conditions: null,
    already_checked: [],
    ...overrides,
  };
}

describe('runQualityChecks', () => {
  it('passes when no issues detected', () => {
    const answer = makeAnswer();
    const query = makeQuery();
    const result = runQualityChecks(answer, query);
    expect(result.passed).toBe(true);
    expect(result.action).toBe('pass');
  });

  describe('checkDuplicates', () => {
    it('warns on duplicate items within a section', () => {
      const answer = makeAnswer({
        likely_causes: ['Column degradation', 'Column degradation'],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'duplicate_detection')).toBe(true);
    });
  });

  describe('checkUnsupportedConfidence', () => {
    it('flags >70% confidence without exact-model source', () => {
      const answer = makeAnswer({
        confidence: 0.75,
        confidence_breakdown: {
          raw_score: 0.75, caps_applied: [], final_score: 0.75,
          label: 'Probable cause',
          factor_scores: { source_authority: 0.7, technique_relevance: 1.0, issue_relevance: 0.8, recency: 0.9, evidence_strength: 0.7 },
          explanation: 'Test',
        },
        sources_with_metadata: [{
          source_id: 'generic-source', excerpt: 'test', evidence_strength: 'moderate',
          classification: 'general-manufacturer-independent',
          source_metadata: { title: 'test', manufacturer_or_org: null, doc_number: null, pub_date: null, url: null, page_or_section: null, classification: 'general-manufacturer-independent', tier: 6 },
        }],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'unsupported_confidence')).toBe(true);
    });

    it('flags >60% confidence with missing critical info', () => {
      const answer = makeAnswer({
        confidence: 0.65,
        confidence_breakdown: {
          raw_score: 0.65, caps_applied: [], final_score: 0.65,
          label: 'Probable cause',
          factor_scores: { source_authority: 0.7, technique_relevance: 1.0, issue_relevance: 0.8, recency: 0.9, evidence_strength: 0.7 },
          explanation: 'Test',
        },
        missing_information: {
          missing_fields: ['model', 'ionization_mode'],
          critical_missing: ['model'],
          follow_up_questions: ['What model?'],
        },
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'unsupported_confidence')).toBe(true);
    });
  });

  describe('checkMissingCitations', () => {
    it('flags likely causes without any source citations', () => {
      const answer = makeAnswer({
        likely_causes: ['Contaminated source'],
        evidence_summary: [],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'missing_citations')).toBe(true);
    });
  });

  describe('checkCrossVendorMisclassification', () => {
    it('flags Agilent source classified as exact-model for Waters query', () => {
      const answer = makeAnswer({
        sources_with_metadata: [{
          source_id: 'agilent-g6170a-guide', excerpt: 'test', evidence_strength: 'strong',
          classification: 'exact-model',
          source_metadata: { title: 'test', manufacturer_or_org: 'Agilent', doc_number: null, pub_date: null, url: null, page_or_section: null, classification: 'exact-model', tier: 1 },
        }],
      });
      const result = runQualityChecks(answer, makeQuery({ vendor: 'Waters' }));
      expect(result.failures.some(f => f.check === 'cross_vendor_misclassification')).toBe(true);
    });

    it('does not flag when no vendor is specified', () => {
      const answer = makeAnswer({
        sources_with_metadata: [{
          source_id: 'agilent-guide', excerpt: 'test', evidence_strength: 'strong',
          classification: 'instrument-family',
          source_metadata: { title: 'test', manufacturer_or_org: 'Agilent', doc_number: null, pub_date: null, url: null, page_or_section: null, classification: 'instrument-family', tier: 2 },
        }],
      });
      const result = runQualityChecks(answer, makeQuery({ vendor: null }));
      expect(result.failures.some(f => f.check === 'cross_vendor_misclassification')).toBe(false);
    });
  });

  describe('checkIncompatibleRecommendations', () => {
    it('flags MS/MS recommendation for single-quad instrument', () => {
      const answer = makeAnswer({
        corrective_actions: ['Use MS/MS to confirm the compound identity'],
      });
      const result = runQualityChecks(answer, makeQuery({ vendor: 'Agilent', model: 'G6170A' }));
      expect(result.failures.some(f => f.check === 'incompatible_recommendation')).toBe(true);
    });

    it('does not flag when instrument is unknown', () => {
      const answer = makeAnswer({
        corrective_actions: ['Use MS/MS to confirm'],
      });
      const result = runQualityChecks(answer, makeQuery({ vendor: 'Unknown', model: 'X' }));
      expect(result.failures.some(f => f.check === 'incompatible_recommendation')).toBe(false);
    });
  });

  describe('checkSymptomCauseConfusion', () => {
    it('warns when cause restates the symptom', () => {
      const answer = makeAnswer({
        likely_causes: ['Ion suppression observed in the sample analysis results'],
      });
      const result = runQualityChecks(answer, makeQuery({
        symptom_description: 'Ion suppression observed in the sample analysis results',
      }));
      expect(result.failures.some(f => f.check === 'symptom_cause_confusion')).toBe(true);
    });
  });

  describe('checkPrematureCorrectiveActions', () => {
    it('warns when corrective actions exist without diagnostic checks', () => {
      const answer = makeAnswer({
        checks: [],
        corrective_actions: ['Replace the column'],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'premature_corrective_actions')).toBe(true);
    });

    it('warns on definitive action when all hypotheses are suspected', () => {
      const answer = makeAnswer({
        hypotheses: [{
          rank: 1, cause: 'Source contamination', probability: 'medium',
          supporting_evidence: ['test'], contradicting_evidence: [],
          diagnostic_test: 'Check source', expected_result: 'Clean source',
          status: 'suspected',
        }],
        corrective_actions: ['Replace the ion source assembly'],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f =>
        f.check === 'premature_corrective_actions' && f.message.includes('suspected')
      )).toBe(true);
    });
  });

  describe('checkSectionContradictions', () => {
    it('warns when escalation says do not attempt but actions suggest replacement', () => {
      const answer = makeAnswer({
        stop_conditions: ['Do not attempt hardware modifications — contact service'],
        escalation_criteria: ['Do not attempt hardware modifications — contact service'],
        corrective_actions: ['Replace the ion source gasket and disassemble the spray chamber'],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.failures.some(f => f.check === 'section_contradictions')).toBe(true);
    });
  });

  describe('action determination', () => {
    it('returns downgrade for 1-2 errors', () => {
      const answer = makeAnswer({
        likely_causes: ['Source contamination'],
        evidence_summary: [],
      });
      const result = runQualityChecks(answer, makeQuery());
      expect(result.action).toBe('downgrade');
    });

    it('returns regenerate for 3+ errors', () => {
      const answer = makeAnswer({
        confidence: 0.80,
        confidence_breakdown: {
          raw_score: 0.80, caps_applied: [], final_score: 0.80, label: 'Strongly supported',
          factor_scores: { source_authority: 0.7, technique_relevance: 1.0, issue_relevance: 0.8, recency: 0.9, evidence_strength: 0.7 },
          explanation: 'Test',
        },
        likely_causes: ['Ion suppression observed'],
        evidence_summary: [], // missing citations
        sources_with_metadata: [{
          source_id: 'agilent-guide', excerpt: 'test', evidence_strength: 'strong',
          classification: 'exact-model',
          source_metadata: { title: 'test', manufacturer_or_org: 'Agilent', doc_number: null, pub_date: null, url: null, page_or_section: null, classification: 'exact-model', tier: 1 },
        }],
        missing_information: { missing_fields: ['model'], critical_missing: ['model'], follow_up_questions: ['What model?'] },
        corrective_actions: ['Use MS/MS to confirm'],
      });
      const result = runQualityChecks(answer, makeQuery({ vendor: 'Agilent', model: 'G6170A' }));
      // Should have: unsupported confidence (missing critical), missing citations, incompatible rec
      expect(result.action).toBe('regenerate');
    });
  });
});

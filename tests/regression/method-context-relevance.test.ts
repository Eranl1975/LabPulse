/**
 * Regression tests for method context relevance enforcement.
 * Ensures AI recommendations are cross-validated against user-provided method context
 * (mobile phase, ion pair reagent, sample matrix, etc.).
 */
import { describe, it, expect } from 'vitest';
import { runQualityChecks } from '@/lib/quality-control';
import type { RankedAnswerV2 } from '@/lib/types';
import type { RankingQueryV2 } from '@/agents/ranking/types';

function makeAnswer(overrides: Partial<RankedAnswerV2> = {}): RankedAnswerV2 {
  return {
    problem_summary: 'Ion suppression in LCMS',
    likely_causes: ['Source contamination'],
    checks: ['Run solvent blank'],
    corrective_actions: ['Clean source'],
    stop_conditions: [],
    confidence: 0.50,
    evidence_summary: [{ source_id: 'claude-sonnet-4-6', excerpt: 'AI-generated', evidence_strength: 'moderate' }],
    uncertainties: [],
    next_questions: [],
    missing_information: { missing_fields: [], critical_missing: [], follow_up_questions: [] },
    hypotheses: [],
    immediate_checks: ['Run solvent blank'],
    verification_steps: [],
    escalation_criteria: [],
    sources_with_metadata: [],
    confidence_breakdown: {
      raw_score: 0.50, caps_applied: [], final_score: 0.50,
      label: 'Preliminary hypothesis',
      factor_scores: { source_authority: 0.3, technique_relevance: 1.0, issue_relevance: 0.5, recency: 1.0, evidence_strength: 0.7 },
      explanation: 'Test',
    },
    method_dependent_flags: [],
    printable_checklist: [],
    reported_observations: ['Ion suppression'],
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
    vendor: 'Agilent',
    model: '6135B LC/MSD',
    issue_category: null,
    symptom_description: 'ion suppression very high',
    method_conditions: null,
    already_checked: [],
    ...overrides,
  };
}

describe('Method Context Relevance — QC Checks', () => {

  describe('Ion pair reagent contradictions', () => {
    it('flags TFA recommendations when user specifies tributylammonium', () => {
      const answer = makeAnswer({
        likely_causes: [
          'Source contamination from matrix buildup',
          'Mobile phase additive concentration too high — TFA > 0.1% causes significant ion suppression in ESI positive mode',
          'Injection volume overload',
        ],
        corrective_actions: [
          'Clean ESI source',
          'Reduce TFA concentration to 0.01–0.05%',
          'Switch mobile phase additive from TFA to 0.1% formic acid',
        ],
      });
      const query = makeQuery({
        mobile_phase: 'Tributylammonium acetate 5 mM ion pair in water/ACN',
      });

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodErrors.length).toBeGreaterThan(0);
      expect(methodErrors.some(e => e.message.toLowerCase().includes('tfa'))).toBe(true);
      expect(methodErrors.some(e => e.message.toLowerCase().includes('tributylammonium'))).toBe(true);
    });

    it('does not flag when recommendation matches user ion pair', () => {
      const answer = makeAnswer({
        likely_causes: [
          'Tributylammonium concentration too high may cause ion suppression',
          'Column not optimized for ion pair chromatography',
        ],
      });
      const query = makeQuery({
        mobile_phase: 'Tributylammonium acetate 5 mM in water/ACN',
      });

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodErrors.length).toBe(0);
    });

    it('flags TEA recommendations when user specifies TBA', () => {
      const answer = makeAnswer({
        corrective_actions: [
          'Switch from triethylammonium to a less suppressive ion pair',
        ],
      });
      const query = makeQuery({
        mobile_phase: 'TBA phosphate buffer 10 mM',
      });

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Sample matrix contradictions', () => {
    it('flags phospholipid removal for synthetic/buffer matrix', () => {
      const answer = makeAnswer({
        corrective_actions: [
          'Perform phospholipid removal using Ostro plate',
          'Optimize SPE cleanup for matrix effect reduction',
        ],
      });
      const query = makeQuery({
        sample_matrix: 'Synthetic standard in buffer',
      });

      const qc = runQualityChecks(answer, query);
      const methodWarnings = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodWarnings.length).toBeGreaterThan(0);
      expect(methodWarnings.some(w => w.message.toLowerCase().includes('phospholipid') || w.message.toLowerCase().includes('spe'))).toBe(true);
    });

    it('does not flag phospholipid removal for plasma matrix', () => {
      const answer = makeAnswer({
        corrective_actions: [
          'Perform phospholipid removal using Ostro plate',
        ],
      });
      const query = makeQuery({
        sample_matrix: 'Human plasma, K2EDTA',
      });

      const qc = runQualityChecks(answer, query);
      const methodWarnings = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodWarnings.length).toBe(0);
    });
  });

  describe('No method context provided', () => {
    it('does not flag anything when no method context fields are given', () => {
      const answer = makeAnswer({
        likely_causes: [
          'TFA concentration too high causing ion suppression',
          'Phospholipid co-elution from plasma matrix',
        ],
      });
      const query = makeQuery(); // no mobile_phase, sample_matrix, etc.

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction');
      expect(methodErrors.length).toBe(0);
    });
  });

  describe('Multiple contradictions', () => {
    it('detects contradictions across all sections', () => {
      const answer = makeAnswer({
        likely_causes: ['TFA > 0.1% causing suppression'],
        checks: ['Switch from TFA to formic acid and re-run'],
        corrective_actions: ['Reduce TFA concentration to 0.05%'],
      });
      const query = makeQuery({
        mobile_phase: 'Tributylammonium formate 5 mM ion pair',
      });

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction');
      // Should detect TFA contradictions in multiple sections
      expect(methodErrors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('QC action escalation with method contradictions', () => {
    it('triggers downgrade or regenerate when method contradictions found', () => {
      const answer = makeAnswer({
        likely_causes: [
          'TFA concentration too high',
          'Reduce TFA to 0.05%',
          'Switch from TFA to formic acid',
        ],
        checks: ['Test with reduced TFA'],
        corrective_actions: ['Replace TFA with formic acid'],
      });
      const query = makeQuery({
        mobile_phase: 'Tributylammonium acetate 5 mM',
      });

      const qc = runQualityChecks(answer, query);
      const methodErrors = qc.failures.filter(f => f.check === 'method_context_contradiction' && f.severity === 'error');
      expect(methodErrors.length).toBeGreaterThanOrEqual(3);
      // Multiple errors should trigger downgrade or regenerate
      expect(qc.action).not.toBe('pass');
    });
  });
});

import type { VerificationCriterion } from '@/lib/types';

export interface GenericHypothesis {
  cause: string;
  probability: 'high' | 'medium' | 'low';
  diagnostic_test: string;
  expected_result: string;
}

/**
 * A manufacturer-independent best-practice procedure (evidence tier 6).
 * Used as the safety net when neither the knowledge base nor the AI layer
 * produced content, so every query still ends with an actionable plan.
 */
export interface GenericProcedure {
  key: string;
  title: string;
  hypotheses: GenericHypothesis[];
  checks: string[];
  corrective_actions: string[];
  verification_criteria: VerificationCriterion[];
  escalation: string[];
  safety: string[];
  next_questions: string[];
}

export const H = (
  cause: string,
  probability: GenericHypothesis['probability'],
  diagnostic_test: string,
  expected_result: string,
): GenericHypothesis => ({ cause, probability, diagnostic_test, expected_result });

export const VC = (
  parameter: string,
  expected_value: string,
  tolerance: string,
  method: string,
): VerificationCriterion => ({ parameter, expected_value, tolerance, method });

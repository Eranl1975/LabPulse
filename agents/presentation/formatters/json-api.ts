import type { RankedAnswer } from '@/lib/types';
import type { JsonApiPayload, ConfidenceLabel } from '../types';

function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.50) return 'medium';
  if (confidence >  0)    return 'low';
  return 'insufficient';
}

// JSON API payload: clean, no markdown, ready for API consumers.
export function formatJsonApi(answer: RankedAnswer): JsonApiPayload {
  return {
    mode:              'json',
    formatted_at:      new Date().toISOString(),
    problem_summary:   answer.problem_summary,
    confidence:        answer.confidence,
    confidence_label:  confidenceLabel(answer.confidence),
    likely_causes:     answer.likely_causes,
    checks:            answer.checks,
    corrective_actions: answer.corrective_actions,
    stop_conditions:   answer.stop_conditions,
    evidence_summary:  answer.evidence_summary,
    uncertainties:     answer.uncertainties,
    next_questions:    answer.next_questions,
  };
}

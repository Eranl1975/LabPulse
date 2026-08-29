import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';
import type { ManagerOutput } from '../types';

function deriveUrgency(confidence: number, stop_conditions: string[]): string {
  if (confidence === 0) return 'Unknown — insufficient evidence';
  if (stop_conditions.length > 0 && confidence >= 0.80) return 'Critical — escalation conditions with strong evidence';
  if (confidence >= 0.80) return 'High — strongly supported root cause';
  if (stop_conditions.length > 0 && confidence >= 0.60) return 'High — escalation conditions identified';
  if (confidence >= 0.60) return 'Medium-High — probable cause identified';
  if (confidence >= 0.40) return 'Medium — preliminary hypothesis, investigate today';
  return 'Low — insufficient evidence, escalate to analyst';
}

function deriveDataQualityRisk(answer: RankedAnswer): string {
  if (answer.stop_conditions.length > 0) {
    return `Risk present — "${answer.stop_conditions[0]}". Quarantine affected results.`;
  }
  const hasConflict = answer.uncertainties.some(u => u.toLowerCase().includes('conflict'));
  if (hasConflict) {
    return 'Conflicting evidence. Verify with instrument specialist before releasing results.';
  }
  if (answer.confidence < 0.45) {
    return 'Low diagnostic confidence. Do not release samples until cause is confirmed.';
  }
  return 'Manageable. Follow corrective actions and monitor response.';
}

function deriveRecommendedAction(answer: RankedAnswer): string {
  if (answer.corrective_actions.length > 0) return answer.corrective_actions[0];
  if (answer.checks.length > 0) return `Perform check: ${answer.checks[0]}`;
  return 'Escalate to instrument specialist.';
}

// Manager view: structured fields + short plain-text summary.
export function formatManager(answer: RankedAnswer): ManagerOutput {
  const issue_summary       = answer.problem_summary;
  const urgency             = deriveUrgency(answer.confidence, answer.stop_conditions);
  const data_quality_risk   = deriveDataQualityRisk(answer);
  const recommended_action  = deriveRecommendedAction(answer);

  // V2 confidence label
  const v2 = 'confidence_breakdown' in answer ? (answer as RankedAnswerV2) : null;
  const confidenceLabel = v2?.confidence_breakdown?.label ?? `${Math.round(answer.confidence * 100)}%`;

  const lines = [
    `## Manager Summary`,
    ``,
    `Issue:               ${issue_summary}`,
    `Urgency:             ${urgency}`,
    `Confidence:          ${Math.round(answer.confidence * 100)}% (${confidenceLabel})`,
    `Data Quality Risk:   ${data_quality_risk}`,
    `Recommended Action:  ${recommended_action}`,
  ];

  if (v2?.missing_information?.critical_missing?.length) {
    lines.push(`Missing Info:        ${v2.missing_information.critical_missing.join(', ')}`);
  }

  const text = lines.join('\n');

  return { mode: 'manager', issue_summary, urgency, data_quality_risk, recommended_action, text };
}

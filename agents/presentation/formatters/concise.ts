import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';
import type { TextOutput } from '../types';

// Concise: 3–5 lines. No fabrication — every line maps directly to a RankedAnswer field.
export function formatConcise(answer: RankedAnswer): TextOutput {
  const lines: string[] = [];

  lines.push(`Issue: ${answer.problem_summary}`);

  const v2 = 'hypotheses' in answer ? (answer as RankedAnswerV2) : null;
  if (v2?.generation?.notice) {
    lines.push(`Notice: ${v2.generation.notice}`);
  }

  const hasContent = answer.likely_causes.length > 0 || (v2?.hypotheses?.length ?? 0) > 0;
  if (!hasContent) {
    lines.push('Most likely cause: Insufficient evidence.');
    if (answer.next_questions.length > 0) {
      lines.push(`Start with: ${answer.next_questions[0]}`);
    }
  } else {
    // Use top hypothesis if V2 (a low confidence score never hides the ranked causes)
    if (v2 && v2.hypotheses.length > 0) {
      lines.push(`Top hypothesis: ${v2.hypotheses[0].cause} [${v2.hypotheses[0].probability} probability — ${v2.hypotheses[0].status}]`);
    } else {
      const top = answer.likely_causes.slice(0, 2).join('; ');
      lines.push(`Most likely: ${top}`);
    }

    if (answer.checks.length > 0) {
      lines.push(`First check: ${answer.checks[0]}`);
    }

    // V2 confidence label
    if (v2?.confidence_breakdown) {
      lines.push(`Confidence: ${Math.round(answer.confidence * 100)}% (${v2.confidence_breakdown.label})`);
    } else {
      lines.push(`Confidence: ${Math.round(answer.confidence * 100)}%`);
    }

    // Missing info warning
    if (v2?.missing_information?.critical_missing?.length) {
      lines.push(`Missing info: ${v2.missing_information.critical_missing.join(', ')}`);
    }
  }

  if (answer.uncertainties.length > 0) {
    lines.push(`Note: ${answer.uncertainties[0]}`);
  }

  return { mode: 'concise', text: lines.join('\n') };
}

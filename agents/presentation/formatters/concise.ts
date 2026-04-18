import type { RankedAnswer } from '@/lib/types';
import type { TextOutput } from '../types';

// Concise: 3–5 lines. No fabrication — every line maps directly to a RankedAnswer field.
export function formatConcise(answer: RankedAnswer): TextOutput {
  const lines: string[] = [];

  lines.push(`Issue: ${answer.problem_summary}`);

  if (answer.confidence === 0 || answer.likely_causes.length === 0) {
    lines.push('Most likely cause: Insufficient evidence.');
    if (answer.next_questions.length > 0) {
      lines.push(`Start with: ${answer.next_questions[0]}`);
    }
  } else {
    const top = answer.likely_causes.slice(0, 2).join('; ');
    lines.push(`Most likely: ${top}`);

    if (answer.checks.length > 0) {
      lines.push(`First check: ${answer.checks[0]}`);
    }

    lines.push(`Confidence: ${Math.round(answer.confidence * 100)}%`);
  }

  if (answer.uncertainties.length > 0) {
    lines.push(`Note: ${answer.uncertainties[0]}`);
  }

  return { mode: 'concise', text: lines.join('\n') };
}

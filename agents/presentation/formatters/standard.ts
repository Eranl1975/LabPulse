import type { RankedAnswer } from '@/lib/types';
import type { TextOutput } from '../types';

function dataQualityRisk(answer: RankedAnswer): string {
  if (answer.stop_conditions.length > 0) {
    return `Stop conditions present: "${answer.stop_conditions[0]}". Review before continuing analysis.`;
  }
  const hasConflict = answer.uncertainties.some(u => u.toLowerCase().includes('conflict'));
  if (hasConflict) {
    return 'Conflicting evidence detected. Do not release samples until root cause is confirmed.';
  }
  if (answer.confidence < 0.45) {
    return `Diagnostic confidence is low (${Math.round(answer.confidence * 100)}%). Do not use results for release decisions.`;
  }
  return 'No critical risk flags identified. Follow corrective actions and monitor.';
}

function numberedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

function bulletList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

// Standard troubleshooting: all seven sections, clean markdown.
export function formatStandard(answer: RankedAnswer): TextOutput {
  if (answer.confidence === 0 && answer.likely_causes.length === 0) {
    const text = [
      `## Problem\n${answer.problem_summary}`,
      `## Result\nInsufficient evidence to diagnose this issue.`,
      answer.uncertainties.length > 0
        ? `## Uncertainties\n${bulletList(answer.uncertainties)}`
        : '',
      answer.next_questions.length > 0
        ? `## Suggested Next Steps\n${numberedList(answer.next_questions)}`
        : '',
    ].filter(Boolean).join('\n\n');

    return { mode: 'standard', text };
  }

  const sections: string[] = [];

  sections.push(`## Problem\n${answer.problem_summary}`);

  sections.push(
    `## Likely Causes (ranked by evidence)\n${numberedList(answer.likely_causes)}`
  );

  if (answer.checks.length > 0) {
    sections.push(`## Step-by-Step Checks\n${numberedList(answer.checks)}`);
  }

  if (answer.corrective_actions.length > 0) {
    sections.push(`## Corrective Actions\n${bulletList(answer.corrective_actions)}`);
  }

  if (answer.stop_conditions.length > 0) {
    sections.push(`## Stop / Escalate If\n${bulletList(answer.stop_conditions)}`);
  }

  sections.push(`## Data Quality Risk\n${dataQualityRisk(answer)}`);

  const sourceLines = answer.evidence_summary.map(
    e => `- ${e.source_id} [${e.evidence_strength}]: "${e.excerpt}"`
  );
  sections.push(`## Sources\n${sourceLines.join('\n')}`);

  if (answer.uncertainties.length > 0) {
    sections.push(`## Uncertainties\n${bulletList(answer.uncertainties)}`);
  }

  return { mode: 'standard', text: sections.join('\n\n') };
}

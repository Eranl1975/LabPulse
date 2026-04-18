import type { RankedAnswer } from '@/lib/types';
import type { TextOutput } from '../types';

function confidenceDescription(confidence: number): string {
  if (confidence >= 0.75) return 'High confidence. Evidence is consistent across strong/vendor sources.';
  if (confidence >= 0.50) return 'Moderate confidence. Evidence is present but not fully corroborated.';
  if (confidence >  0)    return 'Low confidence. Evidence is limited or from weaker sources.';
  return 'No ranked evidence available for this query.';
}

function conflictsFromUncertainties(uncertainties: string[]): string[] {
  return uncertainties.filter(u =>
    u.toLowerCase().includes('conflict') || u.toLowerCase().includes('contradict')
  );
}

// Deep technical: root-cause view, evidence comparison, rationale, conflicts, open questions.
export function formatDeep(answer: RankedAnswer): TextOutput {
  const sections: string[] = [];

  sections.push(`## Root Cause Analysis\n\nProblem: ${answer.problem_summary}`);

  if (answer.likely_causes.length > 0) {
    const causeLines = answer.likely_causes.map(
      (c, i) => `${i + 1}. ${c}`
    ).join('\n');
    sections.push(`### Ranked Likely Causes\n${causeLines}`);
  } else {
    sections.push('### Ranked Likely Causes\nInsufficient evidence to rank causes.');
  }

  if (answer.evidence_summary.length > 0) {
    const rows = answer.evidence_summary.map(
      e => `- **${e.source_id}** [${e.evidence_strength}]\n  "${e.excerpt}"`
    ).join('\n');
    sections.push(`## Evidence Comparison\n${rows}`);
  } else {
    sections.push('## Evidence Comparison\nNo evidence available for this query.');
  }

  const rationale = [
    `## Rationale`,
    `Confidence: ${Math.round(answer.confidence * 100)}% — ${confidenceDescription(answer.confidence)}`,
    `Based on ${answer.evidence_summary.length} source(s).`,
  ];
  if (answer.corrective_actions.length > 0) {
    rationale.push(
      `Corrective actions are derived exclusively from matched evidence. No inferred steps added.`
    );
  }
  sections.push(rationale.join('\n'));

  const conflicts = conflictsFromUncertainties(answer.uncertainties);
  if (conflicts.length > 0) {
    const lines = conflicts.map(c => `- ${c}`).join('\n');
    sections.push(`## Conflicting Hypotheses\n${lines}`);
  }

  const remaining = answer.uncertainties.filter(
    u => !conflicts.includes(u)
  );
  if (remaining.length > 0) {
    sections.push(
      `## Remaining Uncertainties\n${remaining.map(u => `- ${u}`).join('\n')}`
    );
  }

  if (answer.next_questions.length > 0) {
    const qLines = answer.next_questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    sections.push(`## Open Questions\n${qLines}`);
  }

  return { mode: 'deep', text: sections.join('\n\n') };
}

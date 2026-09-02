import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';
import type { TextOutput } from '../types';

function confidenceDescription(confidence: number): string {
  if (confidence >= 0.95) return 'Confirmed — direct diagnostic evidence supports this conclusion.';
  if (confidence >= 0.80) return 'Strongly supported — multiple high-quality sources agree.';
  if (confidence >= 0.60) return 'Probable cause — evidence points in this direction but not fully confirmed.';
  if (confidence >= 0.40) return 'Preliminary hypothesis — some evidence, needs diagnostic confirmation.';
  if (confidence >  0)    return 'Insufficient evidence — limited or conflicting sources.';
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

  // V2 extensions
  const v2 = 'hypotheses' in answer ? (answer as RankedAnswerV2) : null;

  if (v2?.confidence_breakdown) {
    const cb = v2.confidence_breakdown;
    sections.push(`## Confidence Breakdown`);
    sections.push(`Score: ${(cb.final_score * 100).toFixed(0)}% — ${cb.label}`);
    if (cb.caps_applied.length > 0) {
      sections.push(`Caps applied:\n${cb.caps_applied.map(c => `- ${c}`).join('\n')}`);
    }
    sections.push(`Factor scores: source authority ${(cb.factor_scores.source_authority * 100).toFixed(0)}%, technique relevance ${(cb.factor_scores.technique_relevance * 100).toFixed(0)}%, issue relevance ${(cb.factor_scores.issue_relevance * 100).toFixed(0)}%, recency ${(cb.factor_scores.recency * 100).toFixed(0)}%, evidence strength ${(cb.factor_scores.evidence_strength * 100).toFixed(0)}%`);
  }

  if (v2?.sources_with_metadata && v2.sources_with_metadata.length > 0) {
    sections.push(`## Source Classification`);
    for (const s of v2.sources_with_metadata) {
      const meta = s.source_metadata;
      sections.push(`- **${meta?.title ?? s.source_id}** [Tier ${meta?.tier ?? '?'}: ${s.classification}]${meta?.manufacturer_or_org ? ` — ${meta.manufacturer_or_org}` : ''}`);
    }
  }

  if (v2?.method_dependent_flags && v2.method_dependent_flags.length > 0) {
    sections.push(`## Method-Dependent Values`);
    sections.push(v2.method_dependent_flags.map(f => `- ${f}`).join('\n'));
  }

  // V3: Safety warnings
  if (v2?.safety_warnings && v2.safety_warnings.length > 0) {
    sections.push(`## Safety & Preservation Warnings`);
    sections.push(v2.safety_warnings.map(w => `- **WARNING:** ${w}`).join('\n'));
  }

  // V3: Detailed corrective actions
  if (v2?.action_details && v2.action_details.length > 0) {
    sections.push(`## Corrective Action Details`);
    for (const ad of v2.action_details) {
      const levelLabel = ad.safety_level === 'service_engineer' ? 'Service engineer only'
        : ad.safety_level === 'maintenance' ? 'Trained maintenance' : 'Operator-level';
      sections.push(`### ${ad.action}`);
      sections.push(`- **Condition:** ${ad.condition}`);
      if (ad.materials.length > 0) sections.push(`- **Materials:** ${ad.materials.join(', ')}`);
      sections.push(`- **Safety level:** ${levelLabel}`);
      sections.push(`- **Evidence:** ${ad.evidence_source}`);
      if (ad.rollback) sections.push(`- **Rollback:** ${ad.rollback}`);
    }
  }

  // V3: Verification acceptance criteria
  if (v2?.verification_criteria && v2.verification_criteria.length > 0) {
    sections.push(`## Verification Acceptance Criteria`);
    for (const vc of v2.verification_criteria) {
      sections.push(`- **${vc.parameter}:** ${vc.expected_value} (${vc.tolerance}) — ${vc.method}`);
    }
  }

  return { mode: 'deep', text: sections.join('\n\n') };
}

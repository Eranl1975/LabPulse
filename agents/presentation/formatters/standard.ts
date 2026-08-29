import type { RankedAnswer, RankedAnswerV2 } from '@/lib/types';
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
  // Use V2 formatter if V2 fields are present
  if ('hypotheses' in answer && (answer as RankedAnswerV2).hypotheses?.length > 0) {
    return formatStandardV2(answer as RankedAnswerV2);
  }

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

// ─── V2 Standard: 10-section structured report ──────────────────────

function formatStandardV2(answer: RankedAnswerV2): TextOutput {
  const sections: string[] = [];

  // 1. Problem Definition
  sections.push(`## 1. Problem Definition`);
  sections.push(`**Reported observation:** ${answer.problem_summary}`);
  if (answer.reported_observations.length > 1) {
    sections.push(bulletList(answer.reported_observations.slice(1)));
  }

  // 2. Missing Information
  if (answer.missing_information.critical_missing.length > 0) {
    sections.push(`## 2. Missing Information`);
    sections.push(`**Critical fields missing:** ${answer.missing_information.critical_missing.join(', ')}`);
    if (answer.missing_information.follow_up_questions.length > 0) {
      sections.push(`**Follow-up questions:**`);
      sections.push(numberedList(answer.missing_information.follow_up_questions));
    }
  }

  // 3. Ranked Hypotheses
  sections.push(`## 3. Ranked Hypotheses`);
  if (answer.hypotheses.length === 0) {
    sections.push('Insufficient evidence to rank hypotheses.');
  } else {
    for (const h of answer.hypotheses) {
      const statusBadge = h.status === 'confirmed' ? '✓ Confirmed' : '? Suspected';
      sections.push(`### ${h.rank}. ${h.cause} [${h.probability} probability — ${statusBadge}]`);
      if (h.supporting_evidence.length > 0) {
        sections.push(`**Supporting evidence:**\n${bulletList(h.supporting_evidence)}`);
      }
      if (h.contradicting_evidence.length > 0) {
        sections.push(`**Contradicting evidence:**\n${bulletList(h.contradicting_evidence)}`);
      }
      sections.push(`**Diagnostic test:** ${h.diagnostic_test}`);
      sections.push(`**Expected result:** ${h.expected_result}`);
    }
  }

  // 4. Immediate Checks
  if (answer.immediate_checks.length > 0) {
    sections.push(`## 4. Immediate Checks`);
    sections.push(numberedList(answer.immediate_checks));
  }

  // 5. Corrective Actions
  if (answer.corrective_actions.length > 0) {
    sections.push(`## 5. Corrective Actions`);
    sections.push('*Apply only after cause is confirmed via diagnostic checks above.*');
    const flaggedActions = answer.corrective_actions.map(a => {
      const isMethodDep = answer.method_dependent_flags.some(f => f.includes(a.substring(0, 40)));
      return isMethodDep ? `${a} ⚠️ *method-dependent*` : a;
    });
    sections.push(numberedList(flaggedActions));
  }

  // 6. Verification Steps
  if (answer.verification_steps.length > 0) {
    sections.push(`## 6. Verification`);
    sections.push(numberedList(answer.verification_steps));
  }

  // 7. Escalation Criteria
  if (answer.escalation_criteria.length > 0) {
    sections.push(`## 7. Escalation Criteria`);
    sections.push(bulletList(answer.escalation_criteria));
  }

  // 8. Sources
  sections.push(`## 8. Sources`);
  if (answer.sources_with_metadata.length > 0) {
    const sourceLines = answer.sources_with_metadata.map(s => {
      const meta = s.source_metadata;
      const classification = meta ? `[Tier ${meta.tier}: ${meta.classification}]` : `[${s.classification}]`;
      const title = meta?.title ?? s.source_id;
      const org = meta?.manufacturer_or_org ? ` — ${meta.manufacturer_or_org}` : '';
      return `- ${title}${org} ${classification}`;
    });
    sections.push(sourceLines.join('\n'));
  } else {
    const sourceLines = answer.evidence_summary.map(
      e => `- ${e.source_id} [${e.evidence_strength}]: "${e.excerpt}"`
    );
    sections.push(sourceLines.join('\n'));
  }

  // 9. Confidence Breakdown
  sections.push(`## 9. Confidence Breakdown`);
  const cb = answer.confidence_breakdown;
  sections.push(`**Score:** ${(cb.final_score * 100).toFixed(0)}% — ${cb.label}`);
  if (cb.raw_score !== cb.final_score) {
    sections.push(`**Raw score:** ${(cb.raw_score * 100).toFixed(0)}%`);
  }
  if (cb.caps_applied.length > 0) {
    sections.push(`**Caps applied:**\n${bulletList(cb.caps_applied)}`);
  }
  const factors = cb.factor_scores;
  sections.push(`**Factor scores:**`);
  sections.push(`- Source authority: ${(factors.source_authority * 100).toFixed(0)}%`);
  sections.push(`- Technique relevance: ${(factors.technique_relevance * 100).toFixed(0)}%`);
  sections.push(`- Issue relevance: ${(factors.issue_relevance * 100).toFixed(0)}%`);
  sections.push(`- Recency: ${(factors.recency * 100).toFixed(0)}%`);
  sections.push(`- Evidence strength: ${(factors.evidence_strength * 100).toFixed(0)}%`);

  // 10. Printable Checklist
  if (answer.printable_checklist.length > 0) {
    sections.push(`## 10. Checklist`);
    sections.push(answer.printable_checklist.join('\n'));
  }

  // Remaining uncertainty
  if (answer.remaining_uncertainty.length > 0) {
    sections.push(`## Remaining Uncertainty`);
    sections.push(bulletList(answer.remaining_uncertainty));
  }

  return { mode: 'standard', text: sections.join('\n\n') };
}

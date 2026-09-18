import type { RankedAnswerV2, Technique, Hypothesis, EvidenceSummaryV2 } from '@/lib/types';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import { detectIssueCategory } from '@/agents/ranking/issue-detector';
import { matchIssue } from '@/agents/ranking/families';
import { getConfidenceLabelV2 } from '@/agents/ranking/tiering';
import { LC_ISSUE_PROCEDURES } from './lc';
import { GC_ISSUE_PROCEDURES } from './gc';
import { TECHNIQUE_DEFAULTS, UNIVERSAL_DEFAULT } from './techniques';
import type { GenericProcedure } from './types';

export type { GenericProcedure } from './types';

const LC_TECHNIQUES = new Set<Technique>(['HPLC', 'UHPLC', 'PrepLC', 'LCMS', 'SFC', 'IC', 'SECMALS', 'FPLC']);
const GC_TECHNIQUES = new Set<Technique>(['GC', 'GCMS']);

export const GENERIC_SOURCE_ID = 'labpulse-generic-procedure';
export const GENERIC_CONFIDENCE_CAP = 0.30;

export interface GenericMatch {
  procedure: GenericProcedure;
  match: 'issue' | 'technique' | 'universal';
}

function issueProceduresFor(technique: Technique): Record<string, GenericProcedure> {
  const common = { 'instrument communication fault': LC_ISSUE_PROCEDURES['instrument communication fault'] };
  if (LC_TECHNIQUES.has(technique)) return { ...LC_ISSUE_PROCEDURES, ...common };
  if (GC_TECHNIQUES.has(technique)) return { ...GC_ISSUE_PROCEDURES, ...common };
  return common;
}

/** Find the most specific generic procedure for a technique and issue. */
export function findGenericProcedure(
  technique: Technique,
  issueCategory: string | null,
  symptomDescription: string,
): GenericMatch {
  const issue = issueCategory?.trim() || detectIssueCategory(symptomDescription);
  if (issue) {
    const candidates = issueProceduresFor(technique);
    let synonym: GenericProcedure | null = null;
    for (const [key, proc] of Object.entries(candidates)) {
      const m = matchIssue(issue, key);
      if (m === 'exact') return { procedure: proc, match: 'issue' };
      if (m === 'synonym' && !synonym) synonym = proc;
    }
    if (synonym) return { procedure: synonym, match: 'issue' };
  }
  const byTechnique = TECHNIQUE_DEFAULTS[technique];
  if (byTechnique) return { procedure: byTechnique, match: 'technique' };
  return { procedure: UNIVERSAL_DEFAULT, match: 'universal' };
}

function toHypotheses(proc: GenericProcedure, startRank: number): Hypothesis[] {
  return proc.hypotheses.map((h, i) => ({
    rank: startRank + i,
    cause: h.cause,
    probability: h.probability,
    supporting_evidence: [`${proc.title} (general best practice, manufacturer-independent)`],
    contradicting_evidence: [],
    diagnostic_test: h.diagnostic_test,
    expected_result: h.expected_result,
    status: 'suspected',
  }));
}

function genericSource(proc: GenericProcedure): EvidenceSummaryV2 {
  return {
    source_id: GENERIC_SOURCE_ID,
    excerpt: proc.title,
    evidence_strength: 'moderate',
    classification: 'general-manufacturer-independent',
    source_metadata: {
      title: `${proc.title} — general best-practice procedure`,
      manufacturer_or_org: 'LabPulse (manufacturer-independent)',
      doc_number: null,
      pub_date: null,
      url: null,
      page_or_section: null,
      classification: 'general-manufacturer-independent',
      tier: 6,
    },
  };
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Fill the empty sections of an answer with a generic procedure so the user
 * always receives ranked possibilities and a concrete plan. Sections that
 * already have content (from the knowledge base or the AI) are left untouched.
 * Returns the label describing what was added, or null if nothing was needed.
 */
export function mergeGenericProcedure(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
): { answer: RankedAnswerV2; added: GenericMatch | null } {
  const needsHypotheses = answer.hypotheses.length === 0;
  const needsChecks = answer.checks.length === 0;
  const needsActions = answer.corrective_actions.length === 0;
  // Measurable acceptance criteria are always required; auto-generated verification_steps do not replace them.
  const needsVerification = (answer.verification_criteria?.length ?? 0) === 0;
  const needsEscalation = answer.escalation_criteria.length === 0 && answer.stop_conditions.length === 0;

  if (!needsHypotheses && !needsChecks && !needsActions && !needsVerification && !needsEscalation) {
    return { answer, added: null };
  }

  const found = findGenericProcedure(query.technique, query.issue_category, query.symptom_description);
  const proc = found.procedure;
  const hadNoContent = needsHypotheses && needsChecks && needsActions;

  const merged: RankedAnswerV2 = { ...answer };

  if (needsHypotheses) {
    merged.hypotheses = toHypotheses(proc, 1);
    merged.likely_causes = dedup([...merged.likely_causes, ...proc.hypotheses.map(h => h.cause)]);
  }
  if (needsChecks) {
    merged.checks = [...proc.checks];
    merged.immediate_checks = [...proc.checks];
  }
  if (needsActions) {
    merged.corrective_actions = [...proc.corrective_actions];
  }
  if (needsVerification) {
    merged.verification_criteria = [...proc.verification_criteria];
  }
  if (needsEscalation) {
    merged.escalation_criteria = [...proc.escalation];
    merged.stop_conditions = [...proc.escalation];
  }
  if ((merged.safety_warnings?.length ?? 0) === 0) {
    merged.safety_warnings = [...proc.safety];
  }
  merged.next_questions = dedup([
    ...merged.next_questions.filter(q => !q.startsWith('Is the technique selection correct') && !q.startsWith('Is this issue covered')),
    ...proc.next_questions,
  ]);
  merged.uncertainties = merged.uncertainties.filter(u => !u.startsWith('No matching knowledge items found'));
  merged.printable_checklist = [
    ...merged.checks.map((c, i) => `☐ Check ${i + 1}: ${c}`),
    ...merged.corrective_actions.map((a, i) => `☐ Action ${i + 1}: ${a}`),
  ];
  merged.sources_with_metadata = [...merged.sources_with_metadata, genericSource(proc)];
  merged.evidence_summary = [
    ...merged.evidence_summary,
    { source_id: GENERIC_SOURCE_ID, excerpt: proc.title, evidence_strength: 'moderate' },
  ];

  if (hadNoContent) {
    // No instrument-specific evidence at all: the score reflects a generic procedure, not a diagnosis.
    const cap = GENERIC_CONFIDENCE_CAP;
    merged.confidence = Math.min(Math.max(answer.confidence, cap), cap);
    merged.confidence_breakdown = {
      ...answer.confidence_breakdown,
      final_score: merged.confidence,
      label: getConfidenceLabelV2(merged.confidence),
      caps_applied: [
        ...answer.confidence_breakdown.caps_applied,
        `General best-practice procedure, no instrument-specific evidence: max ${cap * 100}%`,
      ],
      factor_scores: {
        source_authority: 0.45,
        technique_relevance: 1.0,
        issue_relevance: found.match === 'issue' ? 1.0 : 0.5,
        recency: 1.0,
        evidence_strength: 0.4,
      },
      explanation: `${answer.confidence_breakdown.explanation} Generic procedure applied (${found.match} match): ${proc.title}.`,
    };
  }

  return { answer: merged, added: found };
}

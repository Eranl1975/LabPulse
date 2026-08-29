import type { KnowledgeItem, RankedAnswer, RankedAnswerV2, EvidenceSummary, EvidenceSummaryV2, TroubleshootingQuery, Hypothesis, ConfidenceBreakdown } from '@/lib/types';
import type { RankingQuery, RankingQueryV2, ScoredItem, ScoreBreakdownV2 } from './types';
import { detectIssueCategory } from './issue-detector';
import { filterItems } from './filter';
import { scoreItem, scoreItemV2 } from './scorer';
import { computeAgreementBonuses } from './agreement';
import { tierResults, getConfidenceLabelV2 } from './tiering';
import { CONFIDENCE_CAPS } from './weights';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import { deduplicateItems } from '@/lib/deduplication';
import { classifySource, validateSourceForVendor } from '@/lib/evidence-hierarchy';

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function rankItems(query: RankingQuery, items: KnowledgeItem[]): RankedAnswer {
  // 1. Resolve issue_category: use provided value or auto-detect
  const resolved: RankingQuery = {
    ...query,
    issue_category: query.issue_category?.trim() || detectIssueCategory(query.symptom_description),
  };

  // 2. Hard filter by technique + issue_category
  const filtered = filterItems(resolved, items);

  if (filtered.length === 0) {
    return {
      problem_summary:     query.symptom_description,
      likely_causes:       [],
      checks:              [],
      corrective_actions:  [],
      stop_conditions:     [],
      confidence:          0,
      evidence_summary:    [],
      uncertainties: [
        'No matching knowledge items found for this technique and issue.',
        resolved.issue_category
          ? `Issue category detected: "${resolved.issue_category}"`
          : 'Issue category could not be detected from the description.',
      ],
      next_questions: [
        'Is the technique selection correct?',
        'Is this issue covered in the knowledge base?',
      ],
    };
  }

  // 3. Initial score (no agreement bonuses yet)
  const initial: ScoredItem[] = filtered.map(item => ({
    item,
    score: scoreItem(resolved, item, 0),
  }));

  // 4. Cross-item agreement bonuses, then re-score
  const bonuses = computeAgreementBonuses(initial);
  const scored: ScoredItem[] = initial.map(s => ({
    item: s.item,
    score: scoreItem(resolved, s.item, bonuses.get(s.item.id) ?? 0),
  }));

  // 5. Tier results and detect contradictions
  const tiered = tierResults(scored);

  // 6. Assemble RankedAnswer
  const topItems = [...tiered.highly_likely, ...tiered.plausible];
  const allItems = [...topItems, ...tiered.low_confidence];

  const likely_causes      = dedup(topItems.flatMap(t => t.item.likely_causes));
  const checks             = dedup(topItems.flatMap(t => t.item.diagnostics));
  const corrective_actions = dedup(tiered.highly_likely.flatMap(t => t.item.corrective_actions));
  const stop_conditions    = dedup(allItems.flatMap(t => t.item.escalation_conditions));

  const evidence_summary: EvidenceSummary[] = allItems.map(t => ({
    source_id:         t.item.source_id,
    excerpt:           t.item.symptom,
    evidence_strength: t.item.evidence_strength,
  }));

  const topScores = tiered.highly_likely.length > 0
    ? tiered.highly_likely.map(t => t.score.total)
    : tiered.plausible.map(t => t.score.total);
  const rawConfidence = parseFloat(mean(topScores).toFixed(2));

  // Confidence calibration: suppress false confidence when issue relevance is weak.
  // If none of the top items have meaningful issue relevance (< 0.2), the ranking is
  // driven purely by source authority / recency — not by actual symptom match.
  // Cap at 0.35 to ensure AI fallback is triggered for off-topic matches.
  const maxIssueRelevance = topItems.length > 0
    ? Math.max(...topItems.map(t => t.score.issue_relevance))
    : 0;
  const confidence = maxIssueRelevance < 0.2
    ? Math.min(rawConfidence, 0.35)
    : rawConfidence;

  const uncertainties: string[] = [
    ...tiered.low_confidence.map(
      t => `Low confidence match: "${t.item.symptom}" (score: ${t.score.total.toFixed(2)})`,
    ),
    ...tiered.contradictions,
  ];

  // next_questions: diagnostics from plausible items not yet attempted
  const next_questions = dedup(
    tiered.plausible.flatMap(t => t.item.diagnostics),
  ).filter(d =>
    !query.already_checked.some(c => d.toLowerCase().includes(c.toLowerCase())),
  );

  return {
    problem_summary: query.symptom_description,
    likely_causes,
    checks,
    corrective_actions,
    stop_conditions,
    confidence,
    evidence_summary,
    uncertainties,
    next_questions,
  };
}

/** Convert a TroubleshootingQuery (from the old interface) to a RankingQuery. */
export function fromTroubleshootingQuery(tq: TroubleshootingQuery): RankingQuery {
  return {
    technique:            tq.technique,
    vendor:               tq.instrument_family || null,
    model:                tq.model || null,
    issue_category:       tq.issue_category?.trim() || null,
    symptom_description:  tq.symptom_description,
    method_conditions:    null,
    already_checked:      [],
  };
}

// ─── V2 Ranking (structured reports with confidence caps) ────────────

export function rankItemsV2(query: RankingQueryV2, items: KnowledgeItem[]): RankedAnswerV2 {
  // 1. Get base ranking from existing pipeline
  const base = rankItems(query, items);

  // 2. Detect missing info
  const missingInfo = detectMissingInfo(query, query.technique);

  // 3. Re-score with V2 scorer for evidence classification
  const resolved: RankingQueryV2 = {
    ...query,
    issue_category: query.issue_category?.trim() || detectIssueCategory(query.symptom_description),
  };
  const filtered = filterItems(resolved, items);
  const bonuses = computeAgreementBonuses(
    filtered.map(item => ({ item, score: scoreItem(resolved, item, 0) }))
  );
  const scoredV2 = filtered.map(item => ({
    item,
    score: scoreItemV2(resolved, item, bonuses.get(item.id) ?? 0),
  }));

  // 4. Apply confidence caps
  const caps: string[] = [];
  let confidence = base.confidence;

  if (missingInfo.critical_missing.length > 0) {
    caps.push(`Missing critical method info (${missingInfo.critical_missing.join(', ')}): max ${CONFIDENCE_CAPS.MISSING_CRITICAL_INFO * 100}%`);
    confidence = Math.min(confidence, CONFIDENCE_CAPS.MISSING_CRITICAL_INFO);
  }

  const hasExactModel = scoredV2.some(s => s.score.evidence_classification === 'exact-model');
  if (!hasExactModel && confidence > CONFIDENCE_CAPS.NO_EXACT_MODEL_SOURCE) {
    caps.push(`No exact-model source evidence: max ${CONFIDENCE_CAPS.NO_EXACT_MODEL_SOURCE * 100}%`);
    confidence = Math.min(confidence, CONFIDENCE_CAPS.NO_EXACT_MODEL_SOURCE);
  }

  // Symptoms only: no diagnostic confirmation
  const hasDiagnosticConfirmation = query.qc_results || query.recent_maintenance;
  if (!hasDiagnosticConfirmation && confidence > CONFIDENCE_CAPS.SYMPTOMS_ONLY) {
    caps.push(`Symptoms only, no diagnostic confirmation: max ${CONFIDENCE_CAPS.SYMPTOMS_ONLY * 100}%`);
    confidence = Math.min(confidence, CONFIDENCE_CAPS.SYMPTOMS_ONLY);
  }

  if (base.uncertainties.some(u => u.toLowerCase().includes('contradict'))) {
    caps.push(`Conflicting evidence: reduced by ${CONFIDENCE_CAPS.CONFLICTING_EVIDENCE_REDUCTION * 100}%`);
    confidence = Math.max(0, confidence - CONFIDENCE_CAPS.CONFLICTING_EVIDENCE_REDUCTION);
  }

  confidence = parseFloat(confidence.toFixed(2));

  // 5. Deduplicate output sections
  const dedupCauses = deduplicateItems(base.likely_causes, 6);
  const dedupChecks = deduplicateItems(base.checks, 6);
  const dedupActions = deduplicateItems(base.corrective_actions, 6);

  // 6. Build hypotheses from scored items
  const hypotheses = buildHypotheses(scoredV2, base);

  // 7. Build evidence summaries with metadata
  const sourcesWithMetadata: EvidenceSummaryV2[] = base.evidence_summary.map(es => {
    const { tier, classification } = classifySource(es.source_id, query.vendor, query.model);
    const isValidVendor = validateSourceForVendor(es.source_id, query.vendor);
    return {
      ...es,
      classification: isValidVendor ? classification : 'general-manufacturer-independent',
      source_metadata: {
        title: es.source_id,
        manufacturer_or_org: null,
        doc_number: null,
        pub_date: null,
        url: null,
        page_or_section: null,
        classification: isValidVendor ? classification : 'general-manufacturer-independent',
        tier: isValidVendor ? tier : 6 as const,
      },
    };
  });

  // 8. Build confidence breakdown
  const topScores = scoredV2.filter(s => s.score.total >= 0.45);
  const avgFactors = averageFactorScores(topScores.map(s => s.score));

  const confidenceBreakdown: ConfidenceBreakdown = {
    raw_score: base.confidence,
    caps_applied: caps,
    final_score: confidence,
    label: getConfidenceLabelV2(confidence),
    factor_scores: avgFactors,
    explanation: buildConfidenceExplanation(confidence, caps, avgFactors),
  };

  // 9. Identify method-dependent items
  const methodDependentFlags = identifyMethodDependentItems([
    ...dedupActions.main,
    ...dedupChecks.main,
  ]);

  // 10. Build printable checklist
  const printableChecklist = [
    ...dedupChecks.main.map((c, i) => `☐ Check ${i + 1}: ${c}`),
    ...dedupActions.main.map((a, i) => `☐ Action ${i + 1}: ${a}`),
  ];

  return {
    // Base fields (with deduplication applied)
    problem_summary: base.problem_summary,
    likely_causes: dedupCauses.main,
    checks: dedupChecks.main,
    corrective_actions: dedupActions.main,
    stop_conditions: base.stop_conditions,
    confidence,
    evidence_summary: base.evidence_summary,
    uncertainties: base.uncertainties,
    next_questions: base.next_questions,

    // V2 fields
    missing_information: missingInfo,
    hypotheses,
    immediate_checks: dedupChecks.main,
    verification_steps: buildVerificationSteps(dedupActions.main),
    escalation_criteria: dedup(base.stop_conditions),
    sources_with_metadata: sourcesWithMetadata,
    confidence_breakdown: confidenceBreakdown,
    method_dependent_flags: methodDependentFlags,
    printable_checklist: printableChecklist,
    reported_observations: [query.symptom_description],
    confirmed_evidence: [],
    remaining_uncertainty: base.uncertainties.filter(u => !u.startsWith('Low confidence match')),
  };
}

// ─── V2 Helpers ─────────────────────────────────────────────────────

function buildHypotheses(
  scored: { item: KnowledgeItem; score: ScoreBreakdownV2 }[],
  base: RankedAnswer,
): Hypothesis[] {
  const causeMap = new Map<string, { items: KnowledgeItem[]; maxScore: number }>();

  for (const { item, score } of scored) {
    for (const cause of item.likely_causes) {
      const existing = causeMap.get(cause);
      if (existing) {
        existing.items.push(item);
        existing.maxScore = Math.max(existing.maxScore, score.total);
      } else {
        causeMap.set(cause, { items: [item], maxScore: score.total });
      }
    }
  }

  const hypotheses: Hypothesis[] = [];
  const sorted = [...causeMap.entries()].sort((a, b) => b[1].maxScore - a[1].maxScore);

  for (let i = 0; i < Math.min(sorted.length, 6); i++) {
    const [cause, data] = sorted[i];
    const supportingEvidence = data.items.map(it => `${it.source_id}: ${it.symptom}`);
    const contradicting = base.uncertainties
      .filter(u => u.toLowerCase().includes('contradict'))
      .slice(0, 2);

    hypotheses.push({
      rank: i + 1,
      cause,
      probability: data.maxScore >= 0.70 ? 'high' : data.maxScore >= 0.45 ? 'medium' : 'low',
      supporting_evidence: supportingEvidence,
      contradicting_evidence: contradicting,
      diagnostic_test: data.items[0]?.diagnostics[0] ?? 'Perform baseline diagnostic check',
      expected_result: `If this cause is correct, the diagnostic should confirm the issue`,
      status: 'suspected',
    });
  }

  return hypotheses;
}

function buildVerificationSteps(actions: string[]): string[] {
  return actions.map(a => `After "${a.substring(0, 60)}..." — verify the symptom is resolved and system performance is within specification`);
}

function identifyMethodDependentItems(items: string[]): string[] {
  const methodKeywords = [
    'flow rate', 'injection volume', 'gradient', 'mobile phase',
    'column temperature', 'oven temperature', 'split ratio',
    'fragmentor voltage', 'cone voltage', 'capillary voltage',
    'dwell time', 'scan range', 'acquisition time',
    'ml/min', 'µl', 'µl/min', '%b',
  ];

  return items.filter(item => {
    const lower = item.toLowerCase();
    return methodKeywords.some(kw => lower.includes(kw));
  }).map(item => `Method-dependent: "${item.substring(0, 80)}..." — values are starting points; verify against your specific method`);
}

function averageFactorScores(scores: ScoreBreakdownV2[]): ConfidenceBreakdown['factor_scores'] {
  if (scores.length === 0) {
    return { source_authority: 0, technique_relevance: 0, issue_relevance: 0, recency: 0, evidence_strength: 0 };
  }
  const n = scores.length;
  return {
    source_authority: parseFloat((scores.reduce((s, x) => s + x.source_authority, 0) / n).toFixed(2)),
    technique_relevance: parseFloat((scores.reduce((s, x) => s + x.technique_relevance, 0) / n).toFixed(2)),
    issue_relevance: parseFloat((scores.reduce((s, x) => s + x.issue_relevance, 0) / n).toFixed(2)),
    recency: parseFloat((scores.reduce((s, x) => s + x.recency, 0) / n).toFixed(2)),
    evidence_strength: parseFloat((scores.reduce((s, x) => s + x.evidence_strength, 0) / n).toFixed(2)),
  };
}

function buildConfidenceExplanation(
  confidence: number,
  caps: string[],
  factors: ConfidenceBreakdown['factor_scores'],
): string {
  const parts: string[] = [];
  parts.push(`Final confidence: ${(confidence * 100).toFixed(0)}% (${getConfidenceLabelV2(confidence)})`);

  if (caps.length > 0) {
    parts.push(`Caps applied: ${caps.join('; ')}`);
  }

  const strongest = Object.entries(factors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k, v]) => `${k.replace(/_/g, ' ')} (${(v * 100).toFixed(0)}%)`);
  if (strongest.length > 0) {
    parts.push(`Strongest factors: ${strongest.join(', ')}`);
  }

  return parts.join('. ');
}

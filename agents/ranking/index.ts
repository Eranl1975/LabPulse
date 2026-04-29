import type { KnowledgeItem, RankedAnswer, EvidenceSummary } from '@/lib/types';
import type { RankingQuery, ScoredItem } from './types';
import { detectIssueCategory } from './issue-detector';
import { filterItems } from './filter';
import { scoreItem } from './scorer';
import { computeAgreementBonuses } from './agreement';
import { tierResults } from './tiering';

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

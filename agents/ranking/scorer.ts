import type { KnowledgeItem, EvidenceStrength } from '@/lib/types';
import type { ScoreBreakdown, RankingQuery } from './types';
import {
  SCORE_WEIGHTS,
  VENDOR_SOURCE_PREFIXES,
  EVIDENCE_STRENGTH_SCORES,
  RECENCY_BANDS,
  RECENCY_FALLBACK,
  CHECKED_PENALTY,
} from './weights';

// --- Individual factor scorers (exported for unit tests) ---

export function scoreSourceAuthority(source_id: string): number {
  const lower = source_id.toLowerCase();
  if (VENDOR_SOURCE_PREFIXES.some(p => lower.startsWith(p))) return 1.0;
  if (['journal', 'review', 'publication', 'paper'].some(w => lower.includes(w))) return 0.7;
  return 0.4;
}

export function scoreTechniqueRelevance(query: RankingQuery, item: KnowledgeItem): number {
  if (item.technique !== query.technique) return 0.0;
  let score = 1.0;
  // Small bonus for specific instrument family or model match
  if (query.vendor && item.instrument_family !== 'generic') {
    if (item.instrument_family.toLowerCase() === query.vendor.toLowerCase()) {
      score = Math.min(1.0, score + 0.05);
    }
  }
  if (query.model && item.model) {
    if (item.model.toLowerCase() === query.model.toLowerCase()) {
      score = Math.min(1.0, score + 0.05);
    }
  }
  return score;
}

export function scoreIssueRelevance(query: RankingQuery, item: KnowledgeItem): number {
  if (query.issue_category !== null) {
    // Exact match only; non-matching items are already filtered out upstream
    return item.issue_category === query.issue_category ? 1.0 : 0.0;
  }
  // No category — fall back to keyword overlap with symptom + causes
  const itemText = [item.symptom, ...item.likely_causes].join(' ');
  return keywordOverlap(query.symptom_description, itemText);
}

export function scoreRecency(updated_at: string, nowMs: number = Date.now()): number {
  const yearsOld = (nowMs - new Date(updated_at).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  for (const band of RECENCY_BANDS) {
    if (yearsOld <= band.maxYears) return band.score;
  }
  return RECENCY_FALLBACK;
}

export function scoreEvidenceStrength(strength: EvidenceStrength): number {
  return EVIDENCE_STRENGTH_SCORES[strength] ?? 0.2;
}

export function scoreAlreadyCheckedPenalty(query: RankingQuery, item: KnowledgeItem): number {
  if (query.already_checked.length === 0) return 0;
  const checked = query.already_checked.map(s => s.toLowerCase());
  const actions = [...item.corrective_actions, ...item.diagnostics].map(s => s.toLowerCase());
  const hasOverlap = actions.some(a => checked.some(c => a.includes(c) || c.includes(a)));
  return hasOverlap ? CHECKED_PENALTY : 0;
}

// Word intersection score: overlap of words >3 chars / total distinct words in b, capped at 0.8
export function keywordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wordsB = b.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (wordsB.length === 0) return 0;
  const overlap = wordsB.filter(w => wordsA.has(w)).length;
  return Math.min(0.8, overlap / wordsB.length);
}

// --- Composite scorer ---

export function scoreItem(
  query: RankingQuery,
  item: KnowledgeItem,
  agreement_bonus: number = 0,
  nowMs: number = Date.now(),
): ScoreBreakdown {
  const source_authority        = scoreSourceAuthority(item.source_id);
  const technique_relevance     = scoreTechniqueRelevance(query, item);
  const issue_relevance         = scoreIssueRelevance(query, item);
  const recency                 = scoreRecency(item.updated_at, nowMs);
  const evidence_strength       = scoreEvidenceStrength(item.evidence_strength);
  const already_checked_penalty = scoreAlreadyCheckedPenalty(query, item);

  const weighted =
    SCORE_WEIGHTS.SOURCE_AUTHORITY    * source_authority +
    SCORE_WEIGHTS.TECHNIQUE_RELEVANCE * technique_relevance +
    SCORE_WEIGHTS.ISSUE_RELEVANCE     * issue_relevance +
    SCORE_WEIGHTS.RECENCY             * recency +
    SCORE_WEIGHTS.EVIDENCE_STRENGTH   * evidence_strength;

  const total = Math.max(0, Math.min(1, weighted + agreement_bonus - already_checked_penalty));

  return {
    item_id: item.id,
    source_authority,
    technique_relevance,
    issue_relevance,
    recency,
    evidence_strength,
    agreement_bonus,
    already_checked_penalty,
    total,
  };
}

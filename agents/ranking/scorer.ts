import type { KnowledgeItem, EvidenceStrength, EvidenceClassification, EvidenceTier } from '@/lib/types';
import type { ScoreBreakdown, ScoreBreakdownV2, RankingQuery, RankingQueryV2 } from './types';
import {
  SCORE_WEIGHTS,
  VENDOR_SOURCE_PREFIXES,
  EVIDENCE_STRENGTH_SCORES,
  RECENCY_BANDS,
  RECENCY_FALLBACK,
  CHECKED_PENALTY,
} from './weights';
import { classifySource, tierToAuthorityScore } from '@/lib/evidence-hierarchy';

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

// --- V2 Source Authority (7-tier hierarchy) ---

export function scoreSourceAuthorityV2(
  source_id: string,
  query_vendor: string | null,
  query_model: string | null,
): { score: number; classification: EvidenceClassification; tier: EvidenceTier } {
  const { tier, classification } = classifySource(source_id, query_vendor, query_model);
  return { score: tierToAuthorityScore(tier), classification, tier };
}

// --- V2 Composite scorer ---

export function scoreItemV2(
  query: RankingQueryV2,
  item: KnowledgeItem,
  agreement_bonus: number = 0,
  nowMs: number = Date.now(),
): ScoreBreakdownV2 {
  const authorityResult         = scoreSourceAuthorityV2(item.source_id, query.vendor, query.model);
  const source_authority        = authorityResult.score;
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

  // V5 additive bonuses
  const matrixBonus = scoreMatrixRelevance(query, item);
  const columnBonus = scoreColumnAgeFactor(query, item);
  const sstBonus = scoreSSTContext(query, item);

  const total = Math.max(0, Math.min(1, weighted + agreement_bonus - already_checked_penalty + matrixBonus + columnBonus + sstBonus));

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
    evidence_classification: authorityResult.classification,
    confidence_caps: [],  // populated at ranking level
  };
}

// --- V5 Scoring Extensions (additive bonuses) ---

/** Matrix-specific issue relevance boost */
export function scoreMatrixRelevance(query: RankingQueryV2, item: KnowledgeItem): number {
  if (!query.sample_matrix_type) return 0;
  const matrixKeywords: Record<string, string[]> = {
    plasma:             ['ion suppression', 'matrix effect', 'phospholipid', 'protein precipitation', 'endogenous'],
    serum:              ['ion suppression', 'matrix effect', 'phospholipid', 'protein'],
    urine:              ['ion suppression', 'matrix', 'salt', 'urea'],
    whole_blood:        ['hemolysis', 'ion suppression', 'protein', 'matrix'],
    soil:               ['humic acid', 'matrix effect', 'extraction', 'interference'],
    water:              ['trace', 'ppb', 'preconcentration', 'matrix'],
    food:               ['fat', 'matrix effect', 'cleanup', 'QuEChERS', 'interference'],
    API:                ['impurity', 'degradation', 'stability', 'purity'],
    formulation:        ['excipient', 'interference', 'extraction', 'dissolution'],
    environmental:      ['trace', 'interference', 'preconcentration', 'matrix'],
    biological_tissue:  ['homogenization', 'extraction', 'matrix effect', 'protein'],
  };
  const keywords = matrixKeywords[query.sample_matrix_type] ?? [];
  if (keywords.length === 0) return 0;
  const itemText = [...item.likely_causes, ...item.diagnostics, item.symptom].join(' ').toLowerCase();
  return keywords.some(kw => itemText.includes(kw)) ? 0.1 : 0;
}

/** Column age degradation boost when injection count is high */
export function scoreColumnAgeFactor(query: RankingQueryV2, item: KnowledgeItem): number {
  if (!query.column_injection_count || query.column_injection_count < 1000) return 0;
  const degradationKeywords = ['column degradation', 'void volume', 'backpressure', 'peak shape', 'column life', 'frit', 'column bed'];
  const itemText = [...item.likely_causes, item.symptom].join(' ').toLowerCase();
  return degradationKeywords.some(kw => itemText.includes(kw)) ? 0.08 : 0;
}

/** SST-informed issue boost based on system suitability test data */
export function scoreSSTContext(query: RankingQueryV2, item: KnowledgeItem): number {
  let bonus = 0;
  const itemText = [...item.likely_causes, item.symptom, item.issue_category].join(' ').toLowerCase();

  if (query.sst_tailing_factor && query.sst_tailing_factor > 2.0) {
    if (itemText.includes('tailing') || itemText.includes('peak shape') || itemText.includes('silanol')) bonus += 0.05;
  }
  if (query.sst_plates && query.sst_plates < 2000) {
    if (itemText.includes('efficiency') || itemText.includes('plate') || itemText.includes('column') || itemText.includes('band broadening')) bonus += 0.05;
  }
  if (query.sst_resolution && query.sst_resolution < 1.5) {
    if (itemText.includes('resolution') || itemText.includes('selectivity') || itemText.includes('separation')) bonus += 0.05;
  }
  if (query.sst_rsd_percent && query.sst_rsd_percent > 2.0) {
    if (itemText.includes('precision') || itemText.includes('reproducibility') || itemText.includes('injection') || itemText.includes('autosampler')) bonus += 0.05;
  }

  return Math.min(0.1, bonus);
}

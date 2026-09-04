import type { KnowledgeItem, Technique } from '@/lib/types';

export interface RankingQuery {
  technique: Technique;
  vendor: string | null;           // e.g. "Agilent", "Waters"
  model: string | null;            // e.g. "1290 Infinity"
  issue_category: string | null;   // null = auto-detect from symptom_description
  symptom_description: string;
  method_conditions: string | null;
  already_checked: string[];       // steps already tried by the user
}

export interface ScoreBreakdown {
  item_id: string;
  source_authority: number;
  technique_relevance: number;
  issue_relevance: number;
  recency: number;
  evidence_strength: number;
  agreement_bonus: number;
  already_checked_penalty: number;
  total: number;                   // clamped 0–1
}

export interface ScoredItem {
  item: KnowledgeItem;
  score: ScoreBreakdown;
}

export type ConfidenceTier = 'highly_likely' | 'plausible' | 'low_confidence';

export interface TieredItem {
  item: KnowledgeItem;
  score: ScoreBreakdown;
  tier: ConfidenceTier;
}

export interface TieredResults {
  highly_likely: TieredItem[];
  plausible: TieredItem[];
  low_confidence: TieredItem[];
  contradictions: string[];
}

// ─── V2 Types ────────────────────────────────────────────────────────

import type { EvidenceClassification, SampleMatrixType } from '@/lib/types';

/** Extended query with additional technical context fields */
export interface RankingQueryV2 extends RankingQuery {
  analyte?: string | null;
  sample_matrix?: string | null;
  column?: string | null;
  mobile_phase?: string | null;
  flow_rate?: string | null;
  injection_volume?: string | null;
  gradient?: string | null;
  retention_time?: string | null;
  ionization_mode?: string | null;
  source_params?: string | null;
  acquisition_mode?: string | null;
  recent_maintenance?: string | null;
  qc_results?: string | null;
  expected_result?: string | null;
  // V5: System Suitability Test data
  sst_plates?: number | null;
  sst_tailing_factor?: number | null;
  sst_resolution?: number | null;
  sst_rsd_percent?: number | null;
  // V5: Sample matrix type
  sample_matrix_type?: SampleMatrixType | null;
  // V5: Column tracking
  column_injection_count?: number | null;
  // V5: Method transfer mode
  is_method_transfer?: boolean;
  source_instrument?: string | null;
  source_vendor?: string | null;
  source_model?: string | null;
}

export interface ScoreBreakdownV2 extends ScoreBreakdown {
  evidence_classification: EvidenceClassification;
  confidence_caps: string[];
}

export type ConfidenceTierV2 =
  | 'insufficient_evidence'       // 0–0.39
  | 'preliminary_hypothesis'      // 0.40–0.59
  | 'probable_cause'              // 0.60–0.79
  | 'strongly_supported'          // 0.80–0.94
  | 'confirmed';                  // 0.95–1.00

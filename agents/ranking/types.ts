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

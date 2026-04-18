import type { Technique, Severity, EvidenceStrength } from '@/lib/types';

export type SourceType = 'vendor' | 'scientific' | 'community';

// --- Adapter layer ---

export interface AdapterFetchQuery {
  techniques: Technique[];
  issue_categories: string[];
  since: string | null; // ISO 8601 — skip if source unchanged since this date
}

export interface RawFetchedItem {
  source_id: string;
  source_type: SourceType;
  source_title: string;
  source_url: string;
  raw_content: string;          // JSON string for mocks; HTML/text for real adapters
  publication_date: string | null;
  fetched_at: string;           // ISO 8601
}

// --- Extraction output ---

export interface ExtractedItem {
  technique: Technique;
  instrument_family: string;
  model: string | null;
  issue_category: string;
  symptom: string;
  likely_causes: string[];
  diagnostics: string[];
  corrective_actions: string[];
  severity: Severity;
  escalation_conditions: string[];
  tags: string[];
  // Source fields carried forward
  source_id: string;
  source_type: SourceType;
  source_title: string;
  source_url: string;
  publication_date: string | null;
  fetched_at: string;
}

// --- Source quality scoring (per source-policy.md) ---

export interface SourceQualityScore {
  source_id: string;
  vendor_authority: number;        // 0–1
  scientific_credibility: number;  // 0–1
  specificity: number;             // 0–1
  recency: number;                 // 0–1
  popularity_signal: number;       // 0–1, weak signal only (capped contribution)
  composite: number;               // 0–1 weighted; popularity never outweighs authority
}

// --- Fully processed item ready for storage ---

export interface AcquiredItem {
  // Knowledge fields (aligned with KnowledgeItem)
  id: string;
  technique: Technique;
  instrument_family: string;
  model: string | null;
  issue_category: string;
  symptom: string;
  likely_causes: string[];
  diagnostics: string[];
  corrective_actions: string[];
  severity: Severity;
  escalation_conditions: string[];

  // Source traceability
  source_id: string;
  source_type: SourceType;
  source_title: string;
  source_url: string;
  publication_date: string | null;

  // Scores
  confidence_score: number;
  evidence_strength: EvidenceStrength;
  source_quality_score: number;

  // Timestamps
  extracted_at: string;           // when this item was extracted from source
  monthly_refresh_at: string;     // when last included in a monthly run
  updated_at: string;

  // Metadata
  tags: string[];
  version: number;                // increments on each update
  is_deprecated: boolean;
  contradiction_flags: string[];  // IDs of items that contradict this one
}

// --- Pipeline run bookkeeping ---

export interface PipelineRunStats {
  run_date: string;
  sources_checked: number;
  sources_skipped_unchanged: number;
  items_fetched: number;
  items_extracted: number;
  items_new: number;
  items_updated: number;
  items_duplicate: number;
  items_deprecated: number;
  items_skipped_weak_source: number;  // rejected by quality threshold
  contradictions_found: string[];
  knowledge_gaps: string[];
  errors: string[];
}

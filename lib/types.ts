// Core shared types derived from docs/output-schemas.md

export type Technique = 'LCMS' | 'HPLC' | 'GC' | 'GCMS' | 'UHPLC' | 'IC' | 'CE' | 'SFC' | 'TGA' | 'DSC' | 'FPLC' | 'SPPS' | 'XRD' | 'DLS' | 'Titration' | 'KF' | 'KFO' | 'CD' | 'SEM' | 'Sputter' | 'BET' | 'SECMALS' | 'TEM' | 'Raman' | 'ssNMR' | 'NMR' | 'PrepLC';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'anecdotal';

export interface KnowledgeItem {
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
  source_id: string;
  confidence_score: number; // 0–1
  evidence_strength: EvidenceStrength;
  updated_at: string; // ISO 8601
  deleted_at?: string | null; // ISO 8601 — soft delete timestamp
}

export interface EvidenceSummary {
  source_id: string;
  excerpt: string;
  evidence_strength: EvidenceStrength;
}

export interface RankedAnswer {
  problem_summary: string;
  likely_causes: string[];
  checks: string[];
  corrective_actions: string[];
  stop_conditions: string[];
  confidence: number; // 0–1
  evidence_summary: EvidenceSummary[];
  uncertainties: string[];
  next_questions: string[];
}

export interface MonthlyUpdateReport {
  run_date: string;
  new_sources: number;
  updated_sources: number;
  deprecated_items: number;
  conflicts_found: string[];
  knowledge_gaps: string[];
}

export interface TroubleshootingQuery {
  technique: Technique;
  instrument_family: string | null;
  model: string | null;
  issue_category: string;
  symptom_description: string;
}

export type ReportStatus = 'pending' | 'resolved' | 'partially' | 'not_resolved';

export interface LabReport {
  id: string;
  created_at: string;         // ISO 8601
  technique: string;
  vendor: string | null;
  model: string | null;
  issue_category: string | null;
  symptom_description: string;
  confidence: number;         // 0–1
  ai_assisted: boolean;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_at: string | null; // ISO 8601
}

export interface AnalyticsSummary {
  total: number;
  resolved: number;
  partially: number;
  not_resolved: number;
  pending: number;
  avg_confidence: number;
  ai_assisted_count: number;
  by_technique: Record<string, number>;
  by_day: { date: string; count: number }[];
}

// ─── V2 Types: Evidence Hierarchy & Structured Reports ───────────────

/** 7-tier evidence hierarchy (1 = highest authority) */
export type EvidenceTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type EvidenceClassification =
  | 'exact-model'                    // Tier 1: manufacturer doc for this exact model
  | 'instrument-family'              // Tier 2: manufacturer doc for instrument family
  | 'regulatory-standard'            // Tier 3: ICH, USP, FDA, EMA, ISO
  | 'peer-reviewed'                  // Tier 4: peer-reviewed publication
  | 'verified-technical'             // Tier 5: application note, tech note
  | 'general-manufacturer-independent' // Tier 6: general lab best-practice
  | 'ai-inference';                  // Tier 7: AI-generated (labeled)

export interface SourceMetadata {
  title: string;
  manufacturer_or_org: string | null;
  doc_number: string | null;
  pub_date: string | null;           // ISO 8601
  url: string | null;
  page_or_section: string | null;
  classification: EvidenceClassification;
  tier: EvidenceTier;
}

export interface EvidenceSummaryV2 extends EvidenceSummary {
  source_metadata: SourceMetadata | null;
  classification: EvidenceClassification;
}

// ─── Missing Info Detection ──────────────────────────────────────────

export type MissingInfoField =
  | 'manufacturer' | 'model' | 'hardware_config'
  | 'analyte' | 'sample_matrix' | 'column' | 'mobile_phase'
  | 'flow_rate' | 'injection_volume' | 'gradient' | 'retention_time'
  | 'ionization_mode' | 'source_params' | 'acquisition_mode'
  | 'recent_maintenance' | 'qc_results' | 'raw_data'
  | 'chromatographic_method' | 'expected_result';

export interface MissingInfoResult {
  missing_fields: MissingInfoField[];
  critical_missing: MissingInfoField[];   // subset that triggers confidence cap
  follow_up_questions: string[];
}

// ─── Structured Report & Hypotheses ──────────────────────────────────

export interface Hypothesis {
  rank: number;
  cause: string;
  probability: 'high' | 'medium' | 'low';
  supporting_evidence: string[];
  contradicting_evidence: string[];
  diagnostic_test: string;
  expected_result: string;
  status: 'suspected' | 'confirmed';
}

export type ConfidenceLabelV2 =
  | 'Insufficient evidence'      // 0–39%
  | 'Preliminary hypothesis'     // 40–59%
  | 'Probable cause'             // 60–79%
  | 'Strongly supported'         // 80–94%
  | 'Confirmed';                 // 95–100% (direct diagnostic evidence only)

export interface ConfidenceBreakdown {
  raw_score: number;
  caps_applied: string[];            // e.g. "Missing critical method info: max 60%"
  final_score: number;
  label: ConfidenceLabelV2;
  factor_scores: {
    source_authority: number;
    technique_relevance: number;
    issue_relevance: number;
    recency: number;
    evidence_strength: number;
  };
  explanation: string;
}

/** Extended answer with structured report sections (backwards-compatible superset of RankedAnswer) */
export interface RankedAnswerV2 extends RankedAnswer {
  missing_information: MissingInfoResult;
  hypotheses: Hypothesis[];
  immediate_checks: string[];
  verification_steps: string[];
  escalation_criteria: string[];
  sources_with_metadata: EvidenceSummaryV2[];
  confidence_breakdown: ConfidenceBreakdown;
  method_dependent_flags: string[];
  printable_checklist: string[];
  reported_observations: string[];
  confirmed_evidence: string[];
  remaining_uncertainty: string[];
}

// Core shared types derived from docs/output-schemas.md

export type Technique = 'LCMS' | 'HPLC' | 'GC' | 'GCMS' | 'UHPLC' | 'IC' | 'CE' | 'SFC' | 'TGA' | 'DSC' | 'FPLC';
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

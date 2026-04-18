import type { EvidenceSummary } from '@/lib/types';

export type PresentationMode = 'concise' | 'standard' | 'deep' | 'manager' | 'json';

export interface TextOutput {
  mode: 'concise' | 'standard' | 'deep';
  text: string;
}

// Structured fields + rendered text for direct UI binding
export interface ManagerOutput {
  mode: 'manager';
  issue_summary: string;
  urgency: string;
  data_quality_risk: string;
  recommended_action: string;
  text: string;
}

export type ConfidenceLabel = 'high' | 'medium' | 'low' | 'insufficient';

// Clean payload for API consumers; no markdown
export interface JsonApiPayload {
  mode: 'json';
  formatted_at: string;
  problem_summary: string;
  confidence: number;
  confidence_label: ConfidenceLabel;
  likely_causes: string[];
  checks: string[];
  corrective_actions: string[];
  stop_conditions: string[];
  evidence_summary: EvidenceSummary[];
  uncertainties: string[];
  next_questions: string[];
}

export type FormattedOutput = TextOutput | ManagerOutput | JsonApiPayload;

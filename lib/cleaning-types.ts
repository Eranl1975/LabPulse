// Cleaning Procedure types — shared between API, AI generator, and UI

export type CleaningSourceType =
  | 'official_manufacturer'
  | 'manufacturer_documentation'
  | 'ai_generated';

export interface CleaningProcedureStep {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
  warnings?: string[];
}

export interface CleaningMaterial {
  name: string;
  specification?: string;
  purpose: string;
}

export interface CleaningFrequency {
  routine: string;
  after_contamination: string;
  preventive: string;
}

export interface CleaningProcedureContent {
  instrument: string;
  manufacturer: string;
  model: string;
  source_type: CleaningSourceType;
  source_label: string;       // human-readable label for source_type
  source_url: string | null;  // null if AI-generated
  source_title: string | null;
  confidence: number;         // 0–1
  confidence_note: string;

  materials_needed: CleaningMaterial[];
  before_cleaning: string[];
  cleaning_steps: CleaningProcedureStep[];
  after_cleaning: string[];
  what_not_to_do: string[];
  cleaning_frequency: CleaningFrequency;
  safety_warnings: string[];
  notes: string[];
}

export interface CleaningProcedureRequest {
  technique: string;
  vendor?: string | null;
  model?: string | null;
  refresh?: boolean;
}

export interface CleaningProcedureResponse {
  procedure: CleaningProcedureContent;
  source_type: CleaningSourceType;
  cached: boolean;
  generated_at: string;
  ai_model_used?: string;
}

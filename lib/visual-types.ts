// Types for Visual Troubleshooting: what the vision model saw, what the web
// research found, and how each source is labelled. Kept apart from lib/types.ts
// so the browser can import them without pulling in server code.

import type { AIStatus, AIErrorCode, EvidenceTier } from './types';

/** The four labels every recommendation and source carries (section 8 of the spec). */
export type EvidenceLabel =
  | 'OFFICIAL MANUFACTURER GUIDANCE'
  | 'LABPULSE INTERNAL KNOWLEDGE'
  | 'TECHNICAL / SCIENTIFIC SOURCE'
  | 'AI-GENERATED RECOMMENDATION';

export type MediaKind = 'photo' | 'frame';

/** A finding's confidence below this value is shown as "low confidence", never as fact. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export interface OcrText {
  text: string;
  confidence: number;
  /** Index into VisualFindings.media. */
  image_index: number | null;
  low_confidence: boolean;
}

export interface IdentifiedComponent {
  name: string;
  confidence: number;
  image_index: number | null;
  low_confidence: boolean;
}

export interface VisualObservation {
  description: string;
  /** leak | disconnection | damage | warning_light | abnormal_reading | contamination | other */
  category: string;
  confidence: number;
  image_index: number | null;
  /** True when the model flagged a hazard (solvent near electronics, HV, hot zone, pressure). */
  hazard: boolean;
  low_confidence: boolean;
}

export interface InstrumentConsistency {
  /** consistent | mismatch | unclear */
  status: 'consistent' | 'mismatch' | 'unclear';
  explanation: string;
}

export interface VisualUncertainty {
  what: string;
  better_photo: string | null;
}

/** One image or key frame that was analysed. Thumbnails are added by the browser. */
export interface VisualMediaRef {
  kind: MediaKind;
  label: string;
  /** Seconds into the video, for key frames. */
  frame_time?: number | null;
  /** Small JPEG data URL (≤ ~60 KB), set client-side for the report, PDF and email. */
  thumbnail?: string | null;
  /** Object path in the private visual-media bucket, when the user chose to keep it. */
  storage_path?: string | null;
}

/** Validated output of the single multimodal call. */
export interface VisualAnalysis {
  ocr_text: OcrText[];
  components: IdentifiedComponent[];
  observations: VisualObservation[];
  instrument_consistency: InstrumentConsistency;
  uncertainties: VisualUncertainty[];
  summary: string;
}

export type WebResearchStatus =
  | 'ok' | 'no_results' | 'skipped_no_key' | 'skipped_no_ai' | 'error' | 'timeout';

/** Source priority 1–7 from section 7 of the spec (1 = official manufacturer documentation). */
export type WebSourcePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  /** One or two sentences written by the model from the page; null when only the search hit is known. */
  summary: string | null;
  priority: WebSourcePriority;
  /** Human-readable category, e.g. "Official manufacturer documentation", "Professional forum (unverified)". */
  category: string;
  tier: EvidenceTier;
  label: EvidenceLabel;
  page_age: string | null;
}

export interface InternalReference {
  title: string;
  url: string | null;
  kind: 'manual' | 'cleaning_procedure';
  /**
   * False when LabPulse only holds the citation (title + link) and has not read
   * the document — many Agilent/Restek manuals are behind a WAF that blocks fetching.
   */
  content_read: boolean;
  /**
   * v8.2: `cited` — a passage is quoted in this report; `stored` — LabPulse holds
   * the text but no passage matched this problem; `title_only` — only the title
   * and link are held. Absent on reports saved before v8.2.
   */
  content_status?: 'cited' | 'stored' | 'title_only';
  label: EvidenceLabel;
}

export interface VisualStatus {
  vision_status: AIStatus;
  vision_error_code: AIErrorCode | null;
  vision_reason: string | null;
  vision_model: string | null;
  web_status: WebResearchStatus;
  web_reason: string | null;
  web_queries: string[];
  /** True when a stage was cut short to stay inside the 60 s function limit. */
  partial: boolean;
  notices: string[];
}

/** V8: optional section added to RankedAnswerV2 by the visual route. */
export interface VisualFindings {
  media: VisualMediaRef[];
  user_description: string | null;
  analysis: VisualAnalysis | null;
  /** Safety steps that must be done before any troubleshooting action. */
  safety_first: string[];
  internal_references: InternalReference[];
  web_sources: WebSource[];
  status: VisualStatus;
  /** Label for the recommendations in this report (derived from how they were produced). */
  recommendations_label: EvidenceLabel;
}

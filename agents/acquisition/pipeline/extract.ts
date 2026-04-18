// Extraction stage: parse RawFetchedItem.raw_content into ExtractedItem.
// Mock adapters emit pre-structured JSON — real adapters will need domain-specific parsing.

import type { RawFetchedItem, ExtractedItem } from '../types';
import type { Technique, Severity } from '@/lib/types';

const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS']);
const VALID_SEVERITIES  = new Set<Severity>(['low', 'medium', 'high', 'critical']);

function isValidTechnique(v: unknown): v is Technique {
  return typeof v === 'string' && VALID_TECHNIQUES.has(v as Technique);
}

function isValidSeverity(v: unknown): v is Severity {
  return typeof v === 'string' && VALID_SEVERITIES.has(v as Severity);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

// Returns null if extraction fails — caller logs and skips.
export function extractItem(raw: RawFetchedItem): ExtractedItem | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.raw_content);
  } catch {
    // TODO: for real adapters, implement HTML/PDF text extraction here
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  if (!isValidTechnique(p.technique))    return null;
  if (typeof p.symptom !== 'string')     return null;
  if (typeof p.issue_category !== 'string') return null;

  return {
    technique:          p.technique,
    instrument_family:  typeof p.instrument_family === 'string' ? p.instrument_family : 'generic',
    model:              typeof p.model === 'string' ? p.model : null,
    issue_category:     p.issue_category,
    symptom:            p.symptom,
    likely_causes:      toStringArray(p.likely_causes),
    diagnostics:        toStringArray(p.diagnostics),
    corrective_actions: toStringArray(p.corrective_actions),
    severity:           isValidSeverity(p.severity) ? p.severity : 'medium',
    escalation_conditions: toStringArray(p.escalation_conditions),
    tags:               toStringArray(p.tags),
    // Source fields
    source_id:          raw.source_id,
    source_type:        raw.source_type,
    source_title:       raw.source_title,
    source_url:         raw.source_url,
    publication_date:   raw.publication_date,
    fetched_at:         raw.fetched_at,
  };
}

// Normalization stage: clean and standardize ExtractedItem → AcquiredItem.
// Generates a stable ID and sets initial version/timestamps.

import type { ExtractedItem, AcquiredItem, SourceQualityScore } from '../types';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

// Stable ID: technique--issue_category--source_id
export function generateId(technique: string, issue_category: string, source_id: string): string {
  return `${slug(technique)}--${slug(issue_category)}--${slug(source_id)}`;
}

function deriveEvidenceStrength(source_quality: number): 'strong' | 'moderate' | 'weak' | 'anecdotal' {
  if (source_quality >= 0.75) return 'strong';
  if (source_quality >= 0.50) return 'moderate';
  if (source_quality >= 0.30) return 'weak';
  return 'anecdotal';
}

export function normalizeItem(
  item: ExtractedItem,
  quality: SourceQualityScore,
  runDate: string,
  existingVersion: number = 0,
): AcquiredItem {
  const id = generateId(item.technique, item.issue_category, item.source_id);
  const now = new Date().toISOString();

  return {
    id,
    technique:          item.technique,
    instrument_family:  item.instrument_family.trim() || 'generic',
    model:              item.model?.trim() || null,
    issue_category:     item.issue_category.trim(),
    symptom:            item.symptom.trim(),
    likely_causes:      dedup(item.likely_causes),
    diagnostics:        dedup(item.diagnostics),
    corrective_actions: dedup(item.corrective_actions),
    severity:           item.severity,
    escalation_conditions: dedup(item.escalation_conditions),
    // Source
    source_id:          item.source_id,
    source_type:        item.source_type,
    source_title:       item.source_title.trim(),
    source_url:         item.source_url.trim(),
    publication_date:   item.publication_date,
    // Scores
    confidence_score:      parseFloat(quality.composite.toFixed(3)),
    evidence_strength:     deriveEvidenceStrength(quality.composite),
    source_quality_score:  quality.composite,
    // Timestamps
    extracted_at:          item.fetched_at,
    monthly_refresh_at:    runDate,
    updated_at:            now,
    // Metadata
    tags:                  dedup(item.tags),
    version:               existingVersion + 1,
    is_deprecated:         false,
    contradiction_flags:   [],
  };
}

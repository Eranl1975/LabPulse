// Source quality scoring — per source-policy.md.
// Popularity is a weak signal only and is capped to prevent it overriding authority.

import type { ExtractedItem, SourceQualityScore } from '../types';

// Weights sum to 1.0. Popularity contribution is capped at MAX_POPULARITY_CONTRIBUTION.
const WEIGHTS = {
  vendor_authority:       0.30,
  scientific_credibility: 0.25,
  specificity:            0.25,
  recency:                0.15,
  popularity_signal:      0.05,
} as const;

const MAX_POPULARITY_CONTRIBUTION = 0.05; // never outweighs authority

const VENDOR_PREFIXES = [
  'agilent', 'waters', 'thermo', 'shimadzu', 'sciex',
  'perkinelmer', 'restek', 'merck', 'sigma', 'phenomenex', 'supelco',
];

function scoreVendorAuthority(source_id: string, source_type: string): number {
  const lower = source_id.toLowerCase();
  if (VENDOR_PREFIXES.some(p => lower.startsWith(p))) return 1.0;
  if (source_type === 'scientific') return 0.5;
  return 0.1; // community
}

function scoreScientificCredibility(source_type: string, source_id: string): number {
  if (source_type === 'vendor') return 0.9;
  if (source_type === 'scientific') return 1.0;
  const lower = source_id.toLowerCase();
  if (['journal', 'review', 'paper', 'publication'].some(w => lower.includes(w))) return 0.8;
  return 0.2; // community forum
}

function scoreSpecificity(item: ExtractedItem): number {
  let score = 0.3; // base
  if (item.instrument_family && item.instrument_family !== 'generic') score += 0.2;
  if (item.model) score += 0.15;
  if (item.likely_causes.length >= 3) score += 0.15;
  if (item.corrective_actions.length >= 2) score += 0.1;
  if (item.diagnostics.length >= 2) score += 0.1;
  return Math.min(1.0, score);
}

function scoreRecency(publication_date: string | null, nowMs: number = Date.now()): number {
  if (!publication_date) return 0.5; // unknown date: neutral
  const yearsOld = (nowMs - new Date(publication_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (yearsOld <= 1) return 1.0;
  if (yearsOld <= 2) return 0.85;
  if (yearsOld <= 3) return 0.70;
  if (yearsOld <= 5) return 0.50;
  return 0.30;
}

// popularity_signal: pass-in externally; 0.0 = no data.
// Kept separate so callers can provide it without the score module fetching anything.
export function scoreSourceQuality(
  item: ExtractedItem,
  popularity_signal: number = 0.0,
  nowMs: number = Date.now(),
): SourceQualityScore {
  const vendor_authority       = scoreVendorAuthority(item.source_id, item.source_type);
  const scientific_credibility = scoreScientificCredibility(item.source_type, item.source_id);
  const specificity            = scoreSpecificity(item);
  const recency                = scoreRecency(item.publication_date, nowMs);
  const pop                    = Math.min(1.0, Math.max(0, popularity_signal));

  const composite = Math.min(1.0,
    WEIGHTS.vendor_authority       * vendor_authority +
    WEIGHTS.scientific_credibility * scientific_credibility +
    WEIGHTS.specificity            * specificity +
    WEIGHTS.recency                * recency +
    Math.min(MAX_POPULARITY_CONTRIBUTION, WEIGHTS.popularity_signal * pop),
  );

  return {
    source_id:              item.source_id,
    vendor_authority,
    scientific_credibility,
    specificity,
    recency,
    popularity_signal: pop,
    composite: parseFloat(composite.toFixed(3)),
  };
}

// Exported for testing individual factors
export { scoreVendorAuthority, scoreScientificCredibility, scoreSpecificity, scoreRecency };

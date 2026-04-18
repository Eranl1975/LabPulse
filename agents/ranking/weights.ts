// All scoring weights and thresholds in one place — no hidden constants elsewhere.

export const SCORE_WEIGHTS = {
  SOURCE_AUTHORITY:    0.25,
  TECHNIQUE_RELEVANCE: 0.20,
  ISSUE_RELEVANCE:     0.25,
  RECENCY:             0.10,
  EVIDENCE_STRENGTH:   0.20,
} as const;

// Tier thresholds (inclusive lower bound)
export const TIER_THRESHOLDS = {
  HIGHLY_LIKELY: 0.70,
  PLAUSIBLE:     0.45,
} as const;

export const AGREEMENT_BONUS  = 0.05;  // per item when a cause appears in 2+ items
export const CHECKED_PENALTY  = 0.15;  // when all corrective actions are already tried

export const VENDOR_SOURCE_PREFIXES = [
  'agilent', 'waters', 'thermo', 'shimadzu', 'sciex',
  'perkinelmer', 'restek', 'merck', 'sigma', 'phenomenex', 'supelco',
] as const;

export const EVIDENCE_STRENGTH_SCORES: Record<string, number> = {
  strong:    1.0,
  moderate:  0.7,
  weak:      0.4,
  anecdotal: 0.2,
};

// Recency bands: items older than maxYears get the listed score
export const RECENCY_BANDS = [
  { maxYears: 1, score: 1.00 },
  { maxYears: 2, score: 0.85 },
  { maxYears: 3, score: 0.70 },
  { maxYears: 4, score: 0.55 },
] as const;

export const RECENCY_FALLBACK = 0.40;

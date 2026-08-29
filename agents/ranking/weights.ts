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
  'ta-instruments', 'cytiva', 'csbio', 'cem-corporation', 'biotage',
  'netzsch', 'mettler', 'bruker', 'dionex',
  'metrohm', 'malvern', 'rigaku', 'anton-paar',
  // Physical characterization instruments (v3.0)
  'jasco', 'denton-vacuum', 'micromeritics',
  // Spectroscopy / NMR / SEC-MALS / TEM (v3.1)
  'wyatt', 'tosoh', 'renishaw', 'horiba', 'jeol',
  // KNAUER LC (v3.3)
  'knauer',
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

// ─── V2 Constants ────────────────────────────────────────────────────

/** Confidence caps applied when context is insufficient (Section 4) */
export const CONFIDENCE_CAPS = {
  MISSING_CRITICAL_INFO:         0.60,
  NO_EXACT_MODEL_SOURCE:         0.70,
  SYMPTOMS_ONLY:                 0.50,
  CONFLICTING_EVIDENCE_REDUCTION: 0.15,  // subtracted from raw score
} as const;

/** 5-level confidence tier thresholds (inclusive lower bound) */
export const TIER_THRESHOLDS_V2 = {
  CONFIRMED:              0.95,
  STRONGLY_SUPPORTED:     0.80,
  PROBABLE_CAUSE:         0.60,
  PRELIMINARY_HYPOTHESIS: 0.40,
} as const;

/** Evidence tier → source authority score mapping (7-tier hierarchy) */
export const EVIDENCE_TIER_SCORES: Record<number, number> = {
  1: 1.00,  // exact-model manufacturer docs
  2: 0.90,  // instrument-family manufacturer docs
  3: 0.85,  // regulatory standards
  4: 0.75,  // peer-reviewed publications
  5: 0.60,  // verified technical docs
  6: 0.45,  // general manufacturer-independent
  7: 0.30,  // AI-generated inference
};

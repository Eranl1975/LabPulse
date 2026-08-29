import type { ScoredItem, TieredItem, ConfidenceTier, ConfidenceTierV2, TieredResults } from './types';
import type { ConfidenceLabelV2 } from '@/lib/types';
import { TIER_THRESHOLDS, TIER_THRESHOLDS_V2 } from './weights';
import { detectContradictions } from './contradiction-detector';

export function getTier(total: number): ConfidenceTier {
  if (total >= TIER_THRESHOLDS.HIGHLY_LIKELY) return 'highly_likely';
  if (total >= TIER_THRESHOLDS.PLAUSIBLE)     return 'plausible';
  return 'low_confidence';
}

export function tierResults(scored: ScoredItem[]): TieredResults {
  const tiered: TieredItem[] = scored.map(s => ({
    ...s,
    tier: getTier(s.score.total),
  }));

  const contradictions = detectContradictions(scored.map(s => s.item))
    .map(c => c.description);

  return {
    highly_likely: tiered.filter(t => t.tier === 'highly_likely'),
    plausible:     tiered.filter(t => t.tier === 'plausible'),
    low_confidence: tiered.filter(t => t.tier === 'low_confidence'),
    contradictions,
  };
}

// ─── V2 Tiering (5-level) ───────────────────────────────────────────

export function getTierV2(total: number): ConfidenceTierV2 {
  if (total >= TIER_THRESHOLDS_V2.CONFIRMED)              return 'confirmed';
  if (total >= TIER_THRESHOLDS_V2.STRONGLY_SUPPORTED)     return 'strongly_supported';
  if (total >= TIER_THRESHOLDS_V2.PROBABLE_CAUSE)         return 'probable_cause';
  if (total >= TIER_THRESHOLDS_V2.PRELIMINARY_HYPOTHESIS) return 'preliminary_hypothesis';
  return 'insufficient_evidence';
}

export function getConfidenceLabelV2(score: number): ConfidenceLabelV2 {
  if (score >= 0.95) return 'Confirmed';
  if (score >= 0.80) return 'Strongly supported';
  if (score >= 0.60) return 'Probable cause';
  if (score >= 0.40) return 'Preliminary hypothesis';
  return 'Insufficient evidence';
}

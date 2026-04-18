import type { ScoredItem, TieredItem, ConfidenceTier, TieredResults } from './types';
import { TIER_THRESHOLDS } from './weights';
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

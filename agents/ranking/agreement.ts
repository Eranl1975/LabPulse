import type { ScoredItem } from './types';
import { AGREEMENT_BONUS } from './weights';

// Returns item_id → bonus.
// An item earns a bonus when any of its likely_causes also appears in 2+ other items.
export function computeAgreementBonuses(items: ScoredItem[]): Map<string, number> {
  const causeCounts = new Map<string, number>();

  for (const { item } of items) {
    for (const cause of item.likely_causes) {
      const key = cause.toLowerCase().trim();
      causeCounts.set(key, (causeCounts.get(key) ?? 0) + 1);
    }
  }

  const bonuses = new Map<string, number>();
  for (const { item } of items) {
    const hasAgreement = item.likely_causes.some(
      c => (causeCounts.get(c.toLowerCase().trim()) ?? 0) >= 2,
    );
    bonuses.set(item.id, hasAgreement ? AGREEMENT_BONUS : 0);
  }

  return bonuses;
}

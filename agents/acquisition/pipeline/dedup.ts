// Deduplication and contradiction detection.
// Dedup: same stable ID = skip; high keyword overlap = flag as near-duplicate.
// Contradictions: same technique + issue_category, strong/moderate evidence, zero cause overlap.

import type { AcquiredItem } from '../types';

const NEAR_DUPLICATE_THRESHOLD = 0.75; // keyword overlap ratio

// Stable content fingerprint: sorted keywords from technique + issue_category + causes
export function contentFingerprint(item: Pick<AcquiredItem, 'technique' | 'issue_category' | 'likely_causes'>): string {
  return [
    item.technique.toLowerCase(),
    item.issue_category.toLowerCase(),
    ...item.likely_causes.map(c => c.toLowerCase().trim()),
  ].sort().join('|');
}

function keywordSimilarity(a: string, b: string): number {
  const setA = new Set(a.split('|'));
  const setB = b.split('|');
  if (setA.size === 0) return 0;
  const overlap = setB.filter(k => setA.has(k)).length;
  return overlap / Math.max(setA.size, setB.length);
}

export type DedupStatus = 'new' | 'updated' | 'duplicate';

export interface DedupResult {
  item: AcquiredItem;
  status: DedupStatus;
}

export interface DeduplicateOutput {
  results: DedupResult[];
  contradictions: string[];  // human-readable flags
}

// Compare incoming items against existing store items.
export function deduplicateAndFlag(
  incoming: AcquiredItem[],
  existing: AcquiredItem[],
): DeduplicateOutput {
  const existingById = new Map(existing.map(e => [e.id, e]));
  const results: DedupResult[] = [];
  const contradictions: string[] = [];

  for (const item of incoming) {
    const existingItem = existingById.get(item.id);

    if (existingItem) {
      // Same ID: check if content changed
      const fpOld = contentFingerprint(existingItem);
      const fpNew = contentFingerprint(item);
      const similarity = keywordSimilarity(fpOld, fpNew);

      if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
        results.push({ item: { ...item, version: existingItem.version }, status: 'duplicate' });
      } else {
        results.push({ item: { ...item, version: existingItem.version + 1 }, status: 'updated' });
      }
    } else {
      results.push({ item, status: 'new' });
    }
  }

  // Contradiction detection: credible items (strong/moderate) in same category with no cause overlap
  const credible = results
    .filter(r => r.status !== 'duplicate')
    .filter(r => r.item.evidence_strength === 'strong' || r.item.evidence_strength === 'moderate');

  const contradictionPairs = new Set<string>();

  for (let i = 0; i < credible.length; i++) {
    for (let j = i + 1; j < credible.length; j++) {
      const a = credible[i].item;
      const b = credible[j].item;

      if (a.technique !== b.technique || a.issue_category !== b.issue_category) continue;

      const causesA = new Set(a.likely_causes.map(c => c.toLowerCase()));
      const overlap  = b.likely_causes.some(c => causesA.has(c.toLowerCase()));

      if (!overlap) {
        const key = [a.id, b.id].sort().join(' vs ');
        if (!contradictionPairs.has(key)) {
          contradictionPairs.add(key);
          contradictions.push(
            `Contradiction: "${a.issue_category}" — ${a.source_id} vs ${b.source_id}. No shared causes.`,
          );
          // Mutate flags on both items
          a.contradiction_flags = [...a.contradiction_flags, b.id];
          b.contradiction_flags = [...b.contradiction_flags, a.id];
        }
      }
    }
  }

  return { results, contradictions };
}

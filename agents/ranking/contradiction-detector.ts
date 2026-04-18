import type { KnowledgeItem } from '@/lib/types';

export interface Contradiction {
  item_a: string;   // item id
  item_b: string;   // item id
  description: string;
}

// Flags contradictions: two strong/moderate items in the same issue_category
// with zero overlap in likely_causes.
// We flag rather than hide — per source-policy.
export function detectContradictions(items: KnowledgeItem[]): Contradiction[] {
  const credible = items.filter(
    i => i.evidence_strength === 'strong' || i.evidence_strength === 'moderate',
  );

  const contradictions: Contradiction[] = [];

  for (let i = 0; i < credible.length; i++) {
    for (let j = i + 1; j < credible.length; j++) {
      const a = credible[i];
      const b = credible[j];

      if (a.issue_category !== b.issue_category) continue;

      const causesA = new Set(a.likely_causes.map(c => c.toLowerCase()));
      const overlap  = b.likely_causes.some(c => causesA.has(c.toLowerCase()));

      if (!overlap) {
        contradictions.push({
          item_a: a.id,
          item_b: b.id,
          description:
            `Conflicting causes for "${a.issue_category}": ` +
            `${a.source_id} vs ${b.source_id}. Verify both sources.`,
        });
      }
    }
  }

  return contradictions;
}

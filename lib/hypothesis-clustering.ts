// ── Hypothesis clustering ───────────────────────────────────────────────────
// A knowledge item typically lists several causes for one symptom, and the
// ranking layer emitted one hypothesis per cause. When those causes are all
// discriminated by the same diagnostic test — "run a blank injection" — the
// report repeated the same evidence, the same test and the same expected result
// four times over. Four causes that one test separates are one diagnostic step.
//
// Clustering merges them into a single ranked entry that names every candidate
// cause and states the test once.

import type { Hypothesis } from './types';

/** Placeholder text older producers emitted when they had nothing to say. */
const FILLER_EXPECTED = /^if this cause is correct|^the diagnostic should confirm/i;

const PROBABILITY_ORDER: Record<Hypothesis['probability'], number> = { low: 0, medium: 1, high: 2 };

function normalizeTest(test: string): string {
  return test.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedup(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

/** Drop the filler expected-result text so formatters can omit the line. */
export function cleanExpectedResult(expected: string): string {
  const text = (expected ?? '').trim();
  return FILLER_EXPECTED.test(text) ? '' : text;
}

/**
 * Merge hypotheses that share a diagnostic test into one entry.
 *
 * The merged entry keeps the highest probability in the group, the union of its
 * evidence, and the position of its first member; `grouped_causes` lists every
 * candidate cause the shared test discriminates. Ranks are renumbered so the
 * result is always 1..n.
 */
export function clusterHypotheses(hypotheses: Hypothesis[]): Hypothesis[] {
  if (hypotheses.length < 2) {
    return hypotheses.map((h, i) => ({
      ...h,
      rank: i + 1,
      expected_result: cleanExpectedResult(h.expected_result),
    }));
  }

  const order: string[] = [];
  const groups = new Map<string, Hypothesis[]>();

  for (const h of hypotheses) {
    const key = normalizeTest(h.diagnostic_test);
    // A hypothesis with no diagnostic test has nothing to cluster on: keep it
    // separate by giving it a key of its own.
    const groupKey = key || `__ungrouped_${order.length}__`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
      order.push(groupKey);
    }
    groups.get(groupKey)!.push(h);
  }

  return order.map((key, index) => {
    const members = groups.get(key)!;
    const first = members[0];

    if (members.length === 1) {
      return { ...first, rank: index + 1, expected_result: cleanExpectedResult(first.expected_result) };
    }

    const sorted = [...members].sort(
      (a, b) => PROBABILITY_ORDER[b.probability] - PROBABILITY_ORDER[a.probability],
    );
    const causes = dedup(sorted.map(m => m.cause));
    const expected = dedup(members.map(m => cleanExpectedResult(m.expected_result)));

    return {
      rank: index + 1,
      cause: sorted[0].cause,
      grouped_causes: causes,
      probability: sorted[0].probability,
      supporting_evidence: dedup(members.flatMap(m => m.supporting_evidence)),
      contradicting_evidence: dedup(members.flatMap(m => m.contradicting_evidence)),
      diagnostic_test: first.diagnostic_test,
      expected_result: expected.length > 0
        ? expected.join(' ')
        : `One test separates all ${causes.length} candidates: a positive result keeps this group in play, a negative result rules out every cause in it.`,
      status: members.some(m => m.status === 'confirmed') ? 'confirmed' : 'suspected',
    };
  });
}

/** Heading text for a hypothesis: the cause, or the grouped causes joined. */
export function hypothesisHeading(h: Hypothesis): string {
  const causes = h.grouped_causes ?? [];
  if (causes.length < 2) return h.cause;
  if (causes.length <= 3) {
    return `${causes.slice(0, -1).join(', ')} or ${causes[causes.length - 1]}`;
  }
  return `${causes.slice(0, 2).join(', ')} and ${causes.length - 2} further causes`;
}

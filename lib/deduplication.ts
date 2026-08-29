/**
 * Semantic deduplication for report output items.
 * Uses Jaccard similarity on normalized word sets to detect near-duplicates.
 */

const SIMILARITY_THRESHOLD = 0.6;
const DEFAULT_MAX_MAIN = 6;

export interface DeduplicatedResult {
  main: string[];
  additional: string[];
}

/**
 * Deduplicate a list of text items (causes, checks, actions, etc.).
 * Returns the top items as `main` and semantically redundant items as `additional`.
 *
 * Ranking criteria: diagnostic value, specificity (longer = more specific), position (earlier = higher priority).
 */
export function deduplicateItems(
  items: string[],
  maxMain: number = DEFAULT_MAX_MAIN,
): DeduplicatedResult {
  if (items.length === 0) return { main: [], additional: [] };

  // Score each item for ranking
  const scored = items.map((text, index) => ({
    text,
    index,
    words: getWordSet(text),
    diagnosticScore: scoreDiagnosticValue(text),
    specificityScore: text.length,
  }));

  // Sort by diagnostic value (desc), then specificity (desc), then position (asc)
  scored.sort((a, b) =>
    b.diagnosticScore - a.diagnosticScore
    || b.specificityScore - a.specificityScore
    || a.index - b.index
  );

  const main: string[] = [];
  const additional: string[] = [];

  for (const item of scored) {
    // Check if this item is a near-duplicate of any already-accepted main item
    const isDuplicate = main.some(accepted => {
      const acceptedWords = getWordSet(accepted);
      return jaccardSimilarity(item.words, acceptedWords) >= SIMILARITY_THRESHOLD;
    });

    if (isDuplicate) {
      additional.push(item.text);
    } else if (main.length < maxMain) {
      main.push(item.text);
    } else {
      additional.push(item.text);
    }
  }

  return { main, additional };
}

// ─── Similarity Functions ───────────────────────────────────────────

function getWordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)  // skip very short words
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Diagnostic Value Scoring ───────────────────────────────────────

const DIAGNOSTIC_KEYWORDS = [
  'check', 'verify', 'inspect', 'measure', 'test', 'compare',
  'run blank', 'run standard', 'calibrate', 'diagnose', 'isolate',
  'matrix factor', 'system suitability', 'tune', 'evaluate',
];

const SAFETY_KEYWORDS = [
  'caution', 'warning', 'safety', 'hazard', 'ppe', 'fume hood',
  'do not', 'never', 'avoid',
];

function scoreDiagnosticValue(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const kw of DIAGNOSTIC_KEYWORDS) {
    if (lower.includes(kw)) score += 2;
  }
  for (const kw of SAFETY_KEYWORDS) {
    if (lower.includes(kw)) score += 1;
  }

  return score;
}

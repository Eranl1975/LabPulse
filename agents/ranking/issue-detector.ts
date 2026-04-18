// Maps every issue category (from project-spec) to detection keywords (lowercase).
// Detection: count keyword hits; highest count wins. Ties are unresolved (first wins).

const ISSUE_KEYWORDS: Record<string, string[]> = {
  'retention time shift':     ['retention', 'rt shift', 'earlier elution', 'later elution', 'elution time'],
  'peak tailing':             ['tailing', 'tail', 'asymmetry', 'asymmetric peak'],
  'peak broadening':          ['broadening', 'broad peak', 'wide peak', 'plate count', 'efficiency loss'],
  'low sensitivity':          ['low sensitivity', 'low signal', 'low response', 'weak signal', 'detection limit'],
  'no peak':                  ['no peak', 'missing peak', 'absent peak', 'not detected', 'no signal'],
  'carryover':                ['carryover', 'carry-over', 'memory effect', 'residual signal'],
  'noisy baseline':           ['noisy baseline', 'baseline noise', 'baseline drift', 'baseline instability'],
  'high backpressure':        ['high pressure', 'backpressure', 'back pressure', 'clogged', 'blocked column'],
  'LCMS source contamination':['source contamination', 'spray shield', 'ms sensitivity loss', 'source dirty'],
  'GC ghost peaks':           ['ghost peak', 'phantom peak', 'extra peak blank', 'blank injection peak'],
  'poor GC peak shape':       ['gc peak shape', 'gc fronting', 'gc split peak', 'gc tailing'],
  'GCMS signal loss':         ['gcms signal', 'gc-ms response', 'gcms sensitivity', 'ms detector loss'],
};

export function detectIssueCategory(description: string): string | null {
  const lower = description.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(ISSUE_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

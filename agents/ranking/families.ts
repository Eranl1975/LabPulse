import type { Technique } from '@/lib/types';

// Related techniques whose knowledge items are still useful when the exact
// technique has no coverage. Direction matters: UHPLC can borrow HPLC items,
// but a GC query never borrows LC items.
export const TECHNIQUE_FAMILIES: Partial<Record<Technique, Technique[]>> = {
  UHPLC:  ['HPLC', 'PrepLC'],
  HPLC:   ['UHPLC', 'PrepLC'],
  PrepLC: ['HPLC', 'UHPLC'],
  LCMS:   ['HPLC', 'UHPLC'],
  SFC:    ['UHPLC', 'HPLC'],
  IC:     ['HPLC'],
  GCMS:   ['GC'],
  GC:     ['GCMS'],
  KF:     ['KFO'],
  KFO:    ['KF'],
  NMR:    ['ssNMR'],
  ssNMR:  ['NMR'],
  SEM:    ['TEM'],
  TEM:    ['SEM'],
};

export function isFamilyTechnique(queryTechnique: Technique, itemTechnique: Technique): boolean {
  if (queryTechnique === itemTechnique) return false;
  return (TECHNIQUE_FAMILIES[queryTechnique] ?? []).includes(itemTechnique);
}

// Issue-category spellings that describe the same problem. Matching is done on
// normalised strings (lowercase, hyphens and underscores collapsed to spaces).
const ISSUE_SYNONYM_GROUPS: string[][] = [
  ['carryover', 'carry over', 'memory effect', 'residual peaks in blank'],
  ['high backpressure', 'high system pressure', 'high pressure', 'pressure increase', 'hplc pressure increase', 'uhplc high backpressure', 'preplc high backpressure', 'ic high backpressure'],
  ['peak broadening', 'loss of resolution', 'poor peak resolution', 'preplc poor peak resolution', 'fplc poor peak resolution', 'low plate count', 'low efficiency'],
  ['retention time shift', 'retention time drift', 'rt shift', 'rt drift', 'ic wrong retention time'],
  ['peak tailing', 'poor peak shape', 'peak asymmetry', 'poor gc peak shape'],
  ['noisy baseline', 'baseline noise'],
  ['baseline drift', 'ic baseline drift', 'ic baseline rise', 'cd baseline drift'],
  ['low sensitivity', 'sensitivity loss', 'signal loss', 'low signal', 'gcms signal loss', 'unstable mass signal'],
  ['no peak', 'missing peak', 'no signal'],
  ['lcms source contamination', 'source contamination', 'dirty source'],
  ['split peaks', 'peak splitting', 'double peaks'],
  ['ghost peaks', 'gc ghost peaks', 'phantom peaks'],
];

export function normalizeIssue(issue: string): string {
  return issue.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export type IssueMatch = 'exact' | 'synonym' | 'none';

export function matchIssue(queryIssue: string, itemIssue: string): IssueMatch {
  const q = normalizeIssue(queryIssue);
  const i = normalizeIssue(itemIssue);
  if (q === i) return 'exact';
  for (const group of ISSUE_SYNONYM_GROUPS) {
    if (group.includes(q) && group.includes(i)) return 'synonym';
  }
  return 'none';
}

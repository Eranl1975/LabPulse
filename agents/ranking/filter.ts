import type { KnowledgeItem } from '@/lib/types';
import type { RankingQuery } from './types';
import { isFamilyTechnique, matchIssue } from './families';

// Hard filters, applied in widening steps so exact evidence always wins:
//   1. same technique + exact issue_category (or any issue when none was given)
//   2. same technique + synonym issue_category
//   3. related technique family + exact or synonym issue_category
// Soft relevance (keyword overlap) is handled by the scorer, not here.
export function filterItems(query: RankingQuery, items: KnowledgeItem[]): KnowledgeItem[] {
  const issue = query.issue_category;

  const exact = items.filter(item =>
    item.technique === query.technique &&
    (issue === null || matchIssue(issue, item.issue_category) === 'exact'),
  );
  if (exact.length > 0 || issue === null) return exact;

  const synonym = items.filter(item =>
    item.technique === query.technique && matchIssue(issue, item.issue_category) === 'synonym',
  );
  if (synonym.length > 0) return synonym;

  return items.filter(item =>
    isFamilyTechnique(query.technique, item.technique) &&
    matchIssue(issue, item.issue_category) !== 'none',
  );
}

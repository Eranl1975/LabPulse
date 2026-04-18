import type { KnowledgeItem } from '@/lib/types';
import type { RankingQuery } from './types';

// Hard filters: technique must match; issue_category filters when provided.
// Soft relevance (keyword overlap) is handled by the scorer, not here.
export function filterItems(query: RankingQuery, items: KnowledgeItem[]): KnowledgeItem[] {
  return items.filter(item => {
    if (item.technique !== query.technique) return false;
    if (query.issue_category !== null && item.issue_category !== query.issue_category) return false;
    return true;
  });
}

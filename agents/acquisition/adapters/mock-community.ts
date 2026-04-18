// Mock community adapter — simulates a forum/discussion board source.
// Evidence is anecdotal and weighted lower by source quality scoring.
// A real adapter would scrape or call a forum API.

import type { SourceAdapter } from './interface';
import type { AdapterFetchQuery, RawFetchedItem } from '../types';

const ITEMS: Omit<RawFetchedItem, 'fetched_at'>[] = [
  {
    source_id: 'lcms-community-forum',
    source_type: 'community',
    source_title: 'LCMS Community Forum Thread: Ghost peaks in GC blanks',
    source_url: 'https://community.example.com/gc-ghost-peaks',
    publication_date: '2023-11-15',
    raw_content: JSON.stringify({
      technique: 'GC',
      instrument_family: 'generic',
      model: null,
      issue_category: 'GC ghost peaks',
      symptom: 'Ghost peaks appearing in blank injections after sample batch',
      likely_causes: ['dirty inlet liner', 'column bleed at high temperature'],
      diagnostics: ['run blank after bake-out', 'check liner condition'],
      corrective_actions: ['replace liner', 'reduce oven temperature ramp'],
      severity: 'medium',
      escalation_conditions: ['ghost peaks persist after liner replacement'],
      tags: ['gc', 'ghost-peaks', 'community'],
    }),
  },
];

export class MockCommunityAdapter implements SourceAdapter {
  readonly source_id    = 'lcms-community-forum';
  readonly source_type  = 'community' as const;
  readonly display_name = 'LCMS Community Forum (mock)';

  // Simulate: community source updates very rarely, often skip-eligible
  async hasUpdates(since: string | null): Promise<boolean> {
    if (since === null) return true;
    // Publication date is 2023-11-15; if last run was after that, no updates
    return new Date(since) < new Date('2023-11-15');
  }

  async fetch(query: AdapterFetchQuery): Promise<RawFetchedItem[]> {
    const now = new Date().toISOString();
    return ITEMS
      .filter(item => {
        const parsed = JSON.parse(item.raw_content);
        return query.techniques.length === 0 || query.techniques.includes(parsed.technique);
      })
      .map(item => ({ ...item, fetched_at: now }));
  }
}

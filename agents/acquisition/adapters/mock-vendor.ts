// Mock vendor adapter — simulates Agilent-style troubleshooting documentation.
// raw_content is pre-structured JSON so the extractor can parse it directly.
// A real vendor adapter would fetch HTML/PDF and extract fields from it.

import type { SourceAdapter } from './interface';
import type { AdapterFetchQuery, RawFetchedItem } from '../types';

const ITEMS: Omit<RawFetchedItem, 'fetched_at'>[] = [
  {
    source_id: 'agilent-hplc-troubleshooting-guide',
    source_type: 'vendor',
    source_title: 'Agilent HPLC Troubleshooting Guide',
    source_url: 'https://www.agilent.com/hplc-troubleshooting',
    publication_date: '2024-03-01',
    raw_content: JSON.stringify({
      technique: 'HPLC',
      instrument_family: 'Agilent 1200/1260/1290',
      model: null,
      issue_category: 'retention time shift',
      symptom: 'Retention times shifted earlier than expected',
      likely_causes: ['column degradation', 'mobile phase composition change', 'temperature fluctuation'],
      diagnostics: ['check column age and void volume', 'verify mobile phase batch', 'check column oven temperature log'],
      corrective_actions: ['replace column', 'prepare fresh mobile phase', 'recalibrate column oven'],
      severity: 'medium',
      escalation_conditions: ['shift > 10% of expected RT', 'multiple analytes affected simultaneously'],
      tags: ['hplc', 'retention', 'column'],
    }),
  },
  {
    source_id: 'agilent-hplc-troubleshooting-guide',
    source_type: 'vendor',
    source_title: 'Agilent HPLC Troubleshooting Guide',
    source_url: 'https://www.agilent.com/hplc-troubleshooting',
    publication_date: '2024-03-01',
    raw_content: JSON.stringify({
      technique: 'HPLC',
      instrument_family: 'Agilent 1200/1260/1290',
      model: null,
      issue_category: 'high backpressure',
      symptom: 'System pressure exceeds expected range during run',
      likely_causes: ['blocked frit or guard column', 'precipitated mobile phase', 'kinked tubing'],
      diagnostics: ['isolate column from flow path', 'check pressure without column', 'inspect tubing connections'],
      corrective_actions: ['replace guard column or frit', 'flush with strong solvent', 'replace or straighten tubing'],
      severity: 'high',
      escalation_conditions: ['pressure > instrument max limit', 'pressure does not drop after column removal'],
      tags: ['hplc', 'pressure', 'blockage'],
    }),
  },
];

export class MockVendorAdapter implements SourceAdapter {
  readonly source_id   = 'agilent-hplc-troubleshooting-guide';
  readonly source_type = 'vendor' as const;
  readonly display_name = 'Agilent HPLC Troubleshooting Guide (mock)';

  async hasUpdates(_since: string | null): Promise<boolean> {
    return true; // mock always reports updates
  }

  async fetch(query: AdapterFetchQuery): Promise<RawFetchedItem[]> {
    const now = new Date().toISOString();
    // Filter by requested techniques if specified
    return ITEMS
      .filter(item => {
        const parsed = JSON.parse(item.raw_content);
        return query.techniques.length === 0 || query.techniques.includes(parsed.technique);
      })
      .map(item => ({ ...item, fetched_at: now }));
  }
}

import { describe, it, expect } from 'vitest';
import { contentFingerprint, deduplicateAndFlag } from '@/agents/acquisition/pipeline/dedup';
import type { AcquiredItem } from '@/agents/acquisition/types';

const makeItem = (overrides: Partial<AcquiredItem> = {}): AcquiredItem => ({
  id: 'hplc--retention-time-shift--agilent',
  technique: 'HPLC',
  instrument_family: 'generic',
  model: null,
  issue_category: 'retention time shift',
  symptom: 'RT shifted',
  likely_causes: ['column degradation', 'mobile phase change'],
  diagnostics: ['check void volume'],
  corrective_actions: ['replace column'],
  severity: 'medium',
  escalation_conditions: [],
  source_id: 'agilent-guide',
  source_type: 'vendor',
  source_title: 'Agilent Guide',
  source_url: 'https://agilent.com',
  publication_date: '2024-01-01',
  confidence_score: 0.85,
  evidence_strength: 'strong',
  source_quality_score: 0.85,
  extracted_at: '2025-01-01T00:00:00Z',
  monthly_refresh_at: '2025-01-01',
  updated_at: '2025-01-01T00:00:00Z',
  tags: [],
  version: 1,
  is_deprecated: false,
  contradiction_flags: [],
  ...overrides,
});

describe('contentFingerprint', () => {
  it('same technique + issue_category + causes → same fingerprint', () => {
    const a = makeItem();
    const b = makeItem({ id: 'different-id' });
    expect(contentFingerprint(a)).toBe(contentFingerprint(b));
  });

  it('different causes → different fingerprint', () => {
    const a = makeItem();
    const b = makeItem({ likely_causes: ['septum bleed', 'solvent impurity'] });
    expect(contentFingerprint(a)).not.toBe(contentFingerprint(b));
  });
});

describe('deduplicateAndFlag', () => {
  it('marks item as new when not in existing store', () => {
    const { results } = deduplicateAndFlag([makeItem()], []);
    expect(results[0].status).toBe('new');
  });

  it('marks item as duplicate when ID matches and content is unchanged', () => {
    const existing = makeItem({ version: 1 });
    const incoming = makeItem({ version: 1 }); // same content
    const { results } = deduplicateAndFlag([incoming], [existing]);
    expect(results[0].status).toBe('duplicate');
  });

  it('marks item as updated when ID matches but causes changed', () => {
    const existing = makeItem({ version: 1 });
    const incoming = makeItem({ likely_causes: ['completely different cause'] });
    const { results } = deduplicateAndFlag([incoming], [existing]);
    expect(results[0].status).toBe('updated');
  });

  it('increments version on update', () => {
    const existing = makeItem({ version: 2 });
    const incoming = makeItem({ likely_causes: ['new cause'] });
    const { results } = deduplicateAndFlag([incoming], [existing]);
    expect(results[0].item.version).toBe(3);
  });

  it('detects contradiction between items with same category but no shared causes', () => {
    const a = makeItem({
      id: 'item-a',
      source_id: 'source-a',
      likely_causes: ['column degradation'],
      evidence_strength: 'strong',
    });
    const b = makeItem({
      id: 'item-b',
      source_id: 'source-b',
      likely_causes: ['completely different cause'],
      evidence_strength: 'strong',
    });
    const { contradictions } = deduplicateAndFlag([a, b], []);
    expect(contradictions.length).toBe(1);
    expect(contradictions[0]).toContain('source-a');
    expect(contradictions[0]).toContain('source-b');
  });

  it('does not flag contradiction when causes overlap', () => {
    const a = makeItem({ id: 'a', source_id: 'src-a', likely_causes: ['column degradation'] });
    const b = makeItem({ id: 'b', source_id: 'src-b', likely_causes: ['column degradation', 'other'] });
    const { contradictions } = deduplicateAndFlag([a, b], []);
    expect(contradictions).toHaveLength(0);
  });

  it('does not flag contradiction for anecdotal/weak evidence', () => {
    const a = makeItem({ id: 'a', evidence_strength: 'anecdotal', likely_causes: ['cause-a'] });
    const b = makeItem({ id: 'b', evidence_strength: 'weak', likely_causes: ['cause-b'] });
    const { contradictions } = deduplicateAndFlag([a, b], []);
    expect(contradictions).toHaveLength(0);
  });

  it('does not flag contradiction for items with different issue_category', () => {
    const a = makeItem({ id: 'a', issue_category: 'peak tailing', likely_causes: ['cause-a'] });
    const b = makeItem({ id: 'b', issue_category: 'retention time shift', likely_causes: ['cause-b'] });
    const { contradictions } = deduplicateAndFlag([a, b], []);
    expect(contradictions).toHaveLength(0);
  });
});

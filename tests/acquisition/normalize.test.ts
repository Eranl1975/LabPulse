import { describe, it, expect } from 'vitest';
import { generateId, normalizeItem } from '@/agents/acquisition/pipeline/normalize';
import type { ExtractedItem, SourceQualityScore } from '@/agents/acquisition/types';

const baseExtracted: ExtractedItem = {
  technique: 'HPLC',
  instrument_family: 'Agilent 1290 ',   // intentional trailing space
  model: null,
  issue_category: 'retention time shift',
  symptom: '  RT shifted earlier  ',    // intentional whitespace
  likely_causes: ['column degradation', 'column degradation', 'mobile phase change'], // duplicate
  diagnostics: ['check void volume'],
  corrective_actions: ['replace column'],
  severity: 'medium',
  escalation_conditions: [],
  tags: ['hplc', 'hplc'],               // duplicate
  source_id: 'agilent-hplc-guide',
  source_type: 'vendor',
  source_title: 'Agilent Guide',
  source_url: 'https://agilent.com',
  publication_date: '2024-01-01',
  fetched_at: '2025-01-01T00:00:00Z',
};

const baseQuality: SourceQualityScore = {
  source_id: 'agilent-hplc-guide',
  vendor_authority: 1.0,
  scientific_credibility: 0.9,
  specificity: 0.7,
  recency: 1.0,
  popularity_signal: 0.0,
  composite: 0.85,
};

describe('generateId', () => {
  it('produces stable lowercase slug', () => {
    const id = generateId('HPLC', 'retention time shift', 'agilent-guide');
    expect(id).toBe('hplc--retention-time-shift--agilent-guide');
  });

  it('same inputs always produce same ID', () => {
    expect(generateId('GC', 'GC ghost peaks', 'restek')).toBe(
      generateId('GC', 'GC ghost peaks', 'restek'),
    );
  });

  it('different technique produces different ID', () => {
    expect(generateId('HPLC', 'peak tailing', 'src')).not.toBe(
      generateId('LCMS', 'peak tailing', 'src'),
    );
  });
});

describe('normalizeItem', () => {
  it('sets the correct stable id', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01');
    expect(item.id).toBe('hplc--retention-time-shift--agilent-hplc-guide');
  });

  it('trims whitespace from symptom and instrument_family', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01');
    expect(item.symptom).toBe('RT shifted earlier');
    expect(item.instrument_family).toBe('Agilent 1290');
  });

  it('deduplicates likely_causes', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01');
    const unique = [...new Set(item.likely_causes)];
    expect(item.likely_causes).toEqual(unique);
    expect(item.likely_causes.length).toBe(2);
  });

  it('deduplicates tags', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01');
    expect(item.tags).toHaveLength(1);
    expect(item.tags[0]).toBe('hplc');
  });

  it('sets version to existingVersion + 1', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01', 3);
    expect(item.version).toBe(4);
  });

  it('derives evidence_strength from composite score', () => {
    const highQ = { ...baseQuality, composite: 0.80 };
    const lowQ  = { ...baseQuality, composite: 0.25 };
    expect(normalizeItem(baseExtracted, highQ, '2025-01-01').evidence_strength).toBe('strong');
    expect(normalizeItem(baseExtracted, lowQ, '2025-01-01').evidence_strength).toBe('anecdotal');
  });

  it('sets is_deprecated to false and contradiction_flags to empty', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-01-01');
    expect(item.is_deprecated).toBe(false);
    expect(item.contradiction_flags).toHaveLength(0);
  });

  it('sets monthly_refresh_at to the provided runDate', () => {
    const item = normalizeItem(baseExtracted, baseQuality, '2025-06-01');
    expect(item.monthly_refresh_at).toBe('2025-06-01');
  });
});

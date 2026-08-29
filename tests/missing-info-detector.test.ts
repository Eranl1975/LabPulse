import { describe, it, expect } from 'vitest';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import type { RankingQueryV2 } from '@/agents/ranking/types';

const baseQuery: RankingQueryV2 = {
  technique: 'LCMS',
  vendor: null,
  model: null,
  issue_category: null,
  symptom_description: 'ion suppression observed',
  method_conditions: null,
  already_checked: [],
};

describe('detectMissingInfo', () => {
  it('flags manufacturer and model as critical when not provided', () => {
    const result = detectMissingInfo(baseQuery, 'LCMS');
    expect(result.critical_missing).toContain('manufacturer');
    expect(result.critical_missing).toContain('model');
  });

  it('does not flag manufacturer when vendor is provided', () => {
    const query = { ...baseQuery, vendor: 'Agilent' };
    const result = detectMissingInfo(query, 'LCMS');
    expect(result.critical_missing).not.toContain('manufacturer');
  });

  it('LCMS without ionization_mode flags it as critical', () => {
    const result = detectMissingInfo(baseQuery, 'LCMS');
    expect(result.critical_missing).toContain('ionization_mode');
  });

  it('LCMS with all critical fields filled has no critical missing', () => {
    const fullQuery: RankingQueryV2 = {
      ...baseQuery,
      vendor: 'Agilent',
      model: 'G6170A',
      ionization_mode: 'ESI+',
      mobile_phase: '0.1% formic acid in ACN/water',
      column: 'C18 2.1x50mm 1.8um',
    };
    const result = detectMissingInfo(fullQuery, 'LCMS');
    expect(result.critical_missing).toHaveLength(0);
  });

  it('HPLC without column and mobile_phase flags them as critical', () => {
    const hplcQuery: RankingQueryV2 = {
      ...baseQuery,
      technique: 'HPLC',
      vendor: 'Agilent',
      model: '1260',
      symptom_description: 'baseline drift',
    };
    const result = detectMissingInfo(hplcQuery, 'HPLC');
    expect(result.critical_missing).toContain('column');
    expect(result.critical_missing).toContain('mobile_phase');
    expect(result.critical_missing).toContain('flow_rate');
  });

  it('GC query with all fields has no critical missing', () => {
    const gcQuery: RankingQueryV2 = {
      ...baseQuery,
      technique: 'GC',
      vendor: 'Agilent',
      model: '8890',
      column: 'DB-5ms 30m x 0.25mm',
    };
    const result = detectMissingInfo(gcQuery, 'GC');
    expect(result.critical_missing).toHaveLength(0);
  });

  it('generates follow-up questions for critical missing fields', () => {
    const result = detectMissingInfo(baseQuery, 'LCMS');
    expect(result.follow_up_questions.length).toBeGreaterThan(0);
    expect(result.follow_up_questions.length).toBe(result.critical_missing.length);
    // Should include questions about manufacturer, model, ionization_mode, etc.
    expect(result.follow_up_questions.some(q => q.includes('manufacturer'))).toBe(true);
    expect(result.follow_up_questions.some(q => q.includes('model'))).toBe(true);
  });

  it('includes optional fields in missing_fields but not in critical_missing', () => {
    const partialQuery: RankingQueryV2 = {
      ...baseQuery,
      vendor: 'Agilent',
      model: 'G6170A',
      ionization_mode: 'ESI+',
      mobile_phase: 'ACN/water',
      column: 'C18',
    };
    const result = detectMissingInfo(partialQuery, 'LCMS');
    expect(result.critical_missing).toHaveLength(0);
    // Optional fields like analyte, sample_matrix should still be in missing_fields
    expect(result.missing_fields).toContain('analyte');
    expect(result.missing_fields).toContain('sample_matrix');
  });

  it('TGA requires sample_matrix as critical', () => {
    const tgaQuery: RankingQueryV2 = {
      ...baseQuery,
      technique: 'TGA',
      vendor: 'TA Instruments',
      model: 'Discovery TGA',
    };
    const result = detectMissingInfo(tgaQuery, 'TGA');
    expect(result.critical_missing).toContain('sample_matrix');
  });
});

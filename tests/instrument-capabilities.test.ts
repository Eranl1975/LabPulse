import { describe, it, expect } from 'vitest';
import { getCapability, validateRecommendation } from '@/lib/instrument-capabilities';

describe('getCapability', () => {
  it('returns null when vendor or model is null', () => {
    expect(getCapability(null, null)).toBeNull();
    expect(getCapability('Agilent', null)).toBeNull();
    expect(getCapability(null, 'G6170A')).toBeNull();
  });

  it('finds Agilent G6170A profile', () => {
    const cap = getCapability('Agilent', 'G6170A');
    expect(cap).not.toBeNull();
    expect(cap!.ms_type).toBe('single-quad');
    expect(cap!.technique).toBe('LCMS');
    expect(cap!.vendor).toBe('Agilent');
  });

  it('G6170A has AJS in ionization modes and capabilities', () => {
    const cap = getCapability('Agilent', 'G6170A')!;
    expect(cap.ionization_modes).toContain('AJS');
    expect(cap.capabilities).toContain('AJS ion source');
  });

  it('G6170A cannot do MS/MS or MRM', () => {
    const cap = getCapability('Agilent', 'G6170A')!;
    expect(cap.cannot_do).toContain('MS/MS');
    expect(cap.cannot_do).toContain('MRM');
  });

  it('finds triple-quad models', () => {
    const cap6470 = getCapability('Agilent', '6470');
    expect(cap6470).not.toBeNull();
    expect(cap6470!.ms_type).toBe('triple-quad');
    expect(cap6470!.capabilities).toContain('MS/MS');
    expect(cap6470!.capabilities).toContain('MRM');
  });

  it('finds Waters QDa (single-quad, no MS/MS)', () => {
    const cap = getCapability('Waters', 'QDa');
    expect(cap).not.toBeNull();
    expect(cap!.ms_type).toBe('single-quad');
    expect(cap!.cannot_do).toContain('MS/MS');
  });

  it('finds SCIEX QTRAP 6500+', () => {
    const cap = getCapability('SCIEX', 'QTRAP 6500+');
    expect(cap).not.toBeNull();
    expect(cap!.ms_type).toBe('triple-quad');
    expect(cap!.capabilities).toContain('linear ion trap');
  });

  it('returns null for unknown models', () => {
    expect(getCapability('Agilent', 'XYZ999')).toBeNull();
    expect(getCapability('UnknownVendor', 'Model1')).toBeNull();
  });

  it('handles case-insensitive matching', () => {
    expect(getCapability('agilent', 'g6170a')).not.toBeNull();
    expect(getCapability('WATERS', 'qda')).not.toBeNull();
  });
});

describe('validateRecommendation', () => {
  const g6170a = getCapability('Agilent', 'G6170A')!;

  it('rejects MS/MS recommendation on single-quad', () => {
    const result = validateRecommendation('Use MS/MS to confirm fragmentation pattern', g6170a);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('MS/MS');
    expect(result.reason).toContain('G6170A');
  });

  it('rejects MRM recommendation on single-quad', () => {
    const result = validateRecommendation('Set up MRM transitions for quantification', g6170a);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('MRM');
  });

  it('accepts SIM recommendation on single-quad', () => {
    const result = validateRecommendation('Use SIM mode for better sensitivity', g6170a);
    expect(result.valid).toBe(true);
  });

  it('rejects recommending installation of AJS (already installed)', () => {
    const result = validateRecommendation('Install AJS ion source for better sensitivity', g6170a);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('already');
  });

  it('accepts valid recommendations', () => {
    expect(validateRecommendation('Clean the ion source', g6170a).valid).toBe(true);
    expect(validateRecommendation('Check mobile phase composition', g6170a).valid).toBe(true);
    expect(validateRecommendation('Run system suitability test', g6170a).valid).toBe(true);
  });

  it('rejects product ion scan on single-quad', () => {
    const result = validateRecommendation('Perform product ion scan to identify fragments', g6170a);
    expect(result.valid).toBe(false);
  });

  it('allows MS/MS on triple-quad', () => {
    const tq = getCapability('Agilent', '6470')!;
    expect(validateRecommendation('Use MS/MS for confirmation', tq).valid).toBe(true);
    expect(validateRecommendation('Set up MRM method', tq).valid).toBe(true);
  });
});

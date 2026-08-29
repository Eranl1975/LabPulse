import { describe, it, expect } from 'vitest';
import { classifySource, tierToAuthorityScore, validateSourceForVendor } from '@/lib/evidence-hierarchy';

describe('classifySource', () => {
  it('Tier 1: exact-model match for matching vendor + model', () => {
    const result = classifySource('agilent-g6170a-troubleshooting', 'Agilent', 'G6170A');
    expect(result.tier).toBe(1);
    expect(result.classification).toBe('exact-model');
  });

  it('Tier 2: instrument-family for matching vendor without model match', () => {
    const result = classifySource('agilent-hplc-guide', 'Agilent', '1290');
    expect(result.tier).toBe(2);
    expect(result.classification).toBe('instrument-family');
  });

  it('Tier 2: vendor source for different vendor still classified as instrument-family', () => {
    const result = classifySource('agilent-lcms-guide', 'Waters', 'QDa');
    expect(result.tier).toBe(2);
    expect(result.classification).toBe('instrument-family');
  });

  it('Tier 3: regulatory standards detected via keywords', () => {
    expect(classifySource('ich-m10-bioanalytical', null, null).tier).toBe(3);
    expect(classifySource('usp-chapter-621', null, null).tier).toBe(3);
    expect(classifySource('fda-guidance-2023', null, null).tier).toBe(3);
    expect(classifySource('iso-17025-reference', null, null).tier).toBe(3);
    expect(classifySource('ich-m10-bioanalytical', null, null).classification).toBe('regulatory-standard');
  });

  it('Tier 4: peer-reviewed publications', () => {
    expect(classifySource('analytical-chemistry-journal-2024', null, null).tier).toBe(4);
    expect(classifySource('j-chrom-a-paper-2023', null, null).tier).toBe(4);
    expect(classifySource('doi-10-1016-review', null, null).tier).toBe(4);
    expect(classifySource('j-chrom-a-paper-2023', null, null).classification).toBe('peer-reviewed');
  });

  it('Tier 5: verified technical docs', () => {
    expect(classifySource('app-note-5994-injection', null, null).tier).toBe(5);
    expect(classifySource('tech-note-sensitivity-guide', null, null).tier).toBe(5);
    expect(classifySource('application-note-matrix', null, null).tier).toBe(5);
    expect(classifySource('app-note-5994-injection', null, null).classification).toBe('verified-technical');
  });

  it('Tier 6: general manufacturer-independent sources', () => {
    const result = classifySource('chromatography-forum-post', null, null);
    expect(result.tier).toBe(6);
    expect(result.classification).toBe('general-manufacturer-independent');
  });

  it('Tier 7: AI-generated inference', () => {
    expect(classifySource('claude-sonnet-4-20250514', null, null).tier).toBe(7);
    expect(classifySource('ai-generated-answer', null, null).tier).toBe(7);
    expect(classifySource('llm-inference-2025', null, null).tier).toBe(7);
    expect(classifySource('claude-sonnet-4-20250514', null, null).classification).toBe('ai-inference');
  });

  it('handles model numbers in various formats', () => {
    // Model number extracted from source_id
    expect(classifySource('agilent-6495-maintenance', 'Agilent', '6495').tier).toBe(1);
    expect(classifySource('agilent-1290-infinity-guide', 'Agilent', '1290 Infinity').tier).toBe(1);
  });
});

describe('tierToAuthorityScore', () => {
  it('returns correct scores for each tier', () => {
    expect(tierToAuthorityScore(1)).toBe(1.00);
    expect(tierToAuthorityScore(2)).toBe(0.90);
    expect(tierToAuthorityScore(3)).toBe(0.85);
    expect(tierToAuthorityScore(4)).toBe(0.75);
    expect(tierToAuthorityScore(5)).toBe(0.60);
    expect(tierToAuthorityScore(6)).toBe(0.45);
    expect(tierToAuthorityScore(7)).toBe(0.30);
  });

  it('higher tiers always have higher scores', () => {
    for (let t = 1; t < 7; t++) {
      expect(tierToAuthorityScore(t as 1|2|3|4|5|6|7))
        .toBeGreaterThan(tierToAuthorityScore((t + 1) as 1|2|3|4|5|6|7));
    }
  });
});

describe('validateSourceForVendor', () => {
  it('returns true when no query vendor specified', () => {
    expect(validateSourceForVendor('agilent-hplc-guide', null)).toBe(true);
  });

  it('returns true for non-vendor-specific sources', () => {
    expect(validateSourceForVendor('ich-m10-bioanalytical', 'Agilent')).toBe(true);
    expect(validateSourceForVendor('some-forum-post', 'Waters')).toBe(true);
  });

  it('returns true when vendor source matches query vendor', () => {
    expect(validateSourceForVendor('agilent-hplc-guide', 'Agilent')).toBe(true);
    expect(validateSourceForVendor('waters-ms-maintenance', 'Waters')).toBe(true);
  });

  it('returns false for cross-vendor misclassification', () => {
    expect(validateSourceForVendor('agilent-hplc-guide', 'Waters')).toBe(false);
    expect(validateSourceForVendor('waters-ms-maintenance', 'Agilent')).toBe(false);
    expect(validateSourceForVendor('shimadzu-lcms-guide', 'Agilent')).toBe(false);
  });
});

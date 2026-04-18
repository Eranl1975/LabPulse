import { describe, it, expect } from 'vitest';
import {
  scoreSourceQuality,
  scoreVendorAuthority,
  scoreScientificCredibility,
  scoreSpecificity,
  scoreRecency,
} from '@/agents/acquisition/pipeline/score';
import type { ExtractedItem } from '@/agents/acquisition/types';

const vendorItem: ExtractedItem = {
  technique: 'HPLC',
  instrument_family: 'Agilent 1290',
  model: '1290 Infinity II',
  issue_category: 'retention time shift',
  symptom: 'RT shifted',
  likely_causes: ['column degradation', 'mobile phase change', 'temperature'],
  diagnostics: ['check void volume', 'verify batch'],
  corrective_actions: ['replace column', 'remake mobile phase'],
  severity: 'medium',
  escalation_conditions: ['shift > 10%'],
  tags: ['hplc'],
  source_id: 'agilent-hplc-guide',
  source_type: 'vendor',
  source_title: 'Agilent Guide',
  source_url: 'https://agilent.com',
  publication_date: '2024-06-01',
  fetched_at: '2025-01-01T00:00:00Z',
};

const communityItem: ExtractedItem = {
  ...vendorItem,
  source_id: 'lcms-forum-post',
  source_type: 'community',
  instrument_family: 'generic',
  model: null,
  likely_causes: ['dirty liner'],
  diagnostics: ['check liner'],
  corrective_actions: ['replace liner'],
};

const nowMs = new Date('2025-06-01T00:00:00Z').getTime();

describe('scoreVendorAuthority', () => {
  it('returns 1.0 for known vendor prefix', () => {
    expect(scoreVendorAuthority('agilent-guide', 'vendor')).toBe(1.0);
    expect(scoreVendorAuthority('waters-ms', 'vendor')).toBe(1.0);
    expect(scoreVendorAuthority('restek-gc', 'vendor')).toBe(1.0);
  });

  it('returns 0.5 for scientific source type', () => {
    expect(scoreVendorAuthority('some-journal', 'scientific')).toBe(0.5);
  });

  it('returns 0.1 for community source', () => {
    expect(scoreVendorAuthority('forum-post', 'community')).toBe(0.1);
  });
});

describe('scoreScientificCredibility', () => {
  it('returns 0.9 for vendor source type', () => {
    expect(scoreScientificCredibility('vendor', 'anything')).toBe(0.9);
  });

  it('returns 1.0 for scientific source type', () => {
    expect(scoreScientificCredibility('scientific', 'anything')).toBe(1.0);
  });

  it('returns 0.2 for community', () => {
    expect(scoreScientificCredibility('community', 'forum')).toBe(0.2);
  });
});

describe('scoreSpecificity', () => {
  it('scores higher when model is specified', () => {
    const withModel    = scoreSpecificity(vendorItem);
    const withoutModel = scoreSpecificity({ ...vendorItem, model: null });
    expect(withModel).toBeGreaterThan(withoutModel);
  });

  it('scores higher for non-generic instrument family', () => {
    const specific = scoreSpecificity(vendorItem);
    const generic  = scoreSpecificity({ ...vendorItem, instrument_family: 'generic' });
    expect(specific).toBeGreaterThan(generic);
  });

  it('scores higher with more causes and actions', () => {
    const sparse = scoreSpecificity({ ...vendorItem, likely_causes: ['one'], corrective_actions: ['one'] });
    const rich   = scoreSpecificity(vendorItem);
    expect(rich).toBeGreaterThan(sparse);
  });

  it('caps at 1.0', () => {
    expect(scoreSpecificity(vendorItem)).toBeLessThanOrEqual(1.0);
  });
});

describe('scoreRecency', () => {
  it('returns 1.0 for publication within 1 year', () => {
    const recent = new Date(nowMs - 1000 * 60 * 60 * 24 * 100).toISOString().slice(0, 10);
    expect(scoreRecency(recent, nowMs)).toBe(1.0);
  });

  it('returns 0.30 for publication older than 5 years', () => {
    expect(scoreRecency('2015-01-01', nowMs)).toBe(0.30);
  });

  it('returns 0.5 for null publication date', () => {
    expect(scoreRecency(null, nowMs)).toBe(0.5);
  });
});

describe('scoreSourceQuality (composite)', () => {
  it('vendor source composite is higher than community source', () => {
    const v = scoreSourceQuality(vendorItem, 0, nowMs);
    const c = scoreSourceQuality(communityItem, 0, nowMs);
    expect(v.composite).toBeGreaterThan(c.composite);
  });

  it('popularity signal is capped and cannot lift community above vendor', () => {
    const v = scoreSourceQuality(vendorItem, 0, nowMs);
    const c = scoreSourceQuality(communityItem, 1.0, nowMs); // max popularity
    expect(v.composite).toBeGreaterThan(c.composite);
  });

  it('composite is between 0 and 1', () => {
    const score = scoreSourceQuality(vendorItem, 0.5, nowMs);
    expect(score.composite).toBeGreaterThan(0);
    expect(score.composite).toBeLessThanOrEqual(1);
  });

  it('all individual fields are in [0, 1]', () => {
    const score = scoreSourceQuality(vendorItem, 0, nowMs);
    expect(score.vendor_authority).toBeGreaterThanOrEqual(0);
    expect(score.scientific_credibility).toBeLessThanOrEqual(1);
    expect(score.specificity).toBeGreaterThanOrEqual(0);
    expect(score.recency).toBeLessThanOrEqual(1);
  });
});

import { describe, it, expect } from 'vitest';
import { labelForTier, labelForSource, labelForContentSource, labelForAction, EVIDENCE_LABELS } from '@/lib/evidence-labels';
import type { EvidenceSummaryV2, GenerationStatus, ActionDetail } from '@/lib/types';

function src(over: Partial<EvidenceSummaryV2> & { tier?: 1 | 2 | 3 | 4 | 5 | 6 | 7; url?: string | null } = {}): EvidenceSummaryV2 {
  const { tier, url, ...rest } = over;
  return {
    source_id: 'agilent-1290-manual',
    excerpt: '',
    evidence_strength: 'strong',
    classification: 'exact-model',
    source_metadata: tier === undefined ? null : {
      title: 'Manual', manufacturer_or_org: 'Agilent', doc_number: null, pub_date: null,
      url: url ?? null, page_or_section: null, classification: 'exact-model', tier,
    },
    ...rest,
  };
}

describe('evidence-label mapping onto the 7 tiers', () => {
  it('has exactly four labels', () => {
    expect(EVIDENCE_LABELS).toHaveLength(4);
  });

  it('tier 7 is always AI-generated', () => {
    expect(labelForTier(7, { hasDocumentOrUrl: true, internal: false })).toBe('AI-GENERATED RECOMMENDATION');
  });

  it('tiers 1–2 are official only with a real manufacturer document or URL', () => {
    expect(labelForTier(1, { hasDocumentOrUrl: true, internal: true })).toBe('OFFICIAL MANUFACTURER GUIDANCE');
    expect(labelForTier(2, { hasDocumentOrUrl: false, internal: true })).toBe('LABPULSE INTERNAL KNOWLEDGE');
    expect(labelForTier(2, { hasDocumentOrUrl: false, internal: false })).toBe('TECHNICAL / SCIENTIFIC SOURCE');
  });

  it('tiers 3–5 from outside LabPulse are technical/scientific', () => {
    for (const t of [3, 4, 5] as const) {
      expect(labelForTier(t, { hasDocumentOrUrl: true, internal: false })).toBe('TECHNICAL / SCIENTIFIC SOURCE');
    }
  });

  it('KB items and generic procedures are internal knowledge', () => {
    expect(labelForTier(6, { hasDocumentOrUrl: false, internal: true })).toBe('LABPULSE INTERNAL KNOWLEDGE');
  });

  it('labels an AI source as AI-generated even when it names a manufacturer', () => {
    expect(labelForSource(src({ source_id: 'claude-sonnet-4-6', classification: 'exact-model', tier: 1, url: 'https://agilent.com/x' }))).toBe('AI-GENERATED RECOMMENDATION');
    expect(labelForSource(src({ classification: 'ai-inference' }))).toBe('AI-GENERATED RECOMMENDATION');
  });

  it('labels an ingested vendor document with a URL as official', () => {
    expect(labelForSource(src({ tier: 1, url: 'https://www.agilent.com/manual.pdf' }))).toBe('OFFICIAL MANUFACTURER GUIDANCE');
  });

  it('labels a vendor-prefixed KB item without a document as internal knowledge', () => {
    expect(labelForSource(src({ tier: 2, url: null }))).toBe('LABPULSE INTERNAL KNOWLEDGE');
    expect(labelForSource(src())).toBe('LABPULSE INTERNAL KNOWLEDGE');
  });

  it('never presents an AI answer’s action as a manufacturer instruction', () => {
    const action = { action: 'Replace seal', evidence_source: 'Agilent 1290 manual (tier 1)' } as ActionDetail;
    expect(labelForAction(action, { content_source: 'ai' } as GenerationStatus)).toBe('AI-GENERATED RECOMMENDATION');
    expect(labelForAction(action, { content_source: 'knowledge_base' } as GenerationStatus)).toBe('LABPULSE INTERNAL KNOWLEDGE');
  });

  it('labels the recommendations from how the pipeline produced them', () => {
    expect(labelForContentSource('ai')).toBe('AI-GENERATED RECOMMENDATION');
    expect(labelForContentSource('generic_procedure')).toBe('LABPULSE INTERNAL KNOWLEDGE');
  });
});

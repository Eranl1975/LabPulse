import { describe, it, expect } from 'vitest';
import {
  hitToEvidence, mergeDocumentEvidence, buildGroundingContext, describeLocation,
} from '@/lib/document-evidence';
import type { DocumentHit } from '@/lib/document-types';
import type { RankedAnswerV2, EvidenceTier } from '@/lib/types';

function hit(over: Partial<DocumentHit> = {}): DocumentHit {
  return {
    document_id: 'agilent-guide',
    title: 'Agilent HPLC Troubleshooting Guide',
    vendor: 'Agilent',
    doc_type: 'troubleshooting_guide',
    document_number: 'D0133020',
    url: 'https://www.agilent.com/guide.pdf',
    publication_date: '2024-03-01',
    heading: 'High backpressure',
    page_number: 12,
    excerpt: 'Replace the guard column or inlet frit when pressure exceeds the limit.',
    tier: 1 as EvidenceTier,
    ...over,
  };
}

function answer(over: Partial<RankedAnswerV2> = {}): RankedAnswerV2 {
  return {
    problem_summary: 'High backpressure',
    likely_causes: [],
    checks: [],
    corrective_actions: [],
    stop_conditions: [],
    confidence: 0.5,
    evidence_summary: [],
    uncertainties: [],
    next_questions: [],
    missing_information: { missing_fields: [], critical_missing: [], follow_up_questions: [] },
    hypotheses: [],
    immediate_checks: [],
    verification_steps: [],
    escalation_criteria: [],
    sources_with_metadata: [],
    confidence_breakdown: {
      final_score: 0.5, label: 'moderate', caps_applied: [],
    } as unknown as RankedAnswerV2['confidence_breakdown'],
    method_dependent_flags: [],
    printable_checklist: [],
    reported_observations: [],
    confirmed_evidence: [],
    remaining_uncertainty: [],
    safety_warnings: [],
    verification_criteria: [],
    action_details: [],
    ...over,
  };
}

describe('describeLocation', () => {
  it('combines page and heading', () => {
    expect(describeLocation(hit())).toBe('p. 12 — High backpressure');
  });

  it('uses whichever part is present', () => {
    expect(describeLocation(hit({ page_number: null }))).toBe('High backpressure');
    expect(describeLocation(hit({ heading: null }))).toBe('p. 12');
    expect(describeLocation(hit({ heading: null, page_number: null }))).toBeNull();
  });
});

describe('hitToEvidence', () => {
  it('maps tier 1 to exact-model, strong evidence', () => {
    const e = hitToEvidence(hit({ tier: 1 }));
    expect(e.classification).toBe('exact-model');
    expect(e.evidence_strength).toBe('strong');
    expect(e.source_metadata?.doc_number).toBe('D0133020');
    expect(e.source_metadata?.page_or_section).toBe('p. 12 — High backpressure');
  });

  it('maps an application note to verified-technical, moderate evidence', () => {
    const e = hitToEvidence(hit({ tier: 5 }));
    expect(e.classification).toBe('verified-technical');
    expect(e.evidence_strength).toBe('moderate');
  });

  it('carries the vendor as the citing organisation', () => {
    expect(hitToEvidence(hit()).source_metadata?.manufacturer_or_org).toBe('Agilent');
  });
});

describe('mergeDocumentEvidence', () => {
  it('leaves the answer untouched when there are no hits', () => {
    const a = answer();
    const merged = mergeDocumentEvidence(a, []);
    expect(merged.added).toBe(0);
    expect(merged.answer).toBe(a);
  });

  it('adds document evidence to both evidence lists', () => {
    const merged = mergeDocumentEvidence(answer(), [hit()]);
    expect(merged.added).toBe(1);
    expect(merged.answer.sources_with_metadata).toHaveLength(1);
    expect(merged.answer.evidence_summary).toHaveLength(1);
  });

  it('orders vendor documentation ahead of AI inference', () => {
    const withAI = answer({
      sources_with_metadata: [{
        source_id: 'claude-sonnet-4-6',
        excerpt: 'Model reasoning',
        evidence_strength: 'weak',
        classification: 'ai-inference',
        source_metadata: {
          title: 'AI inference', manufacturer_or_org: null, doc_number: null,
          pub_date: null, url: null, page_or_section: null,
          classification: 'ai-inference', tier: 7,
        },
      }],
    });

    const merged = mergeDocumentEvidence(withAI, [hit({ tier: 1 })]);
    expect(merged.answer.sources_with_metadata[0].source_id).toBe('agilent-guide');
    expect(merged.answer.sources_with_metadata[1].source_id).toBe('claude-sonnet-4-6');
  });

  it('does not duplicate a document already cited', () => {
    const first = mergeDocumentEvidence(answer(), [hit()]);
    const second = mergeDocumentEvidence(first.answer, [hit()]);
    expect(second.added).toBe(0);
    expect(second.answer.sources_with_metadata).toHaveLength(1);
  });
});

describe('buildGroundingContext', () => {
  it('is empty when nothing was retrieved', () => {
    expect(buildGroundingContext([])).toBe('');
  });

  it('includes the citation details the model must reuse', () => {
    const ctx = buildGroundingContext([hit()]);
    expect(ctx).toContain('Agilent HPLC Troubleshooting Guide');
    expect(ctx).toContain('D0133020');
    expect(ctx).toContain('p. 12 — High backpressure');
    expect(ctx).toContain('https://www.agilent.com/guide.pdf');
  });

  it('instructs the model not to invent references', () => {
    expect(buildGroundingContext([hit()])).toMatch(/Do not invent/i);
    expect(buildGroundingContext([hit()])).toMatch(/tier 7/i);
  });

  it('respects the character budget', () => {
    const many = Array.from({ length: 50 }, (_, i) => hit({ document_id: `doc-${i}` }));
    const ctx = buildGroundingContext(many, 1200);
    expect(ctx.length).toBeLessThan(2000);
    expect(ctx).toContain('[DOC 1]');
  });
});

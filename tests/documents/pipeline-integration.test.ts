import { describe, it, expect, vi } from 'vitest';
import { runTroubleshootingPipeline, type AIFallbackFn } from '@/lib/troubleshooting-pipeline';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { DocumentHit } from '@/lib/document-types';
import type { EvidenceTier } from '@/lib/types';

const QUERY: RankingQueryV2 = {
  technique: 'HPLC',
  vendor: 'Agilent',
  model: 'G6170A',
  issue_category: 'high backpressure',
  symptom_description: 'System pressure exceeds the expected range during the run',
  method_conditions: null,
  already_checked: [],
  analyte: null, sample_matrix: null, column: null, mobile_phase: null,
  flow_rate: null, injection_volume: null, gradient: null, retention_time: null,
  ionization_mode: null, source_params: null, acquisition_mode: null,
  recent_maintenance: null, qc_results: null, expected_result: null,
  sst_plates: null, sst_tailing_factor: null, sst_resolution: null, sst_rsd_percent: null,
  sample_matrix_type: null, column_injection_count: null,
  is_method_transfer: false, source_instrument: null, source_vendor: null, source_model: null,
};

const HIT: DocumentHit = {
  document_id: 'agilent-guide',
  title: 'Agilent HPLC Troubleshooting Guide',
  vendor: 'Agilent',
  doc_type: 'troubleshooting_guide',
  document_number: 'D0133020',
  url: 'https://www.agilent.com/guide.pdf',
  publication_date: '2024-03-01',
  heading: 'High backpressure',
  page_number: 12,
  excerpt: 'Replace the guard column or inlet frit when system pressure exceeds the limit.',
  tier: 1 as EvidenceTier,
};

describe('document retrieval inside the troubleshooting pipeline', () => {
  it('cites a retrieved vendor document and records the outcome', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: false,
      documentSearch: async () => [HIT],
    });

    expect(generation.document_search).toBe('ok');
    expect(generation.documents_used).toBe(1);
    expect(answer.sources_with_metadata.some(s => s.source_id === 'agilent-guide')).toBe(true);
  });

  it('reports no_matches when the search returns nothing', async () => {
    const { generation } = await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: false,
      documentSearch: async () => [],
    });

    expect(generation.document_search).toBe('no_matches');
    expect(generation.documents_used).toBe(0);
  });

  it('reports unavailable rather than failing when the backend is absent', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: false,
      documentSearch: async () => null,
    });

    expect(generation.document_search).toBe('unavailable');
    // The answer is still produced.
    expect(answer.problem_summary.length).toBeGreaterThan(0);
  });

  it('never throws when the document search itself fails', async () => {
    const { answer, generation } = await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: false,
      documentSearch: async () => { throw new Error('connection reset'); },
    });

    expect(generation.document_search).toBe('unavailable');
    expect(answer).toBeDefined();
  });

  it('passes the retrieved documents to the AI layer as grounding', async () => {
    const aiFallback = vi.fn<AIFallbackFn>(async (_q, kb) => kb);

    await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: true,
      aiFallback,
      documentSearch: async () => [HIT],
    });

    expect(aiFallback).toHaveBeenCalled();
    const grounding = aiFallback.mock.calls[0][2];
    expect(grounding).toBeDefined();
    expect(grounding).toContain('D0133020');
    expect(grounding).toMatch(/Do not invent/i);
  });

  it('passes no grounding when nothing was retrieved', async () => {
    const aiFallback = vi.fn<AIFallbackFn>(async (_q, kb) => kb);

    await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: true,
      aiFallback,
      documentSearch: async () => [],
    });

    expect(aiFallback.mock.calls[0][2]).toBeUndefined();
  });

  it('does not return another vendor\'s document as evidence', async () => {
    // The search layer filters by vendor; the pipeline must not reintroduce one.
    const watersHit: DocumentHit = { ...HIT, document_id: 'waters-guide', vendor: 'Waters' };

    const { answer } = await runTroubleshootingPipeline(QUERY, {
      items: [],
      hasAIKey: false,
      documentSearch: async q => {
        expect(q.vendor).toBe('Agilent');
        // Simulate a correctly filtered backend: no cross-vendor rows come back.
        return [watersHit].filter(h => h.vendor === q.vendor);
      },
    });

    expect(answer.sources_with_metadata.some(s => s.source_id === 'waters-guide')).toBe(false);
  });
});

describe('regression: behaviour without any documents', () => {
  it('matches the pre-feature result when document search is disabled', async () => {
    const withDocs = await runTroubleshootingPipeline(QUERY, {
      items: [], hasAIKey: false, useDocuments: false,
    });

    expect(withDocs.generation.document_search).toBe('skipped');
    expect(withDocs.generation.documents_used).toBe(0);
    // The content guarantee still holds: a usable answer, not an empty report.
    expect(
      withDocs.answer.hypotheses.length > 0 || withDocs.answer.likely_causes.length > 0,
    ).toBe(true);
  });

  it('produces identical answer content with an empty search and no search', async () => {
    const disabled = await runTroubleshootingPipeline(QUERY, {
      items: [], hasAIKey: false, useDocuments: false,
    });
    const empty = await runTroubleshootingPipeline(QUERY, {
      items: [], hasAIKey: false, documentSearch: async () => [],
    });

    expect(empty.answer.likely_causes).toEqual(disabled.answer.likely_causes);
    expect(empty.answer.corrective_actions).toEqual(disabled.answer.corrective_actions);
    expect(empty.answer.sources_with_metadata).toEqual(disabled.answer.sources_with_metadata);
  });
});

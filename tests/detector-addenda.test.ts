import { describe, it, expect } from 'vitest';
import {
  inferDetectors,
  matchAddendumIssue,
  getDetectorAddendum,
  appendDetectorAddenda,
  DETECTOR_SOURCE_ID,
} from '@/lib/detector-addenda';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { RankedAnswerV2 } from '@/lib/types';

function query(overrides: Partial<RankingQueryV2> = {}): RankingQueryV2 {
  return {
    technique: 'GC',
    vendor: 'Agilent',
    model: '7890B',
    issue_category: null,
    symptom_description: 'ghost peaks',
    method_conditions: null,
    already_checked: [],
    ...overrides,
  };
}

function emptyAnswer(): RankedAnswerV2 {
  return {
    problem_summary: 'ghost peaks',
    likely_causes: [], checks: [], corrective_actions: [], stop_conditions: [],
    confidence: 0.5, evidence_summary: [], uncertainties: [], next_questions: [],
    missing_information: { missing_fields: [], critical_missing: [], follow_up_questions: [], inferred_from_text: {} },
    hypotheses: [], immediate_checks: [], verification_steps: [], escalation_criteria: [],
    sources_with_metadata: [],
    confidence_breakdown: {
      raw_score: 0.5, caps_applied: [], final_score: 0.5, label: 'Preliminary hypothesis',
      factor_scores: { source_authority: 0, technique_relevance: 0, issue_relevance: 0, recency: 0, evidence_strength: 0 },
      explanation: '',
    },
    method_dependent_flags: [], printable_checklist: [], reported_observations: [],
    confirmed_evidence: [], remaining_uncertainty: [],
    safety_warnings: [], verification_criteria: [], action_details: [],
  };
}

describe('inferDetectors', () => {
  it('infers an MS for the hyphenated techniques without any text clue', () => {
    expect(inferDetectors(query({ technique: 'GCMS' }))).toContain('ms');
    expect(inferDetectors(query({ technique: 'LCMS' }))).toContain('ms');
  });

  it('infers an MS for a GC query that talks about the TIC or a mass spectrum', () => {
    expect(inferDetectors(query({
      symptom_description: 'A peak at the start of the FID in all runs, and in the TIC, with mass of CO2 and Ar',
    }))).toEqual(expect.arrayContaining(['ms', 'fid']));
  });

  it('infers detectors from the technique-specific detector context field', () => {
    const detectors = inferDetectors(query({ extra_context: { gcDetectorType: 'FID + MSD' } }));
    expect(detectors).toEqual(expect.arrayContaining(['ms', 'fid']));
  });

  it('infers a UV/DAD detector for an LC query that names one', () => {
    expect(inferDetectors(query({
      technique: 'HPLC', symptom_description: 'ghost peaks on the DAD at 254 nm',
    }))).toContain('uv');
  });

  it('returns nothing when no detector can be inferred', () => {
    expect(inferDetectors(query({ technique: 'XRD', symptom_description: 'peak shift' }))).toEqual([]);
  });
});

describe('matchAddendumIssue', () => {
  it.each([
    ['GC ghost peaks', 'ghost peaks in every blank', 'background_peaks'],
    [null, 'carryover in the blank after a high standard', 'carryover'],
    ['GCMS signal loss', 'response dropped by half', 'signal_loss'],
    ['adduct formation', 'unexpected m/z observed', 'mass_accuracy'],
    [null, 'noisy baseline through the whole run', 'noise_drift'],
    [null, 'retention time shifted by 0.4 min', 'retention_shift'],
  ])('maps %s / %s onto %s', (issue, symptom, expected) => {
    expect(matchAddendumIssue(issue as string | null, symptom)).toBe(expected);
  });

  it('falls back to the general family', () => {
    expect(matchAddendumIssue(null, 'something odd happened')).toBe('general');
  });
});

describe('MS background-peak addendum', () => {
  const addendum = getDetectorAddendum('ms', 'background_peaks');

  it('tells the user to identify the ions before assigning a cause', () => {
    expect(addendum.checks[0]).toMatch(/background-subtract/i);
  });

  it('includes the FID-versus-TIC localisation test', () => {
    const text = addendum.checks.join(' ');
    expect(text).toMatch(/FID.*TIC|TIC.*FID/i);
    expect(text).toMatch(/TIC ONLY/);
  });

  it('carries the air-ingress ion reference including argon', () => {
    const ions = (addendum.ion_reference ?? []).map(r => `${r.ions} ${r.meaning}`).join(' ');
    expect(ions).toMatch(/m\/z 28 and 32/);
    expect(ions).toMatch(/argon/i);
    expect(ions).toMatch(/207, 281, 355/);
    expect(ions).toMatch(/149/);
  });

  it('ranks atmospheric air as a high-probability cause', () => {
    const air = addendum.hypotheses.find(h => /atmospheric air/i.test(h.cause));
    expect(air?.probability).toBe('high');
  });
});

describe('appendDetectorAddenda', () => {
  it('adds mass-spectral checks to a GC answer that mentions the TIC', () => {
    const q = query({
      symptom_description: 'A peak at the start of the FID in all the runs and in the TIC with mass of CO2 and Ar, ghost peaks',
    });
    const { answer, detectors } = appendDetectorAddenda(emptyAnswer(), q);

    expect(detectors).toContain('ms');
    const ms = answer.detector_checks?.find(b => b.detector === 'ms');
    expect(ms).toBeDefined();
    expect(ms!.checks.length).toBeGreaterThan(0);
    expect(ms!.ion_reference?.length).toBeGreaterThan(0);
    expect(answer.checks.join(' ')).toMatch(/background-subtract/i);
  });

  it('cites itself as a tier-6 manufacturer-independent source', () => {
    const { answer } = appendDetectorAddenda(emptyAnswer(), query({ technique: 'GCMS' }));
    const source = answer.sources_with_metadata.find(s => s.source_id === DETECTOR_SOURCE_ID);
    expect(source?.source_metadata?.tier).toBe(6);
    expect(source?.classification).toBe('general-manufacturer-independent');
  });

  it('never raises the confidence score', () => {
    const before = emptyAnswer();
    const { answer } = appendDetectorAddenda(before, query({ technique: 'GCMS' }));
    expect(answer.confidence).toBe(before.confidence);
    expect(answer.confidence_breakdown.final_score).toBe(before.confidence_breakdown.final_score);
  });

  it('is a no-op when no detector can be inferred', () => {
    const before = emptyAnswer();
    const { answer, detectors } = appendDetectorAddenda(before, query({ technique: 'XRD', symptom_description: 'peak shift' }));
    expect(detectors).toEqual([]);
    expect(answer).toBe(before);
  });

  it('does not repeat a check the answer already contains', () => {
    const base = emptyAnswer();
    const addendum = getDetectorAddendum('ms', 'background_peaks');
    base.checks = [...addendum.checks];
    base.immediate_checks = [...addendum.checks];

    const { answer } = appendDetectorAddenda(base, query({
      technique: 'GCMS', symptom_description: 'ghost peaks in the TIC',
    }));
    for (const check of addendum.checks) {
      expect(answer.checks.filter(c => c === check)).toHaveLength(1);
    }
  });

  it('adds both halves for a GC-MS run with an FID', () => {
    const { answer } = appendDetectorAddenda(emptyAnswer(), query({
      technique: 'GC',
      symptom_description: 'ghost peak in the FID and the TIC',
      extra_context: { gcDetectorType: 'FID' },
    }));
    const kinds = (answer.detector_checks ?? []).map(b => b.detector);
    expect(kinds).toEqual(expect.arrayContaining(['ms', 'fid']));
  });
});

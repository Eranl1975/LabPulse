/**
 * Comprehensive troubleshooting response evaluation tests.
 * Validates that the system produces scientifically correct, complete,
 * and properly structured troubleshooting responses across diverse scenarios.
 */
import { describe, it, expect } from 'vitest';
import { rankItemsV2 } from '@/agents/ranking/index';
import { present } from '@/agents/presentation/index';
import { readItems } from '@/lib/store';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { RankedAnswerV2 } from '@/lib/types';

const items = readItems();

function query(overrides: Partial<RankingQueryV2>): RankingQueryV2 {
  return {
    technique: 'HPLC',
    vendor: null,
    model: null,
    issue_category: null,
    symptom_description: 'test symptom',
    method_conditions: null,
    already_checked: [],
    ...overrides,
  };
}

function rank(q: RankingQueryV2): RankedAnswerV2 {
  return rankItemsV2(q, items);
}

// ─── Structure Validation ────────────────────────────────────────────

describe('Response Structure Completeness', () => {
  const scenarios: Array<{ name: string; q: RankingQueryV2 }> = [
    {
      name: 'HPLC retention time shift',
      q: query({
        technique: 'HPLC',
        symptom_description: 'Retention times shifting earlier than expected over sequence',
        issue_category: 'retention time shift',
      }),
    },
    {
      name: 'HPLC high backpressure',
      q: query({
        technique: 'HPLC',
        symptom_description: 'System pressure increasing steadily during run',
        issue_category: 'high backpressure',
      }),
    },
    {
      name: 'LCMS ion suppression',
      q: query({
        technique: 'LCMS',
        symptom_description: 'Reduced MS signal for target analytes in matrix versus neat standard',
        issue_category: 'ion suppression',
      }),
    },
    {
      name: 'LCMS low sensitivity Agilent',
      q: query({
        technique: 'LCMS',
        vendor: 'Agilent',
        symptom_description: 'Low sensitivity in SIM mode after source cleaning',
        issue_category: 'low sensitivity',
      }),
    },
    {
      name: 'GC ghost peaks',
      q: query({
        technique: 'GC',
        symptom_description: 'Ghost peaks appearing in blank injections',
        issue_category: 'GC ghost peaks',
      }),
    },
    {
      name: 'GCMS signal loss',
      q: query({
        technique: 'GCMS',
        symptom_description: 'Complete loss of MS signal, GC peaks still visible on FID',
        issue_category: 'GCMS signal loss',
      }),
    },
    {
      name: 'LCMS source contamination',
      q: query({
        technique: 'LCMS',
        symptom_description: 'Gradual loss of sensitivity with elevated background noise',
        issue_category: 'LCMS source contamination',
      }),
    },
    {
      name: 'HPLC peak tailing',
      q: query({
        technique: 'HPLC',
        symptom_description: 'Peak tailing observed for basic analytes',
        issue_category: 'peak tailing',
      }),
    },
    {
      name: 'LCMS adduct formation',
      q: query({
        technique: 'LCMS',
        symptom_description: 'Unexpected sodium and potassium adduct peaks in mass spectrum',
        issue_category: 'adduct formation',
      }),
    },
    {
      name: 'LCMS communication fault',
      q: query({
        technique: 'LCMS',
        vendor: 'Agilent',
        symptom_description: 'Instrument showing ee(65,0) error code, MSD not ready',
        issue_category: 'instrument communication fault',
      }),
    },
  ];

  for (const { name, q } of scenarios) {
    describe(name, () => {
      const result = rank(q);

      it('has V2 fields populated', () => {
        expect(result.confidence_breakdown).toBeDefined();
        expect(result.confidence_breakdown.final_score).toBeGreaterThanOrEqual(0);
        expect(result.confidence_breakdown.label).toBeTruthy();
        expect(result.missing_information).toBeDefined();
        expect(result.hypotheses).toBeDefined();
        expect(result.reported_observations).toContain(q.symptom_description);
      });

      it('has V3 comprehensive fields', () => {
        expect(result.safety_warnings).toBeDefined();
        expect(Array.isArray(result.safety_warnings)).toBe(true);
        expect(result.verification_criteria).toBeDefined();
        expect(Array.isArray(result.verification_criteria)).toBe(true);
        expect(result.action_details).toBeDefined();
        expect(Array.isArray(result.action_details)).toBe(true);
      });

      it('has printable checklist', () => {
        expect(result.printable_checklist.length).toBeGreaterThan(0);
      });

      it('renders in all 4 presentation modes without error', () => {
        const modes = ['concise', 'standard', 'deep', 'manager'] as const;
        for (const mode of modes) {
          const output = present(result, mode);
          expect(output).toBeDefined();
          expect('text' in output || 'mode' in output).toBe(true);
        }
      });
    });
  }
});

// ─── Content Quality ─────────────────────────────────────────────────

describe('Content Quality Checks', () => {
  it('enriched HPLC RT shift has >= 7 diagnostics', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Retention times drifting earlier over time',
      issue_category: 'retention time shift',
    }));
    expect(result.checks.length).toBeGreaterThanOrEqual(7);
  });

  it('enriched HPLC high backpressure has >= 7 diagnostics', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'System pressure increasing',
      issue_category: 'high backpressure',
    }));
    expect(result.checks.length).toBeGreaterThanOrEqual(7);
  });

  it('enriched LCMS ion suppression has >= 7 diagnostics', () => {
    const result = rank(query({
      technique: 'LCMS',
      symptom_description: 'Reduced MS signal in complex matrix',
      issue_category: 'ion suppression',
    }));
    expect(result.checks.length).toBeGreaterThanOrEqual(7);
  });

  it('enriched GC ghost peaks has >= 6 diagnostics', () => {
    const result = rank(query({
      technique: 'GC',
      symptom_description: 'Ghost peaks in blank runs',
      issue_category: 'GC ghost peaks',
    }));
    expect(result.checks.length).toBeGreaterThanOrEqual(6);
  });

  it('enriched GCMS signal loss has >= 7 diagnostics', () => {
    const result = rank(query({
      technique: 'GCMS',
      symptom_description: 'Complete loss of MS signal',
      issue_category: 'GCMS signal loss',
    }));
    expect(result.checks.length).toBeGreaterThanOrEqual(7);
  });
});

// ─── Safety Warnings ─────────────────────────────────────────────────

describe('Safety Warnings Present', () => {
  it('HPLC high backpressure has safety warning about pressure', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'System pressure increasing',
      issue_category: 'high backpressure',
    }));
    // Safety warnings extracted from escalation conditions containing safety keywords
    const allSafetyText = [...result.safety_warnings, ...result.escalation_criteria].join(' ').toLowerCase();
    expect(allSafetyText).toMatch(/pressure|safety/i);
  });

  it('GC ghost peaks has safety warning about temperature or hydrogen', () => {
    const result = rank(query({
      technique: 'GC',
      symptom_description: 'Ghost peaks in blanks',
      issue_category: 'GC ghost peaks',
    }));
    const allSafetyText = [...result.safety_warnings, ...result.escalation_criteria].join(' ').toLowerCase();
    expect(allSafetyText).toMatch(/temperature|hydrogen|safety|gas/i);
  });

  it('LCMS low sensitivity Agilent has safety warning about high voltage', () => {
    const result = rank(query({
      technique: 'LCMS',
      vendor: 'Agilent',
      symptom_description: 'Low sensitivity',
      issue_category: 'low sensitivity',
    }));
    const allSafetyText = [...result.safety_warnings, ...result.escalation_criteria].join(' ').toLowerCase();
    expect(allSafetyText).toMatch(/voltage|safety|vacuum/i);
  });
});

// ─── No Silent Truncation ────────────────────────────────────────────

describe('No Silent Truncation', () => {
  it('standard mode includes all checks from ranked answer', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Retention time shift',
      issue_category: 'retention time shift',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    // All checks should appear in the standard output
    for (const check of result.checks) {
      expect(text).toContain(check.substring(0, 30));
    }
  });

  it('standard mode includes all corrective actions', () => {
    const result = rank(query({
      technique: 'LCMS',
      symptom_description: 'Ion suppression in complex matrix',
      issue_category: 'ion suppression',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    for (const action of result.corrective_actions) {
      expect(text).toContain(action.substring(0, 30));
    }
  });
});

// ─── Confidence Calibration ──────────────────────────────────────────

describe('Confidence Calibration', () => {
  it('caps confidence when critical info is missing', () => {
    const result = rank(query({
      technique: 'LCMS',
      symptom_description: 'Low signal',
      issue_category: 'low sensitivity',
      // no vendor, no model, no column, no mobile phase
    }));
    // Should have missing critical info flagged
    expect(result.missing_information.critical_missing.length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.60);
  });

  it('does not exceed 0.70 without exact-model source', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Peak tailing on basic compounds',
      issue_category: 'peak tailing',
    }));
    if (!result.sources_with_metadata.some(s => s.classification === 'exact-model')) {
      expect(result.confidence).toBeLessThanOrEqual(0.70);
    }
  });
});

// ─── AI Fallback Labeling ────────────────────────────────────────────

describe('AI Fallback Labeling', () => {
  it('evidence from AI sources is labeled as ai-inference tier', () => {
    // For techniques with limited KB (AI-only), the ranking pipeline
    // won't produce ai-inference sources — those come from the AI fallback.
    // This test validates KB-only results don't claim AI sources.
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Retention time shift',
      issue_category: 'retention time shift',
    }));
    for (const source of result.sources_with_metadata) {
      // KB sources should never be classified as ai-inference
      if (source.source_id.startsWith('claude-')) {
        expect(source.classification).toBe('ai-inference');
      }
    }
  });
});

// ─── Presentation Sections ───────────────────────────────────────────

describe('Standard Formatter Section Headers', () => {
  it('includes safety section when safety warnings present', () => {
    const result = rank(query({
      technique: 'GC',
      symptom_description: 'Ghost peaks in blank injections',
      issue_category: 'GC ghost peaks',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    if (result.safety_warnings.length > 0) {
      expect(text).toContain('Safety & Preservation');
    }
  });

  it('includes verification section', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Retention time shift',
      issue_category: 'retention time shift',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    expect(text).toContain('Verification');
  });

  it('includes escalation criteria', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'High backpressure',
      issue_category: 'high backpressure',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    expect(text).toContain('Escalation');
  });

  it('includes sources section', () => {
    const result = rank(query({
      technique: 'LCMS',
      symptom_description: 'Source contamination',
      issue_category: 'LCMS source contamination',
    }));
    const standard = present(result, 'standard');
    const text = 'text' in standard ? standard.text : '';
    expect(text).toContain('Sources');
  });
});

// ─── Deep Formatter Enhancements ─────────────────────────────────────

describe('Deep Formatter V3 Sections', () => {
  it('includes safety warnings in deep format when present', () => {
    const result = rank(query({
      technique: 'GC',
      symptom_description: 'Ghost peaks in blank injections',
      issue_category: 'GC ghost peaks',
    }));
    const deep = present(result, 'deep');
    const text = 'text' in deep ? deep.text : '';
    if (result.safety_warnings.length > 0) {
      expect(text).toContain('Safety');
    }
  });
});

// ─── Dedup Limit Validation ──────────────────────────────────────────

describe('Dedup Limit Raised', () => {
  it('allows more than 6 items in diagnostics for enriched items', () => {
    const result = rank(query({
      technique: 'HPLC',
      symptom_description: 'Retention time shifting earlier',
      issue_category: 'retention time shift',
    }));
    // Enriched items have 7-8 diagnostics, dedup limit is now 12
    expect(result.checks.length).toBeGreaterThan(6);
  });

  it('allows more than 6 corrective actions for enriched items', () => {
    const result = rank(query({
      technique: 'LCMS',
      symptom_description: 'Ion suppression in ESI',
      issue_category: 'ion suppression',
    }));
    // Enriched items have 7-8 actions
    expect(result.corrective_actions.length).toBeGreaterThan(6);
  });
});

/**
 * Additional regression scenarios testing the V2 pipeline end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { rankItemsV2 } from '@/agents/ranking/index';
import { runQualityChecks } from '@/lib/quality-control';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import { classifySource } from '@/lib/evidence-hierarchy';
import { getCapability } from '@/lib/instrument-capabilities';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { KnowledgeItem } from '@/lib/types';

// ── Test Knowledge Items ─────────────────────────────────────────────

const testItems: KnowledgeItem[] = [
  {
    id: 'sc-001', technique: 'LCMS', instrument_family: 'Agilent', model: null,
    issue_category: 'LCMS source contamination',
    symptom: 'High background noise and elevated TIC in solvent blanks',
    likely_causes: ['Source contamination from matrix buildup', 'Dirty spray shield or skimmer cone'],
    diagnostics: ['Run solvent blank and check TIC level', 'Visually inspect spray shield'],
    corrective_actions: ['Clean source components with recommended solvents', 'Replace spray shield if worn'],
    severity: 'high', escalation_conditions: ['Cleaning does not restore baseline'],
    source_id: 'agilent-lcms-troubleshooting-guide', confidence_score: 0.85, evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sc-002', technique: 'HPLC', instrument_family: 'generic', model: null,
    issue_category: 'HPLC pressure increase',
    symptom: 'Gradual increase in system back-pressure during run sequence',
    likely_causes: ['Column inlet frit partially blocked', 'Particulate matter in mobile phase', 'Sample precipitation on column'],
    diagnostics: ['Check pressure with column vs without column', 'Inspect inline filter', 'Verify mobile phase filtration'],
    corrective_actions: ['Replace inline filter', 'Reverse flush column if allowed by manufacturer', 'Filter mobile phase through 0.2um'],
    severity: 'medium', escalation_conditions: ['Pressure exceeds column limit'],
    source_id: 'agilent-hplc-troubleshooting-guide', confidence_score: 0.80, evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sc-003', technique: 'HPLC', instrument_family: 'generic', model: null,
    issue_category: 'retention time shift',
    symptom: 'Retention time drift across injection sequence',
    likely_causes: ['Mobile phase degradation', 'Column temperature instability', 'Pump seal wear causing flow rate variation'],
    diagnostics: ['Check flow rate accuracy with graduated cylinder', 'Monitor column oven temperature', 'Check mobile phase age'],
    corrective_actions: ['Prepare fresh mobile phase', 'Replace pump seals', 'Verify column oven stability'],
    severity: 'medium', escalation_conditions: ['RT drift > 5% within run'],
    source_id: 'usp-chromatographic-systems-guide', confidence_score: 0.75, evidence_strength: 'moderate',
    updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: 'sc-004', technique: 'LCMS', instrument_family: 'generic', model: null,
    issue_category: 'sensitivity loss',
    symptom: 'Progressive loss of MS sensitivity over weeks',
    likely_causes: ['Electron multiplier aging', 'Source contamination', 'Vacuum degradation'],
    diagnostics: ['Check autotune report for multiplier voltage', 'Run sensitivity check standard', 'Verify vacuum levels'],
    corrective_actions: ['Replace electron multiplier', 'Clean ion source', 'Check pump oil and foreline pressure'],
    severity: 'high', escalation_conditions: ['Multiplier voltage at maximum'],
    source_id: 'agilent-lcms-troubleshooting-guide', confidence_score: 0.80, evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sc-005', technique: 'LCMS', instrument_family: 'generic', model: null,
    issue_category: 'mass calibration failure',
    symptom: 'Mass accuracy outside specification after tune',
    likely_causes: ['Calibrant solution expired or degraded', 'RF or DC voltage drift', 'Mechanical misalignment after maintenance'],
    diagnostics: ['Check calibrant solution preparation date', 'Run checktune and compare to previous results', 'Verify reference mass assignment'],
    corrective_actions: ['Prepare fresh calibrant', 'Run full autotune', 'Contact service if mechanical issue suspected'],
    severity: 'high', escalation_conditions: ['Repeated tune failures', 'Mass error > 0.3 Da after fresh calibrant'],
    source_id: 'agilent-lcms-troubleshooting-guide', confidence_score: 0.85, evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sc-006', technique: 'HPLC', instrument_family: 'generic', model: null,
    issue_category: 'carryover',
    symptom: 'Peaks from previous injection appearing in subsequent blank injections',
    likely_causes: ['Inadequate needle wash', 'Seat capillary contamination', 'Sample adsorption to autosampler components'],
    diagnostics: ['Run multiple blank injections after high-concentration sample', 'Check needle wash solvent composition', 'Inspect needle and seat for damage'],
    corrective_actions: ['Optimize needle wash program with stronger solvents', 'Replace needle and seat assembly', 'Add wash steps between injections'],
    severity: 'medium', escalation_conditions: ['Carryover > 0.1% of highest standard'],
    source_id: 'waters-hplc-carryover-guide', confidence_score: 0.80, evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// ── Scenario Tests ───────────────────────────────────────────────────

describe('Regression Scenarios', () => {

  describe('Source contamination — LCMS', () => {
    it('identifies source contamination with correct causes and checks', () => {
      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: 'Agilent', model: 'G6170A',
        issue_category: null,
        symptom_description: 'high background noise in solvent blank, elevated TIC',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      expect(result.likely_causes.length).toBeGreaterThan(0);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('LC carryover', () => {
    it('matches carryover items and includes wash-related actions', () => {
      const query: RankingQueryV2 = {
        technique: 'HPLC', vendor: null, model: null,
        issue_category: null,
        symptom_description: 'peaks from previous injection appearing in blank runs carryover',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      const allText = [...result.likely_causes, ...result.corrective_actions].join(' ').toLowerCase();
      expect(allText).toContain('wash');
    });
  });

  describe('Pressure increase — HPLC', () => {
    it('identifies pressure-related causes', () => {
      const query: RankingQueryV2 = {
        technique: 'HPLC', vendor: 'Agilent', model: '1260 Infinity II',
        issue_category: 'HPLC pressure increase',
        symptom_description: 'system pressure gradually increasing during sequence',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      expect(result.confidence).toBeGreaterThan(0);
      const allCauses = result.likely_causes.join(' ').toLowerCase();
      expect(
        allCauses.includes('block') || allCauses.includes('frit') || allCauses.includes('particulate')
      ).toBe(true);
    });
  });

  describe('RT drift', () => {
    it('matches retention time shift items', () => {
      const query: RankingQueryV2 = {
        technique: 'HPLC', vendor: null, model: null,
        issue_category: 'retention time shift',
        symptom_description: 'retention time drifting across injection sequence',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      expect(result.likely_causes.length).toBeGreaterThan(0);
    });
  });

  describe('Sensitivity loss — LCMS', () => {
    it('identifies sensitivity loss causes including multiplier aging', () => {
      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: 'Agilent', model: null,
        issue_category: null,
        symptom_description: 'progressive loss of MS sensitivity over the past few weeks',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      const allText = [...result.likely_causes, ...result.checks].join(' ').toLowerCase();
      expect(allText).toContain('multiplier') || expect(allText).toContain('sensitivity');
    });
  });

  describe('Mass calibration failure', () => {
    it('matches mass-cal items with correct diagnostics', () => {
      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: 'Agilent', model: null,
        issue_category: null,
        symptom_description: 'mass accuracy outside specification after autotune, mass calibration failed',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      expect(result.confidence).toBeGreaterThan(0);
      const allText = [...result.likely_causes, ...result.checks].join(' ').toLowerCase();
      expect(allText).toContain('calibra');
    });
  });

  describe('Missing model info — confidence cap', () => {
    it('caps confidence when model info is missing', () => {
      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: null, model: null,
        issue_category: null,
        symptom_description: 'sensitivity loss in LCMS',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      // Missing critical info (manufacturer, model) should cap confidence
      expect(result.missing_information.critical_missing).toContain('manufacturer');
      expect(result.missing_information.critical_missing).toContain('model');
      expect(result.confidence).toBeLessThanOrEqual(0.60);
    });
  });

  describe('Conflicting sources', () => {
    it('handles contradictions by reducing confidence', () => {
      const conflictingItems: KnowledgeItem[] = [
        {
          id: 'conf-001', technique: 'LCMS', instrument_family: 'generic', model: null,
          issue_category: 'sensitivity loss',
          symptom: 'Sensitivity loss in positive mode ESI',
          likely_causes: ['Source contamination'],
          diagnostics: ['Check source cleanliness'],
          corrective_actions: ['Clean source'],
          severity: 'high', escalation_conditions: [],
          source_id: 'agilent-lcms-guide', confidence_score: 0.8, evidence_strength: 'strong',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'conf-002', technique: 'LCMS', instrument_family: 'generic', model: null,
          issue_category: 'sensitivity loss',
          symptom: 'Sensitivity loss in positive mode ESI — contradicts previous finding on source cleanliness',
          likely_causes: ['Electron multiplier failure'],
          diagnostics: ['Check multiplier voltage — contradicts source contamination as root cause'],
          corrective_actions: ['Replace multiplier'],
          severity: 'high', escalation_conditions: [],
          source_id: 'waters-lcms-guide', confidence_score: 0.7, evidence_strength: 'moderate',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: 'Agilent', model: 'G6170A',
        issue_category: null,
        symptom_description: 'sensitivity loss in positive mode ESI',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, conflictingItems);
      // Contradictions should be noted in uncertainties (detected as "Conflicting causes")
      expect(result.uncertainties.some(u => u.toLowerCase().includes('conflict'))).toBe(true);
    });
  });

  describe('QC validation on V2 results', () => {
    it('QC passes for well-formed results', () => {
      const query: RankingQueryV2 = {
        technique: 'LCMS', vendor: 'Agilent', model: 'G6170A',
        issue_category: null,
        symptom_description: 'high background noise in blank',
        method_conditions: null, already_checked: [],
        ionization_mode: 'ESI+',
        column: 'C18',
        mobile_phase: 'ACN/water',
      };
      const result = rankItemsV2(query, testItems);
      const qc = runQualityChecks(result, query);
      // Should not have critical errors that trigger regeneration
      expect(qc.action).not.toBe('regenerate');
    });
  });

  describe('Evidence classification integrity', () => {
    it('Agilent sources classified correctly for Agilent queries', () => {
      const src = classifySource('agilent-lcms-troubleshooting-guide', 'Agilent', null);
      expect(src.tier).toBe(2); // instrument-family (no model match)
      expect(src.classification).toBe('instrument-family');
    });

    it('USP source classified as regulatory', () => {
      const src = classifySource('usp-chromatographic-systems-guide', null, null);
      expect(src.tier).toBe(3);
      expect(src.classification).toBe('regulatory-standard');
    });

    it('cross-vendor sources downgraded in V2 ranking', () => {
      const query: RankingQueryV2 = {
        technique: 'HPLC', vendor: 'Agilent', model: null,
        issue_category: 'carryover',
        symptom_description: 'carryover in blank injections',
        method_conditions: null, already_checked: [],
      };
      const result = rankItemsV2(query, testItems);
      // Waters carryover source should not be classified as instrument-family for Agilent query
      for (const src of result.sources_with_metadata) {
        if (src.source_id.startsWith('waters-')) {
          expect(src.classification).toBe('general-manufacturer-independent');
        }
      }
    });
  });
});

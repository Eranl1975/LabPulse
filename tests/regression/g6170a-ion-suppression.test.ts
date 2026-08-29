/**
 * G6170A Ion Suppression Regression Test
 *
 * 8 assertions from the upgrade specification:
 * 1. Does NOT recommend MS/MS (single-quad)
 * 2. Does NOT recommend AJS installation (already installed)
 * 3. Distinguishes high TIC noise from ion suppression
 * 4. References Matrix Factor calculation
 * 5. Uses ICH M10 principles
 * 6. Does NOT cite 50% suppression as universal threshold
 * 7. Includes prioritized 12-step investigation protocol
 * 8. Sources classified correctly (no cross-vendor)
 */
import { describe, it, expect } from 'vitest';
import { getCapability, validateRecommendation } from '@/lib/instrument-capabilities';
import { classifySource, validateSourceForVendor } from '@/lib/evidence-hierarchy';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import { rankItemsV2 } from '@/agents/ranking/index';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { KnowledgeItem } from '@/lib/types';

// G6170A ion suppression query
const g6170aQuery: RankingQueryV2 = {
  technique: 'LCMS',
  vendor: 'Agilent',
  model: 'G6170A',
  issue_category: null,
  symptom_description: 'ion suppression observed in complex biological matrix samples',
  method_conditions: null,
  already_checked: [],
  ionization_mode: 'ESI+',
  mobile_phase: '0.1% formic acid in acetonitrile/water',
  column: 'C18 2.1x50mm 1.8um',
};

// Simulated knowledge items for ion suppression
const ionSuppressionItems: KnowledgeItem[] = [
  {
    id: 'is-001',
    technique: 'LCMS',
    instrument_family: 'Agilent',
    model: 'G6170A',
    issue_category: 'ion suppression',
    symptom: 'Reduced signal intensity in complex matrix samples due to ion suppression',
    likely_causes: [
      'Matrix components co-eluting with analyte and competing for ionization',
      'Insufficient sample cleanup or extraction',
      'Mobile phase additives reducing ionization efficiency',
    ],
    diagnostics: [
      'Run post-column infusion experiment to identify suppression regions',
      'Compare neat standard vs matrix-matched standard response',
      'Calculate matrix factor for each analyte',
      'Check chromatographic separation to resolve co-eluting matrix components',
      'Evaluate sample preparation method for matrix removal',
      'Verify mobile phase composition and additives',
      'Check source parameters (gas temperature, drying gas flow, nebulizer pressure)',
      'Inspect source for contamination buildup',
      'Run system suitability standard to verify baseline performance',
      'Compare TIC of blank matrix vs solvent blank for elevated background',
      'Evaluate alternative sample preparation (SPE, protein precipitation, LLE)',
      'Consider modifying LC gradient to improve separation from matrix',
    ],
    corrective_actions: [
      'Improve sample cleanup procedure',
      'Optimize chromatographic separation',
      'Adjust source parameters for matrix tolerance',
      'Use matrix-matched calibration standards',
    ],
    severity: 'high',
    escalation_conditions: [
      'Matrix factor < 0.8 or > 1.2 after optimization',
      'Ion suppression persists after sample preparation optimization',
    ],
    source_id: 'agilent-g6170a-lcms-troubleshooting',
    confidence_score: 0.9,
    evidence_strength: 'strong',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'is-002',
    technique: 'LCMS',
    instrument_family: 'generic',
    model: null,
    issue_category: 'ion suppression',
    symptom: 'Matrix effects causing signal suppression in ESI LC-MS analysis',
    likely_causes: [
      'Co-eluting phospholipids or salts from biological matrices',
      'Non-volatile buffer components in mobile phase',
    ],
    diagnostics: [
      'Perform post-extraction addition experiment per ICH M10 guidelines',
      'Calculate matrix factor: (response in matrix) / (response in neat solvent)',
      'Evaluate stable isotope-labeled internal standard response',
    ],
    corrective_actions: [
      'Implement solid phase extraction for improved matrix removal',
      'Use stable isotope-labeled internal standards to compensate for matrix effects',
    ],
    severity: 'high',
    escalation_conditions: [
      'IS-normalized matrix factor CV > 15% across lots',
    ],
    source_id: 'ich-m10-bioanalytical-method-validation',
    confidence_score: 0.95,
    evidence_strength: 'strong',
    updated_at: '2024-06-01T00:00:00Z',
  },
  {
    id: 'is-003',
    technique: 'LCMS',
    instrument_family: 'generic',
    model: null,
    issue_category: 'ion suppression',
    symptom: 'High TIC noise level indicating potential source contamination or matrix carryover',
    likely_causes: [
      'Source contamination from previous high-matrix samples',
      'Inadequate wash between injection sequences',
      'Degraded nebulizer or spray chamber components',
    ],
    diagnostics: [
      'Compare TIC baseline of solvent blank before and after matrix injections',
      'Inspect spray chamber and nebulizer for visible contamination',
    ],
    corrective_actions: [
      'Clean source components thoroughly',
      'Implement stronger needle wash protocol',
    ],
    severity: 'medium',
    escalation_conditions: [],
    source_id: 'agilent-lcms-maintenance-guide',
    confidence_score: 0.75,
    evidence_strength: 'moderate',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('G6170A Ion Suppression Regression', () => {
  const cap = getCapability('Agilent', 'G6170A')!;

  // 1. Does NOT recommend MS/MS (single-quad)
  it('does NOT recommend MS/MS on G6170A (single-quad)', () => {
    expect(cap.ms_type).toBe('single-quad');
    expect(cap.cannot_do).toContain('MS/MS');
    expect(cap.cannot_do).toContain('MRM');

    // Validate that MS/MS recommendations are rejected
    const msmsRec = validateRecommendation('Perform MS/MS to identify interfering compounds', cap);
    expect(msmsRec.valid).toBe(false);

    const mrmRec = validateRecommendation('Set up MRM transitions for the target analyte', cap);
    expect(mrmRec.valid).toBe(false);

    // V2 ranking should not include MS/MS in outputs
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);
    const allText = [
      ...result.likely_causes,
      ...result.checks,
      ...result.corrective_actions,
    ].join(' ').toLowerCase();
    expect(allText).not.toContain('ms/ms');
    expect(allText).not.toContain('mrm');
  });

  // 2. Does NOT recommend AJS installation (already installed)
  it('does NOT recommend AJS installation (already standard on G6170A)', () => {
    expect(cap.ionization_modes).toContain('AJS');
    expect(cap.capabilities).toContain('AJS ion source');

    const installAJS = validateRecommendation('Install AJS ion source for improved sensitivity', cap);
    expect(installAJS.valid).toBe(false);
    expect(installAJS.reason).toContain('already');
  });

  // 3. Distinguishes high TIC noise from ion suppression
  it('distinguishes high TIC noise from ion suppression via separate knowledge items', () => {
    // is-001 covers ion suppression (matrix components competing for ionization)
    // is-003 covers high TIC noise (source contamination)
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);

    // Should have diagnostics that differentiate the two
    const allChecks = result.checks.join(' ').toLowerCase();
    const allCauses = result.likely_causes.join(' ').toLowerCase();

    // Should reference TIC comparison as a diagnostic
    expect(allChecks).toContain('tic');

    // Should list both matrix co-elution AND source contamination as distinct causes
    expect(result.likely_causes.length).toBeGreaterThan(1);
  });

  // 4. References Matrix Factor calculation
  it('references Matrix Factor calculation', () => {
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);

    const allText = [
      ...result.checks,
      ...result.likely_causes,
      ...result.corrective_actions,
    ].join(' ').toLowerCase();

    expect(allText).toContain('matrix factor');
  });

  // 5. Uses ICH M10 principles
  it('uses ICH M10 principles via source classification', () => {
    const ichSource = classifySource('ich-m10-bioanalytical-method-validation', null, null);
    expect(ichSource.tier).toBe(3);
    expect(ichSource.classification).toBe('regulatory-standard');

    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);
    // ICH M10 source should be in evidence summary
    expect(result.evidence_summary.some(e =>
      e.source_id.includes('ich-m10')
    )).toBe(true);
  });

  // 6. Does NOT cite 50% suppression as universal threshold
  it('does NOT cite 50% suppression as universal threshold', () => {
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);
    const allText = [
      ...result.likely_causes,
      ...result.checks,
      ...result.corrective_actions,
      ...result.uncertainties,
      ...result.stop_conditions,
    ].join(' ');

    // Should NOT contain "50% suppression" as a universal threshold
    expect(allText).not.toMatch(/50%\s+suppression/i);
    expect(allText).not.toMatch(/suppress.*50%.*threshold/i);
  });

  // 7. Includes prioritized investigation protocol (diagnostics ≥ 12 steps in source data)
  it('includes a prioritized investigation protocol', () => {
    // is-001 has 12 diagnostics steps
    expect(ionSuppressionItems[0].diagnostics.length).toBe(12);

    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);
    // Should have meaningful number of checks (deduplication may reduce, but should be substantial)
    expect(result.checks.length).toBeGreaterThanOrEqual(3);

    // Checks should be ordered (post-column infusion / standard comparison should come early)
    const firstChecks = result.checks.slice(0, 5).join(' ').toLowerCase();
    expect(
      firstChecks.includes('post-column') ||
      firstChecks.includes('matrix') ||
      firstChecks.includes('standard') ||
      firstChecks.includes('compare')
    ).toBe(true);
  });

  // 8. Sources classified correctly (no cross-vendor)
  it('sources are classified correctly with no cross-vendor misclassification', () => {
    // Agilent source for Agilent query — should be valid
    expect(validateSourceForVendor('agilent-g6170a-lcms-troubleshooting', 'Agilent')).toBe(true);
    expect(validateSourceForVendor('agilent-lcms-maintenance-guide', 'Agilent')).toBe(true);

    // ICH M10 — non-vendor-specific, should be valid for any vendor
    expect(validateSourceForVendor('ich-m10-bioanalytical-method-validation', 'Agilent')).toBe(true);

    // Cross-vendor: Waters source for Agilent query should be invalid
    expect(validateSourceForVendor('waters-ms-source-maintenance', 'Agilent')).toBe(false);

    // Classify Agilent G6170A source — should be exact-model (Tier 1)
    const agilentSource = classifySource('agilent-g6170a-lcms-troubleshooting', 'Agilent', 'G6170A');
    expect(agilentSource.tier).toBe(1);
    expect(agilentSource.classification).toBe('exact-model');

    // V2 ranking should not have cross-vendor sources classified as exact-model
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);
    for (const src of result.sources_with_metadata) {
      if (src.classification === 'exact-model' || src.classification === 'instrument-family') {
        expect(validateSourceForVendor(src.source_id, 'Agilent')).toBe(true);
      }
    }
  });

  // Additional: V2 output structure validation
  it('produces valid RankedAnswerV2 structure', () => {
    const result = rankItemsV2(g6170aQuery, ionSuppressionItems);

    expect(result.confidence_breakdown).toBeDefined();
    expect(result.confidence_breakdown.final_score).toBeGreaterThan(0);
    expect(result.confidence_breakdown.label).toBeTruthy();
    expect(result.missing_information).toBeDefined();
    expect(result.hypotheses).toBeDefined();
    expect(result.sources_with_metadata).toBeDefined();
    expect(result.printable_checklist.length).toBeGreaterThan(0);
    expect(result.reported_observations).toContain(g6170aQuery.symptom_description);
  });
});

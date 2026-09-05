import { describe, it, expect } from 'vitest';
import { getContextSchema, TECHNIQUE_SCHEMAS } from '@/lib/context-schemas';
import { getPromotedFields, ISSUE_FIELD_PRIORITIES } from '@/lib/context-priorities';
import { TECHNIQUE_OPTIONS } from '@/components/query-form-options';

describe('Dynamic Advanced Context Schema Engine', () => {
  // ── Schema Coverage ─────────────────────────────────────────────────

  it('should have a schema for every supported technique', () => {
    for (const technique of TECHNIQUE_OPTIONS) {
      const schema = getContextSchema(technique);
      expect(schema.groups.length, `${technique} should have groups`).toBeGreaterThan(0);
      expect(schema.fields.length, `${technique} should have fields`).toBeGreaterThan(0);
    }
  });

  it('should return a fallback schema for unknown techniques', () => {
    const schema = getContextSchema('UnknownTechnique');
    expect(schema.groups.length).toBeGreaterThan(0);
    expect(schema.fields.length).toBeGreaterThan(0);
  });

  // ── Technique-Specific Schemas ──────────────────────────────────────

  it('LCMS schema should include MS-specific fields', () => {
    const schema = getContextSchema('LCMS');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('ionizationMode');
    expect(keys).toContain('sourceParams');
    expect(keys).toContain('acquisitionMode');
    expect(keys).toContain('expectedMz');
    expect(keys).toContain('vacuumStatus');
    expect(keys).toContain('tuneCalStatus');
    expect(keys).toContain('backgroundIons');
  });

  it('LCMS schema should include chromatography fields', () => {
    const schema = getContextSchema('LCMS');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('column');
    expect(keys).toContain('mobilephase');
    expect(keys).toContain('flowRate');
    expect(keys).toContain('gradient');
  });

  it('GC schema should have GC-specific fields and NOT LC-MS fields', () => {
    const schema = getContextSchema('GC');
    const keys = schema.fields.map(f => f.key);
    // Should have GC-specific fields
    expect(keys).toContain('carrierGas');
    expect(keys).toContain('carrierFlowPressure');
    expect(keys).toContain('injectionMode');
    expect(keys).toContain('inletTemperature');
    expect(keys).toContain('ovenProgram');
    expect(keys).toContain('gcDetectorType');
    // Should NOT have LC-MS-specific fields
    expect(keys).not.toContain('ionizationMode');
    expect(keys).not.toContain('sourceParams');
    expect(keys).not.toContain('acquisitionMode');
    expect(keys).not.toContain('mobilephase');
    expect(keys).not.toContain('gradient');
  });

  it('GCMS schema should combine GC inlet/oven and MS fields', () => {
    const schema = getContextSchema('GCMS');
    const keys = schema.fields.map(f => f.key);
    // GC fields
    expect(keys).toContain('carrierGas');
    expect(keys).toContain('injectionMode');
    expect(keys).toContain('inletTemperature');
    expect(keys).toContain('ovenProgram');
    // MS fields
    expect(keys).toContain('ionizationMode');
    expect(keys).toContain('transferLineTemp');
    expect(keys).toContain('ionSourceTemp');
    expect(keys).toContain('tuneResults');
    expect(keys).toContain('vacuumStatus');
  });

  it('HPLC schema should have detector fields and NOT MS fields', () => {
    const schema = getContextSchema('HPLC');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('detectorType');
    expect(keys).toContain('detectionWavelength');
    expect(keys).not.toContain('ionizationMode');
    expect(keys).not.toContain('sourceParams');
    expect(keys).not.toContain('expectedMz');
  });

  it('TGA schema should have thermal-specific fields', () => {
    const schema = getContextSchema('TGA');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('sampleMass');
    expect(keys).toContain('crucibleType');
    expect(keys).toContain('purgeGas');
    expect(keys).toContain('temperatureProgram');
    expect(keys).toContain('heatingRate');
    // Should NOT have chromatography fields
    expect(keys).not.toContain('column');
    expect(keys).not.toContain('mobilephase');
    expect(keys).not.toContain('gradient');
  });

  it('DSC schema should have thermal analysis fields', () => {
    const schema = getContextSchema('DSC');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('sampleMass');
    expect(keys).toContain('panType');
    expect(keys).toContain('purgeGas');
    expect(keys).toContain('temperatureProgram');
    expect(keys).toContain('calibrationStandards');
    expect(keys).not.toContain('column');
  });

  it('NMR schema should have NMR-specific fields', () => {
    const schema = getContextSchema('NMR');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('nmrSolvent');
    expect(keys).toContain('probeType');
    expect(keys).toContain('nucleus');
    expect(keys).toContain('shimmingQuality');
    expect(keys).not.toContain('column');
    expect(keys).not.toContain('mobilephase');
  });

  it('ssNMR schema should have solid-state NMR fields', () => {
    const schema = getContextSchema('ssNMR');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('rotorDiameter');
    expect(keys).toContain('masSpeed');
    expect(keys).toContain('pulseSequence');
    expect(keys).toContain('magicAngleCal');
  });

  it('SEM schema should have electron microscopy fields', () => {
    const schema = getContextSchema('SEM');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('acceleratingVoltage');
    expect(keys).toContain('sampleCoating');
    expect(keys).toContain('semDetector');
    expect(keys).toContain('vacuumLevel');
  });

  it('Raman schema should have spectroscopy fields', () => {
    const schema = getContextSchema('Raman');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('excitationWavelength');
    expect(keys).toContain('laserPower');
    expect(keys).toContain('spectralRange');
    expect(keys).toContain('siliconReference');
  });

  it('IC schema should have ion chromatography-specific fields', () => {
    const schema = getContextSchema('IC');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('suppressorType');
    expect(keys).toContain('suppressorCurrent');
    expect(keys).toContain('eluentGeneration');
    expect(keys).not.toContain('ionizationMode');
  });

  it('KF schema should have Karl Fischer fields', () => {
    const schema = getContextSchema('KF');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('kfMethod');
    expect(keys).toContain('kfReagent');
    expect(keys).toContain('driftLimit');
  });

  it('BET schema should have surface area analysis fields', () => {
    const schema = getContextSchema('BET');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('degassingTemp');
    expect(keys).toContain('analysisGas');
    expect(keys).toContain('pressurePoints');
  });

  it('TEM schema should have TEM-specific fields', () => {
    const schema = getContextSchema('TEM');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('gridType');
    expect(keys).toContain('stainPrep');
    expect(keys).toContain('acceleratingVoltage');
    expect(keys).toContain('cryoTemp');
  });

  it('SECMALS schema should have SEC-MALS fields', () => {
    const schema = getContextSchema('SECMALS');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('dndcValue');
    expect(keys).toContain('malsDetector');
    expect(keys).toContain('interDetectorDelay');
    expect(keys).toContain('normalization');
  });

  it('SPPS schema should have peptide synthesis fields', () => {
    const schema = getContextSchema('SPPS');
    const keys = schema.fields.map(f => f.key);
    expect(keys).toContain('targetSequence');
    expect(keys).toContain('resinType');
    expect(keys).toContain('couplingReagent');
    expect(keys).toContain('cleavageCocktail');
  });

  // ── Field Properties ────────────────────────────────────────────────

  it('all fields should have valid priorities (1, 2, or 3)', () => {
    for (const [tech, schema] of Object.entries(TECHNIQUE_SCHEMAS)) {
      for (const field of schema.fields) {
        expect([1, 2, 3], `${tech}.${field.key}`).toContain(field.priority);
      }
    }
  });

  it('all fields should reference a group that exists in the schema', () => {
    for (const [tech, schema] of Object.entries(TECHNIQUE_SCHEMAS)) {
      const groupIds = new Set(schema.groups.map(g => g.id));
      for (const field of schema.fields) {
        expect(groupIds.has(field.group), `${tech}.${field.key} references unknown group "${field.group}"`).toBe(true);
      }
    }
  });

  it('each schema should have at least one priority-1 field', () => {
    for (const [tech, schema] of Object.entries(TECHNIQUE_SCHEMAS)) {
      const p1 = schema.fields.filter(f => f.priority === 1);
      expect(p1.length, `${tech} should have at least one priority-1 field`).toBeGreaterThan(0);
    }
  });

  // ── Issue-based Prioritization ──────────────────────────────────────

  it('should return promoted fields for known issues', () => {
    const fields = getPromotedFields('low sensitivity');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContain('ionizationMode');
    expect(fields).toContain('analyte');
  });

  it('should return empty array for unknown issue', () => {
    expect(getPromotedFields('nonexistent issue')).toEqual([]);
    expect(getPromotedFields('')).toEqual([]);
  });

  it('retention time shift should prioritize chromatography fields', () => {
    const fields = getPromotedFields('retention time shift');
    expect(fields).toContain('column');
    expect(fields).toContain('mobilephase');
    expect(fields).toContain('flowRate');
    expect(fields).toContain('gradient');
    expect(fields).toContain('retentionTime');
  });

  it('high backpressure should prioritize pressure-related fields', () => {
    const fields = getPromotedFields('high backpressure');
    expect(fields).toContain('column');
    expect(fields).toContain('column_injection_count');
    expect(fields).toContain('flowRate');
    expect(fields).toContain('recentMaint');
  });

  it('GC ghost peaks should prioritize GC-specific fields', () => {
    const fields = getPromotedFields('gc ghost peaks');
    expect(fields).toContain('column');
    expect(fields).toContain('inletTemperature');
    expect(fields).toContain('ovenProgram');
    expect(fields).toContain('injectionMode');
  });

  it('NMR lock failure should prioritize NMR-specific fields', () => {
    const fields = getPromotedFields('nmr lock failure');
    expect(fields).toContain('nmrSolvent');
    expect(fields).toContain('shimmingQuality');
  });

  it('DLS high PDI should prioritize DLS-specific fields', () => {
    const fields = getPromotedFields('dls high pdi');
    expect(fields).toContain('sampleConcentration');
    expect(fields).toContain('sampleFiltration');
  });

  it('SEM charging artifacts should prioritize SEM-specific fields', () => {
    const fields = getPromotedFields('sem charging artifacts');
    expect(fields).toContain('sampleCoating');
    expect(fields).toContain('acceleratingVoltage');
  });

  // ── Cross-technique Differentiation ─────────────────────────────────

  it('different techniques should have different field sets', () => {
    const lcms = getContextSchema('LCMS').fields.map(f => f.key).sort();
    const gc = getContextSchema('GC').fields.map(f => f.key).sort();
    const tga = getContextSchema('TGA').fields.map(f => f.key).sort();
    const nmr = getContextSchema('NMR').fields.map(f => f.key).sort();

    expect(lcms).not.toEqual(gc);
    expect(gc).not.toEqual(tga);
    expect(tga).not.toEqual(nmr);
    expect(nmr).not.toEqual(lcms);
  });

  it('HPLC and UHPLC should share most fields but UHPLC has systemPressure', () => {
    const hplc = getContextSchema('HPLC').fields.map(f => f.key);
    const uhplc = getContextSchema('UHPLC').fields.map(f => f.key);
    // Both should have common LC fields
    expect(hplc).toContain('column');
    expect(uhplc).toContain('column');
    // UHPLC should have systemPressure
    expect(uhplc).toContain('systemPressure');
    expect(hplc).not.toContain('systemPressure');
  });
});

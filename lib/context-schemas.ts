// ── Dynamic Advanced Context Schema Engine ──────────────────────────────────
// Defines which context fields are scientifically relevant for each analytical
// technique.  Fields map either to an existing Step2Data key (isExisting=true)
// or to a dynamic key stored in Step2Data.extraContext.
//
// Hierarchy:  Technique → Group → Field (with priority)
// Priority 1 = always visible,  2 = visible in expanded section,  3 = deep-expand only
// Issue-based overrides live in context-priorities.ts and promote fields to priority 1.

export interface ContextFieldDef {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
  type: 'input' | 'textarea' | 'select';
  group: string;
  priority: 1 | 2 | 3;
  /** true ⇒ maps directly to an existing Step2Data property (e.g. column, flowRate) */
  isExisting?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ContextGroupDef {
  id: string;
  label: string;
}

export interface TechniqueContextSchema {
  groups: ContextGroupDef[];
  fields: ContextFieldDef[];
}

// ─── Helper: shared groups ──────────────────────────────────────────

const G_SAMPLE: ContextGroupDef      = { id: 'sample',      label: 'Sample' };
const G_METHOD: ContextGroupDef      = { id: 'method',      label: 'Method' };
const G_CHROM: ContextGroupDef       = { id: 'chrom',       label: 'Chromatography' };
const G_DETECTOR: ContextGroupDef    = { id: 'detector',    label: 'Detector' };
const G_MS: ContextGroupDef          = { id: 'ms',          label: 'MS / Source' };
const G_STATUS: ContextGroupDef      = { id: 'status',      label: 'Instrument Status' };
const G_SST: ContextGroupDef         = { id: 'sst',         label: 'System Suitability (SST)' };
const G_INLET: ContextGroupDef       = { id: 'inlet',       label: 'Inlet / Injection' };
const G_OVEN: ContextGroupDef        = { id: 'oven',        label: 'Oven / Temperature' };
const G_CARRIER: ContextGroupDef     = { id: 'carrier',     label: 'Carrier / Gas' };
const G_ATMOSPHERE: ContextGroupDef  = { id: 'atmosphere',  label: 'Atmosphere' };
const G_TEMP: ContextGroupDef        = { id: 'temp',        label: 'Temperature Program' };
const G_CALIBRATION: ContextGroupDef = { id: 'calibration', label: 'Calibration' };
const G_ELUENT: ContextGroupDef      = { id: 'eluent',      label: 'Eluent / Suppressor' };
const G_CAPILLARY: ContextGroupDef   = { id: 'capillary',   label: 'Capillary / Buffer' };
const G_CHEMISTRY: ContextGroupDef   = { id: 'chemistry',   label: 'Chemistry' };
const G_REAGENT: ContextGroupDef     = { id: 'reagent',     label: 'Reagent' };
const G_ELECTRODE: ContextGroupDef   = { id: 'electrode',   label: 'Electrode' };
const G_CELL: ContextGroupDef        = { id: 'cell',        label: 'Cell / Reagent' };
const G_MEASUREMENT: ContextGroupDef = { id: 'measurement', label: 'Measurement' };
const G_OPTICS: ContextGroupDef      = { id: 'optics',      label: 'Optics' };
const G_BEAM: ContextGroupDef        = { id: 'beam',        label: 'Beam' };
const G_VACUUM: ContextGroupDef      = { id: 'vacuum',      label: 'Vacuum' };
const G_TARGET: ContextGroupDef      = { id: 'target',      label: 'Target / Process' };
const G_LASER: ContextGroupDef       = { id: 'laser',       label: 'Laser' };
const G_PROBE: ContextGroupDef       = { id: 'probe',       label: 'Probe / Experiment' };
const G_COLUMN_SEC: ContextGroupDef  = { id: 'column_sec',  label: 'Column / Detectors' };

// ─── Shared existing-field defs (reused across techniques) ──────────

const F_ANALYTE: ContextFieldDef = {
  key: 'analyte', label: 'Analyte', placeholder: 'e.g. caffeine, ibuprofen',
  type: 'input', group: 'sample', priority: 1, isExisting: true,
};
const F_SAMPLE_MATRIX: ContextFieldDef = {
  key: 'sampleMatrix', label: 'Sample Matrix', placeholder: 'e.g. plasma, soil extract',
  type: 'input', group: 'sample', priority: 1, isExisting: true,
};
const F_SAMPLE_MATRIX_TYPE: ContextFieldDef = {
  key: 'sample_matrix_type', label: 'Sample Matrix Type', placeholder: 'Select matrix type...',
  type: 'select', group: 'sample', priority: 2, isExisting: true,
};
const F_COLUMN: ContextFieldDef = {
  key: 'column', label: 'Column', placeholder: 'e.g. C18 150\u00D74.6mm 3.5\u00B5m',
  type: 'input', group: 'chrom', priority: 1, isExisting: true,
};
const F_COLUMN_INJ: ContextFieldDef = {
  key: 'column_injection_count', label: 'Column Injection Count', placeholder: 'e.g. 1500',
  type: 'input', group: 'chrom', priority: 2, isExisting: true,
};
const F_MOBILE_PHASE: ContextFieldDef = {
  key: 'mobilephase', label: 'Mobile Phase', placeholder: 'e.g. 0.1% FA in water / ACN',
  type: 'input', group: 'chrom', priority: 1, isExisting: true,
};
const F_FLOW_RATE: ContextFieldDef = {
  key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 0.4 mL/min',
  type: 'input', group: 'chrom', priority: 1, isExisting: true,
};
const F_INJ_VOL: ContextFieldDef = {
  key: 'injectionVolume', label: 'Injection Volume', placeholder: 'e.g. 5 \u00B5L',
  type: 'input', group: 'chrom', priority: 2, isExisting: true,
};
const F_GRADIENT: ContextFieldDef = {
  key: 'gradient', label: 'Gradient Program', placeholder: 'e.g. 5\u219295% B in 8 min',
  type: 'input', group: 'chrom', priority: 1, isExisting: true,
};
const F_RT: ContextFieldDef = {
  key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. expected 4.2 min, observed 3.8 min',
  type: 'input', group: 'chrom', priority: 1, isExisting: true,
};
const F_ION_MODE: ContextFieldDef = {
  key: 'ionizationMode', label: 'Ionization Mode', placeholder: 'e.g. ESI+, APCI-',
  type: 'input', group: 'ms', priority: 1, isExisting: true,
};
const F_SOURCE_PARAMS: ContextFieldDef = {
  key: 'sourceParams', label: 'Source Parameters', placeholder: 'e.g. gas temp 300\u00B0C, nebulizer 45 psi',
  type: 'input', group: 'ms', priority: 1, isExisting: true,
};
const F_ACQ_MODE: ContextFieldDef = {
  key: 'acquisitionMode', label: 'Acquisition Mode', placeholder: 'e.g. SIM m/z 195, scan 100-1000',
  type: 'input', group: 'ms', priority: 1, isExisting: true,
};
const F_EXPECTED: ContextFieldDef = {
  key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. S/N > 10, RT 4.2\u00B10.1 min',
  type: 'input', group: 'status', priority: 2, isExisting: true,
};
const F_MAINT: ContextFieldDef = {
  key: 'recentMaint', label: 'Recent Maintenance', placeholder: 'e.g. replaced ESI capillary last week',
  type: 'input', group: 'status', priority: 2, isExisting: true,
};
const F_QC: ContextFieldDef = {
  key: 'qcResults', label: 'QC / SST Results', placeholder: 'e.g. SST passed, RSD 1.2%, tailing 1.1',
  type: 'input', group: 'status', priority: 2, isExisting: true,
};
const F_METHOD_COND: ContextFieldDef = {
  key: 'methodConditions', label: 'Method Summary', placeholder: 'Brief overall method description',
  type: 'textarea', group: 'method', priority: 2, isExisting: true,
};

// SST fields (existing)
const F_SST_PLATES: ContextFieldDef = {
  key: 'sst_plates', label: 'Theoretical Plates (N)', placeholder: 'e.g. 12000',
  hint: 'Number of theoretical plates', type: 'input', group: 'sst', priority: 2, isExisting: true,
};
const F_SST_TAILING: ContextFieldDef = {
  key: 'sst_tailing_factor', label: 'Tailing Factor', placeholder: 'e.g. 1.1',
  hint: 'USP tailing factor (T)', type: 'input', group: 'sst', priority: 2, isExisting: true,
};
const F_SST_RES: ContextFieldDef = {
  key: 'sst_resolution', label: 'Resolution (Rs)', placeholder: 'e.g. 2.5',
  hint: 'Between critical pair', type: 'input', group: 'sst', priority: 2, isExisting: true,
};
const F_SST_RSD: ContextFieldDef = {
  key: 'sst_rsd_percent', label: 'RSD (%)', placeholder: 'e.g. 0.8',
  hint: 'Relative standard deviation of replicate injections', type: 'input', group: 'sst', priority: 2, isExisting: true,
};

// ═══════════════════════════════════════════════════════════════════════
//  PER-TECHNIQUE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

const HPLC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_DETECTOR, G_STATUS, G_SST],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    F_COLUMN, F_COLUMN_INJ, F_MOBILE_PHASE, F_FLOW_RATE, F_INJ_VOL, F_GRADIENT, F_RT,
    { key: 'detectorType', label: 'Detector Type', placeholder: 'e.g. UV, DAD, FLD, RID, ELSD',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'detectionWavelength', label: 'Detection Wavelength', placeholder: 'e.g. 254 nm, 210/280 nm',
      type: 'input', group: 'detector', priority: 1 },
    F_EXPECTED, F_MAINT, F_QC,
    F_SST_PLATES, F_SST_TAILING, F_SST_RES, F_SST_RSD,
  ],
};

const UHPLC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_DETECTOR, G_STATUS, G_SST],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    F_COLUMN, F_COLUMN_INJ, F_MOBILE_PHASE, F_FLOW_RATE, F_INJ_VOL, F_GRADIENT, F_RT,
    { key: 'detectorType', label: 'Detector Type', placeholder: 'e.g. UV, DAD, FLD, ELSD',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'detectionWavelength', label: 'Detection Wavelength', placeholder: 'e.g. 254 nm',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'systemPressure', label: 'System Pressure', placeholder: 'e.g. 650 bar normal, now 850 bar',
      type: 'input', group: 'status', priority: 2 },
    F_EXPECTED, F_MAINT, F_QC,
    F_SST_PLATES, F_SST_TAILING, F_SST_RES, F_SST_RSD,
  ],
};

const LCMS_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_MS, G_STATUS, G_SST],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    F_COLUMN, F_COLUMN_INJ, F_MOBILE_PHASE, F_FLOW_RATE, F_INJ_VOL, F_GRADIENT, F_RT,
    // MS fields
    F_ION_MODE, F_SOURCE_PARAMS, F_ACQ_MODE,
    { key: 'expectedMz', label: 'Expected m/z', placeholder: 'e.g. [M+H]+ = 195.0877',
      type: 'input', group: 'ms', priority: 1 },
    { key: 'ticBpcBehavior', label: 'TIC/BPC Behavior', placeholder: 'e.g. low TIC, noisy BPC, normal TIC but no target peak',
      type: 'input', group: 'ms', priority: 2 },
    { key: 'backgroundIons', label: 'Background Ions', placeholder: 'e.g. m/z 391, 413, 429 (PEG contamination)',
      type: 'input', group: 'ms', priority: 2 },
    { key: 'vacuumStatus', label: 'Vacuum Status', placeholder: 'e.g. roughing 2.5 Torr, HV 3.2e-5 Torr',
      type: 'input', group: 'status', priority: 2 },
    { key: 'tuneCalStatus', label: 'Calibration / Tune Status', placeholder: 'e.g. autotune passed, mass accuracy < 5 ppm',
      type: 'input', group: 'status', priority: 2 },
    { key: 'errorMessages', label: 'Error Messages', placeholder: 'e.g. "Source not ready", error code ee(65)',
      type: 'input', group: 'status', priority: 1 },
    F_EXPECTED, F_MAINT, F_QC,
    F_SST_PLATES, F_SST_TAILING, F_SST_RES, F_SST_RSD,
  ],
};

const GC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, { id: 'chrom', label: 'Column' }, G_CARRIER, G_INLET, G_OVEN, G_DETECTOR, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'column', label: 'Column', placeholder: 'e.g. DB-5ms 30m\u00D70.25mm\u00D70.25\u00B5m',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { ...F_COLUMN_INJ, group: 'chrom' },
    // Carrier
    { key: 'carrierGas', label: 'Carrier Gas', placeholder: 'e.g. helium, hydrogen, nitrogen',
      type: 'input', group: 'carrier', priority: 1 },
    { key: 'carrierFlowPressure', label: 'Flow / Pressure', placeholder: 'e.g. 1.2 mL/min constant flow, or 15 psi',
      type: 'input', group: 'carrier', priority: 1 },
    // Inlet
    { key: 'injectionMode', label: 'Injection Mode', placeholder: 'e.g. split 50:1, splitless, on-column',
      type: 'input', group: 'inlet', priority: 1 },
    { key: 'injectionVolume', label: 'Injection Volume', placeholder: 'e.g. 1 \u00B5L',
      type: 'input', group: 'inlet', priority: 2, isExisting: true },
    { key: 'inletTemperature', label: 'Inlet Temperature', placeholder: 'e.g. 250 \u00B0C',
      type: 'input', group: 'inlet', priority: 1 },
    // Oven
    { key: 'ovenProgram', label: 'Oven Program', placeholder: 'e.g. 40\u00B0C (2 min) \u2192 10\u00B0C/min \u2192 300\u00B0C (5 min)',
      type: 'input', group: 'oven', priority: 1 },
    // Detector
    { key: 'gcDetectorType', label: 'Detector Type', placeholder: 'e.g. FID, ECD, TCD, NPD, FPD',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'gcDetectorTemp', label: 'Detector Temperature', placeholder: 'e.g. 300 \u00B0C',
      type: 'input', group: 'detector', priority: 2 },
    // Status
    { key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. expected 12.5 min, observed 11.8 min',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const GCMS_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, { id: 'chrom', label: 'Column' }, G_CARRIER, G_INLET, G_OVEN, G_MS, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'column', label: 'Column', placeholder: 'e.g. DB-5ms 30m\u00D70.25mm\u00D70.25\u00B5m',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { ...F_COLUMN_INJ, group: 'chrom' },
    // Carrier
    { key: 'carrierGas', label: 'Carrier Gas', placeholder: 'e.g. helium',
      type: 'input', group: 'carrier', priority: 1 },
    { key: 'carrierFlowPressure', label: 'Flow / Pressure', placeholder: 'e.g. 1.0 mL/min constant flow',
      type: 'input', group: 'carrier', priority: 1 },
    // Inlet
    { key: 'injectionMode', label: 'Injection Mode', placeholder: 'e.g. splitless, pulsed splitless',
      type: 'input', group: 'inlet', priority: 1 },
    { key: 'injectionVolume', label: 'Injection Volume', placeholder: 'e.g. 1 \u00B5L',
      type: 'input', group: 'inlet', priority: 2, isExisting: true },
    { key: 'inletTemperature', label: 'Inlet Temperature', placeholder: 'e.g. 280 \u00B0C',
      type: 'input', group: 'inlet', priority: 1 },
    // Oven
    { key: 'ovenProgram', label: 'Oven Program', placeholder: 'e.g. 50\u00B0C (1 min) \u2192 15\u00B0C/min \u2192 320\u00B0C (5 min)',
      type: 'input', group: 'oven', priority: 1 },
    // MS
    { key: 'ionizationMode', label: 'EI / CI Mode', placeholder: 'e.g. EI 70 eV, PCI methane',
      type: 'input', group: 'ms', priority: 1, isExisting: true },
    { key: 'transferLineTemp', label: 'Transfer Line Temperature', placeholder: 'e.g. 280 \u00B0C',
      type: 'input', group: 'ms', priority: 1 },
    { key: 'ionSourceTemp', label: 'Ion Source Temperature', placeholder: 'e.g. 230 \u00B0C',
      type: 'input', group: 'ms', priority: 1 },
    { key: 'quadTemp', label: 'Quadrupole Temperature', placeholder: 'e.g. 150 \u00B0C',
      type: 'input', group: 'ms', priority: 2 },
    { key: 'acquisitionMode', label: 'Acquisition Mode', placeholder: 'e.g. full scan 35-550 amu, SIM m/z 91, 105',
      type: 'input', group: 'ms', priority: 1, isExisting: true },
    // Status
    { key: 'tuneResults', label: 'Tune Results', placeholder: 'e.g. DFTPP passed, BFB passed, air/water check OK',
      type: 'input', group: 'status', priority: 1 },
    { key: 'vacuumStatus', label: 'Vacuum Status', placeholder: 'e.g. 3.2e-5 Torr',
      type: 'input', group: 'status', priority: 2 },
    { key: 'backgroundIons', label: 'Background Ions', placeholder: 'e.g. m/z 18 (water), 28 (N2), 44 (CO2)',
      type: 'input', group: 'status', priority: 2 },
    { key: 'leakCheckResults', label: 'Leak Check Results', placeholder: 'e.g. air/water ratio 0.05, OK',
      type: 'input', group: 'status', priority: 2 },
    { key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. expected 12.5 min, observed 11.8 min',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const IC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, { id: 'chrom', label: 'Column' }, G_ELUENT, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'column', label: 'Column', placeholder: 'e.g. IonPac AS19 4\u00D7250 mm',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'guardColumn', label: 'Guard Column', placeholder: 'e.g. IonPac AG19 4\u00D750 mm',
      type: 'input', group: 'chrom', priority: 2 },
    { key: 'suppressorType', label: 'Suppressor Type', placeholder: 'e.g. ASRS 300 4mm, AERS 500',
      type: 'input', group: 'eluent', priority: 1 },
    { key: 'suppressorCurrent', label: 'Suppressor Current', placeholder: 'e.g. 60 mA',
      type: 'input', group: 'eluent', priority: 2 },
    { key: 'mobilephase', label: 'Eluent', placeholder: 'e.g. 30 mM KOH, or EGC 20-50 mM KOH gradient',
      type: 'input', group: 'eluent', priority: 1, isExisting: true },
    { key: 'eluentGeneration', label: 'Eluent Generation', placeholder: 'e.g. EGC 500 KOH cartridge, manual eluent',
      type: 'input', group: 'eluent', priority: 2 },
    { key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 1.0 mL/min',
      type: 'input', group: 'eluent', priority: 1, isExisting: true },
    { key: 'injectionVolume', label: 'Injection Volume', placeholder: 'e.g. 25 \u00B5L',
      type: 'input', group: 'eluent', priority: 2, isExisting: true },
    { key: 'conductivityDetector', label: 'Conductivity Reading', placeholder: 'e.g. baseline 0.5 \u00B5S, suppressed',
      type: 'input', group: 'status', priority: 2 },
    { key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. chloride expected 6.2 min',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const CE_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CAPILLARY, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'capillaryType', label: 'Capillary Type', placeholder: 'e.g. fused silica, bare, coated (PVA)',
      type: 'input', group: 'capillary', priority: 1 },
    { key: 'capillaryDimensions', label: 'Capillary Dimensions', placeholder: 'e.g. 50 \u00B5m ID \u00D7 60 cm total, 50 cm effective',
      type: 'input', group: 'capillary', priority: 1 },
    { key: 'bufferComposition', label: 'Buffer Composition', placeholder: 'e.g. 50 mM phosphate pH 7.0',
      type: 'input', group: 'capillary', priority: 1 },
    { key: 'bufferPH', label: 'Buffer pH', placeholder: 'e.g. 7.0',
      type: 'input', group: 'capillary', priority: 2 },
    { key: 'ceVoltage', label: 'Voltage', placeholder: 'e.g. 25 kV, normal or reversed polarity',
      type: 'input', group: 'capillary', priority: 1 },
    { key: 'ceTemperature', label: 'Temperature', placeholder: 'e.g. 25 \u00B0C',
      type: 'input', group: 'capillary', priority: 2 },
    { key: 'ceInjection', label: 'Injection Mode', placeholder: 'e.g. hydrodynamic 50 mbar\u00D710s, electrokinetic 5kV\u00D710s',
      type: 'input', group: 'capillary', priority: 1 },
    { key: 'detectionWavelength', label: 'Detection Wavelength', placeholder: 'e.g. 200 nm, 214 nm',
      type: 'input', group: 'status', priority: 2 },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const SFC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'column', label: 'Column', placeholder: 'e.g. Torus 2-PIC 3.0\u00D7100mm, 1.7\u00B5m',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'co2Pressure', label: 'CO\u2082 Back-Pressure', placeholder: 'e.g. 150 bar',
      type: 'input', group: 'chrom', priority: 1 },
    { key: 'coSolvent', label: 'Co-Solvent', placeholder: 'e.g. methanol + 0.1% DEA',
      type: 'input', group: 'chrom', priority: 1 },
    { key: 'modifierPercent', label: 'Modifier %', placeholder: 'e.g. 5\u219240% co-solvent in 6 min',
      type: 'input', group: 'chrom', priority: 1 },
    { key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 1.5 mL/min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'columnTemperature', label: 'Column Temperature', placeholder: 'e.g. 40 \u00B0C',
      type: 'input', group: 'chrom', priority: 2 },
    { key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. expected 3.1 min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'detectorType', label: 'Detector Type', placeholder: 'e.g. UV, DAD, MS (ESI+)',
      type: 'input', group: 'status', priority: 2 },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const TGA_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_ATMOSPHERE, G_TEMP, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. polymer powder, pharmaceutical excipient',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMass', label: 'Sample Mass', placeholder: 'e.g. 10.5 mg',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'crucibleType', label: 'Crucible / Pan Type', placeholder: 'e.g. alumina, platinum, aluminum',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'purgeGas', label: 'Purge Gas', placeholder: 'e.g. nitrogen 60 mL/min',
      type: 'input', group: 'atmosphere', priority: 1 },
    { key: 'reactiveGas', label: 'Reactive Gas', placeholder: 'e.g. air 40 mL/min (for oxidation step)',
      type: 'input', group: 'atmosphere', priority: 2 },
    { key: 'temperatureProgram', label: 'Temperature Program', placeholder: 'e.g. 25\u2192900\u00B0C at 10\u00B0C/min',
      type: 'input', group: 'temp', priority: 1 },
    { key: 'heatingRate', label: 'Heating Rate', placeholder: 'e.g. 10 \u00B0C/min',
      type: 'input', group: 'temp', priority: 2 },
    { key: 'isothermalHold', label: 'Isothermal Holds', placeholder: 'e.g. 105\u00B0C for 30 min (moisture), 800\u00B0C for 15 min (ash)',
      type: 'input', group: 'temp', priority: 2 },
    { key: 'tempCalStandard', label: 'Temperature Calibration', placeholder: 'e.g. indium/nickel Curie point, last done 2 weeks ago',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'massCalibration', label: 'Mass Calibration', placeholder: 'e.g. tare/calibration last performed yesterday',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. ~5% moisture, 30% polymer decomposition by 400\u00B0C',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const DSC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_ATMOSPHERE, G_TEMP, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. crystalline API, polymer blend',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMass', label: 'Sample Mass', placeholder: 'e.g. 5.2 mg',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'panType', label: 'Pan Type', placeholder: 'e.g. hermetic aluminum, standard aluminum, Tzero',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'purgeGas', label: 'Purge Gas', placeholder: 'e.g. nitrogen 50 mL/min',
      type: 'input', group: 'atmosphere', priority: 1 },
    { key: 'temperatureProgram', label: 'Temperature Program', placeholder: 'e.g. -40\u2192250\u00B0C at 10\u00B0C/min',
      type: 'input', group: 'temp', priority: 1 },
    { key: 'heatingRate', label: 'Heating Rate', placeholder: 'e.g. 10 \u00B0C/min',
      type: 'input', group: 'temp', priority: 2 },
    { key: 'coolingRate', label: 'Cooling Rate', placeholder: 'e.g. 10 \u00B0C/min (RCS/LNCS)',
      type: 'input', group: 'temp', priority: 2 },
    { key: 'calibrationStandards', label: 'Calibration Standards', placeholder: 'e.g. indium (Tm 156.6\u00B0C, \u0394H 28.71 J/g), zinc',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'baselineCorrection', label: 'Baseline Correction', placeholder: 'e.g. sapphire baseline run, or none',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. Tg ~75\u00B0C, Tm ~215\u00B0C, \u0394H ~95 J/g',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const FPLC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_STATUS],
  fields: [
    { key: 'analyte', label: 'Target Protein / Biomolecule', placeholder: 'e.g. mAb, BSA, His-tagged protein',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. clarified cell lysate, conditioned media',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    F_METHOD_COND,
    { key: 'column', label: 'Column', placeholder: 'e.g. HisTrap HP 5 mL, HiLoad 16/600 Superdex 200',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'columnVolume', label: 'Column Volume (CV)', placeholder: 'e.g. 5 mL, 120 mL',
      type: 'input', group: 'chrom', priority: 2 },
    { key: 'resinType', label: 'Resin / Media Type', placeholder: 'e.g. Ni-NTA, Protein A, Superdex 200',
      type: 'input', group: 'chrom', priority: 1 },
    { key: 'mobilephase', label: 'Buffer System', placeholder: 'e.g. 50 mM Tris pH 8.0 / 500 mM imidazole elution',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 5 mL/min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'gradient', label: 'Gradient / Step Elution', placeholder: 'e.g. 0\u2192100% B in 10 CV, or step 20/50/100% B',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'uvWavelength', label: 'UV Wavelength', placeholder: 'e.g. 280 nm, 260/280 nm',
      type: 'input', group: 'status', priority: 2 },
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

const SPPS_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHEMISTRY, G_STATUS],
  fields: [
    { key: 'targetSequence', label: 'Target Sequence', placeholder: 'e.g. DRVYIHPFHL (angiotensin I), 15-mer',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'resinType', label: 'Resin Type', placeholder: 'e.g. Rink Amide MBHA, Wang, 2-CTC',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'resinLoading', label: 'Resin Loading', placeholder: 'e.g. 0.5 mmol/g, 0.1 mmol scale',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'couplingReagent', label: 'Coupling Reagent', placeholder: 'e.g. HBTU/DIEA, HATU/HOAt, DIC/Oxyma',
      type: 'input', group: 'chemistry', priority: 1 },
    { key: 'deprotectionReagent', label: 'Deprotection', placeholder: 'e.g. 20% piperidine/DMF, 5% DBU/piperidine',
      type: 'input', group: 'chemistry', priority: 1 },
    { key: 'solvent', label: 'Solvent', placeholder: 'e.g. DMF, NMP, DCM',
      type: 'input', group: 'chemistry', priority: 1 },
    { key: 'couplingTime', label: 'Coupling Time', placeholder: 'e.g. 30 min single, 2\u00D715 min double',
      type: 'input', group: 'chemistry', priority: 2 },
    { key: 'cleavageCocktail', label: 'Cleavage Cocktail', placeholder: 'e.g. TFA/TIS/water 95/2.5/2.5, 2h',
      type: 'input', group: 'chemistry', priority: 2 },
    { key: 'temperature', label: 'Temperature', placeholder: 'e.g. RT, or 90\u00B0C microwave',
      type: 'input', group: 'chemistry', priority: 2 },
    { key: 'expectedResult', label: 'Expected Purity', placeholder: 'e.g. >70% crude purity by HPLC',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT,
  ],
};

const XRD_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_OPTICS, G_MEASUREMENT, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. powder, thin film, single crystal',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'samplePrep', label: 'Sample Preparation', placeholder: 'e.g. ground in mortar, front-loaded, capillary',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'particleSize', label: 'Particle Size', placeholder: 'e.g. < 45 \u00B5m, as-received',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'xraySource', label: 'X-ray Source', placeholder: 'e.g. Cu K\u03B1 (\u03BB=1.5406 \u00C5), Mo K\u03B1',
      type: 'input', group: 'optics', priority: 1 },
    { key: 'tubeVoltage', label: 'Tube Voltage / Current', placeholder: 'e.g. 40 kV / 40 mA',
      type: 'input', group: 'optics', priority: 1 },
    { key: 'opticsConfig', label: 'Optics', placeholder: 'e.g. Bragg-Brentano, parallel beam, Goebel mirror',
      type: 'input', group: 'optics', priority: 2 },
    { key: 'scanRange', label: 'Scan Range (2\u03B8)', placeholder: 'e.g. 5\u201380\u00B0 2\u03B8',
      type: 'input', group: 'measurement', priority: 1 },
    { key: 'stepSize', label: 'Step Size', placeholder: 'e.g. 0.02\u00B0',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'scanSpeed', label: 'Scan Speed / Time per Step', placeholder: 'e.g. 0.5\u00B0/min, or 1 s/step',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'slitWidth', label: 'Slit Configuration', placeholder: 'e.g. divergence 0.5\u00B0, anti-scatter 1\u00B0, receiving 0.15 mm',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'referenceStandard', label: 'Reference Standard', placeholder: 'e.g. LaB6 (SRM 660c), silicon powder',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'alignmentStatus', label: 'Alignment Status', placeholder: 'e.g. last aligned 1 month ago, zero offset = +0.02\u00B0',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. crystalline phase X at 2\u03B8 = 12.5\u00B0, 25.1\u00B0',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const DLS_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_MEASUREMENT, G_STATUS],
  fields: [
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. liposome suspension, protein solution, nanoparticles',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleConcentration', label: 'Concentration', placeholder: 'e.g. 1 mg/mL, 0.1% w/v',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'dlsSolvent', label: 'Dispersant / Solvent', placeholder: 'e.g. water, PBS pH 7.4, toluene',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'sampleFiltration', label: 'Filtration', placeholder: 'e.g. 0.22 \u00B5m syringe filter, 0.45 \u00B5m, unfiltered',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'scatteringAngle', label: 'Scattering Angle', placeholder: 'e.g. 173\u00B0 (backscatter), 90\u00B0',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'dlsTemperature', label: 'Measurement Temperature', placeholder: 'e.g. 25 \u00B0C, equilibrated 2 min',
      type: 'input', group: 'measurement', priority: 1 },
    { key: 'measurementDuration', label: 'Measurement Duration', placeholder: 'e.g. 60 s per run, 3 runs',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'cuvetteType', label: 'Cuvette Type', placeholder: 'e.g. ZEN2112 quartz, DTS0012 polystyrene, DTS1070 folded capillary',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. Z-average ~100 nm, PDI < 0.2',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT,
  ],
};

const TITRATION_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_REAGENT, G_ELECTRODE, G_STATUS],
  fields: [
    { key: 'analyte', label: 'Analyte', placeholder: 'e.g. HCl, NaOH, vitamin C, Ca\u00B2\u207A',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. pharmaceutical tablet dissolved in water',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleWeightVol', label: 'Sample Weight / Volume', placeholder: 'e.g. 0.5 g dissolved in 50 mL, or 10 mL aliquot',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'titrant', label: 'Titrant', placeholder: 'e.g. 0.1 M NaOH, 0.01 M AgNO3, Karl Fischer reagent',
      type: 'input', group: 'reagent', priority: 1 },
    { key: 'titrantConcentration', label: 'Titrant Concentration / Factor', placeholder: 'e.g. 0.1000 M, factor 1.002',
      type: 'input', group: 'reagent', priority: 1 },
    { key: 'titrantStandardization', label: 'Last Standardization', placeholder: 'e.g. standardized yesterday with KHP',
      type: 'input', group: 'reagent', priority: 2 },
    { key: 'electrodeType', label: 'Electrode Type', placeholder: 'e.g. combined pH glass electrode, Ag/AgCl ISE',
      type: 'input', group: 'electrode', priority: 1 },
    { key: 'electrodeAge', label: 'Electrode Age / Condition', placeholder: 'e.g. 6 months old, slope 97%',
      type: 'input', group: 'electrode', priority: 2 },
    { key: 'endpointMode', label: 'Endpoint Mode', placeholder: 'e.g. potentiometric EP, fixed pH 7.0, color indicator',
      type: 'input', group: 'status', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. ~5 mL EP volume, assay 99.5%',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const KF_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CELL, G_STATUS],
  fields: [
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. API powder, oil, lyophilized vial',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMass', label: 'Sample Mass', placeholder: 'e.g. 50 mg, 100 \u00B5L',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'sampleSolubility', label: 'Sample Solubility', placeholder: 'e.g. soluble in methanol, insoluble (requires oven)',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'kfMethod', label: 'KF Method', placeholder: 'e.g. coulometric, volumetric',
      type: 'input', group: 'cell', priority: 1 },
    { key: 'kfReagent', label: 'KF Reagent', placeholder: 'e.g. Hydranal Coulomat AG-H, Aquastar CombiCoulomat',
      type: 'input', group: 'cell', priority: 1 },
    { key: 'workingMedium', label: 'Working Medium', placeholder: 'e.g. methanol, 1-decanol',
      type: 'input', group: 'cell', priority: 2 },
    { key: 'driftLimit', label: 'Drift / Endpoint', placeholder: 'e.g. drift < 10 \u00B5g/min, endpoint 20 \u00B5g/min',
      type: 'input', group: 'cell', priority: 1 },
    { key: 'expectedResult', label: 'Expected Water Content', placeholder: 'e.g. ~0.5% w/w, NMT 1.0%',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const KFO_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, { id: 'oven', label: 'Oven' }, G_CELL, G_STATUS],
  fields: [
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. pharmaceutical tablet, polymer pellet',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMass', label: 'Sample Mass', placeholder: 'e.g. 200 mg',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'ovenTemperature', label: 'Oven Temperature', placeholder: 'e.g. 150 \u00B0C, or ramp 25\u2192200\u00B0C',
      type: 'input', group: 'oven', priority: 1 },
    { key: 'carrierGasFlow', label: 'Carrier Gas Flow', placeholder: 'e.g. dry nitrogen 200 mL/min',
      type: 'input', group: 'oven', priority: 1 },
    { key: 'transferLineCondition', label: 'Transfer Line', placeholder: 'e.g. heated to 160\u00B0C, clean, old/discolored',
      type: 'input', group: 'oven', priority: 2 },
    { key: 'kfReagent', label: 'KF Reagent', placeholder: 'e.g. Hydranal Coulomat AG-H',
      type: 'input', group: 'cell', priority: 1 },
    { key: 'driftLimit', label: 'Drift / Endpoint', placeholder: 'e.g. drift < 10 \u00B5g/min',
      type: 'input', group: 'cell', priority: 1 },
    { key: 'expectedResult', label: 'Expected Water Content', placeholder: 'e.g. ~0.3% w/w',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const CD_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_MEASUREMENT, G_STATUS],
  fields: [
    { key: 'sampleConcentration', label: 'Sample Concentration', placeholder: 'e.g. 0.5 mg/mL protein, 50 \u00B5M peptide',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'bufferComposition', label: 'Buffer', placeholder: 'e.g. 10 mM phosphate pH 7.4, avoid high-UV-absorbing buffers',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'cuvettePathLength', label: 'Cuvette Path Length', placeholder: 'e.g. 1 mm, 0.1 mm (far-UV)',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'wavelengthRange', label: 'Wavelength Range', placeholder: 'e.g. 190\u2013260 nm (far-UV), 250\u2013320 nm (near-UV)',
      type: 'input', group: 'measurement', priority: 1 },
    { key: 'scanSpeed', label: 'Scan Speed', placeholder: 'e.g. 100 nm/min, 50 nm/min',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'bandwidth', label: 'Bandwidth', placeholder: 'e.g. 1 nm',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'accumulations', label: 'Number of Accumulations', placeholder: 'e.g. 3 scans averaged',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'nitrogenPurge', label: 'Nitrogen Purge Flow', placeholder: 'e.g. 10 L/min, or not purged',
      type: 'input', group: 'status', priority: 1 },
    { key: 'htVoltage', label: 'HT Voltage Observed', placeholder: 'e.g. < 600 V at 200 nm, or >800 V (too high)',
      type: 'input', group: 'status', priority: 1 },
    F_EXPECTED, F_MAINT,
  ],
};

const SEM_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_BEAM, G_DETECTOR, G_VACUUM, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. biological tissue, metal alloy, polymer film',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'sampleCoating', label: 'Coating', placeholder: 'e.g. Au/Pd 5 nm, uncoated (low-vacuum mode)',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'mountingMethod', label: 'Mounting', placeholder: 'e.g. carbon tape, silver paste, cryo-stub',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'acceleratingVoltage', label: 'Accelerating Voltage', placeholder: 'e.g. 5 kV, 15 kV',
      type: 'input', group: 'beam', priority: 1 },
    { key: 'beamCurrent', label: 'Beam Current / Spot Size', placeholder: 'e.g. spot size 3.0, or 50 pA',
      type: 'input', group: 'beam', priority: 2 },
    { key: 'workingDistance', label: 'Working Distance', placeholder: 'e.g. 10 mm',
      type: 'input', group: 'beam', priority: 2 },
    { key: 'semDetector', label: 'Detector', placeholder: 'e.g. SE (Everhart-Thornley), BSE, EDS',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'vacuumLevel', label: 'Vacuum Level', placeholder: 'e.g. high vacuum, low vacuum 60 Pa',
      type: 'input', group: 'vacuum', priority: 1 },
    F_EXPECTED, F_MAINT,
  ],
};

const SPUTTER_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_TARGET, G_VACUUM, G_STATUS],
  fields: [
    { key: 'substrateType', label: 'Substrate', placeholder: 'e.g. glass slide, SEM stub, TEM grid',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'substratePrep', label: 'Substrate Preparation', placeholder: 'e.g. plasma cleaned, rinsed with ethanol',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'targetMaterial', label: 'Target Material', placeholder: 'e.g. Au, Au/Pd 60/40, Pt, Ir',
      type: 'input', group: 'target', priority: 1 },
    { key: 'targetAge', label: 'Target Age / Condition', placeholder: 'e.g. new, ~50 hours use, worn',
      type: 'input', group: 'target', priority: 2 },
    { key: 'sputterGas', label: 'Sputter Gas', placeholder: 'e.g. argon',
      type: 'input', group: 'target', priority: 1 },
    { key: 'gasPressure', label: 'Gas Pressure', placeholder: 'e.g. 0.05 mbar, 70 mTorr',
      type: 'input', group: 'target', priority: 1 },
    { key: 'sputterCurrent', label: 'Sputter Current', placeholder: 'e.g. 30 mA',
      type: 'input', group: 'target', priority: 1 },
    { key: 'depositionTime', label: 'Deposition Time', placeholder: 'e.g. 60 s, 120 s',
      type: 'input', group: 'target', priority: 1 },
    { key: 'vacuumLevel', label: 'Base Vacuum', placeholder: 'e.g. 5e-2 mbar',
      type: 'input', group: 'vacuum', priority: 2 },
    { key: 'expectedResult', label: 'Expected Film Thickness', placeholder: 'e.g. ~10 nm Au',
      type: 'input', group: 'status', priority: 2, isExisting: true },
    F_MAINT,
  ],
};

const BET_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_MEASUREMENT, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. silica gel, activated carbon, MOF',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'sampleMass', label: 'Sample Mass', placeholder: 'e.g. 200 mg',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'degassingTemp', label: 'Degassing Temperature', placeholder: 'e.g. 150 \u00B0C for 4 hours',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'degassingTime', label: 'Degassing Time', placeholder: 'e.g. 4 hours, overnight',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'analysisGas', label: 'Analysis Gas', placeholder: 'e.g. nitrogen, krypton',
      type: 'input', group: 'measurement', priority: 1 },
    { key: 'bathTemperature', label: 'Bath Temperature', placeholder: 'e.g. 77 K (liquid N2)',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'pressurePoints', label: 'Pressure Points (P/P0)', placeholder: 'e.g. 0.05\u20130.3 (5 points)',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'freeSpace', label: 'Free-Space Measurement', placeholder: 'e.g. measured or calculated, He free space',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'expectedResult', label: 'Expected Surface Area', placeholder: 'e.g. ~300 m\u00B2/g (spec > 250)',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT,
  ],
};

const SECMALS_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_COLUMN_SEC, G_CHROM, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'analyte', label: 'Analyte', placeholder: 'e.g. mAb monomer/aggregate, PEG standard, polysaccharide',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleMatrix', label: 'Sample Description', placeholder: 'e.g. formulation buffer, purified protein',
      type: 'input', group: 'sample', priority: 1, isExisting: true },
    { key: 'sampleConcentration', label: 'Concentration', placeholder: 'e.g. 2 mg/mL',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'dndcValue', label: 'dn/dc Value', placeholder: 'e.g. 0.185 mL/g (typical protein)',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'column', label: 'SEC Column(s)', placeholder: 'e.g. TSKgel G3000SWXL, Superose 6 Increase',
      type: 'input', group: 'column_sec', priority: 1, isExisting: true },
    { key: 'guardColumn', label: 'Guard Column', placeholder: 'e.g. TSKgel guard column SWXL',
      type: 'input', group: 'column_sec', priority: 2 },
    { key: 'malsDetector', label: 'MALS Detector', placeholder: 'e.g. DAWN HELEOS II (18-angle), miniDAWN',
      type: 'input', group: 'column_sec', priority: 2 },
    { key: 'riDetector', label: 'RI Detector', placeholder: 'e.g. Optilab T-rEX, built-in RID',
      type: 'input', group: 'column_sec', priority: 2 },
    { key: 'mobilephase', label: 'Mobile Phase', placeholder: 'e.g. PBS pH 7.4, 200 mM phosphate',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 0.5 mL/min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'injectionVolume', label: 'Injection Volume', placeholder: 'e.g. 50 \u00B5L',
      type: 'input', group: 'chrom', priority: 2, isExisting: true },
    { key: 'bandBroadening', label: 'Band Broadening Correction', placeholder: 'e.g. applied, or not corrected',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'interDetectorDelay', label: 'Inter-Detector Delay', placeholder: 'e.g. determined with BSA standard',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'normalization', label: 'Normalization', placeholder: 'e.g. BSA monomer, last normalized 1 week ago',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'expectedResult', label: 'Expected Result', placeholder: 'e.g. Mw ~150 kDa monomer, <5% aggregate',
      type: 'input', group: 'status', priority: 1, isExisting: true },
    F_MAINT, F_QC,
  ],
};

const TEM_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_BEAM, { id: 'imaging', label: 'Imaging' }, G_VACUUM, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. nanoparticles, biological section, polymer thin film',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'gridType', label: 'Grid Type', placeholder: 'e.g. Cu 300 mesh carbon-coated, lacey carbon, quantifoil',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'stainPrep', label: 'Stain / Preparation', placeholder: 'e.g. 2% uranyl acetate negative stain, unstained, cryo-plunged',
      type: 'input', group: 'sample', priority: 1 },
    F_METHOD_COND,
    { key: 'acceleratingVoltage', label: 'Accelerating Voltage', placeholder: 'e.g. 120 kV, 200 kV, 300 kV',
      type: 'input', group: 'beam', priority: 1 },
    { key: 'beamCurrent', label: 'Beam Current / Spot Size', placeholder: 'e.g. spot size 3, low-dose mode',
      type: 'input', group: 'beam', priority: 2 },
    { key: 'magnification', label: 'Magnification Range', placeholder: 'e.g. 50k\u2013200k\u00D7',
      type: 'input', group: 'imaging', priority: 2 },
    { key: 'cameraDetector', label: 'Camera / Detector', placeholder: 'e.g. Ceta 16M, US4000, K3 direct detector',
      type: 'input', group: 'imaging', priority: 2 },
    { key: 'defocus', label: 'Defocus', placeholder: 'e.g. -1 to -3 \u00B5m (cryo-EM)',
      type: 'input', group: 'imaging', priority: 2 },
    { key: 'vacuumLevel', label: 'Vacuum / Column Status', placeholder: 'e.g. column vacuum normal, or high contamination',
      type: 'input', group: 'vacuum', priority: 2 },
    { key: 'cryoTemp', label: 'Cryo Temperature', placeholder: 'e.g. -175 \u00B0C (cryo-TEM), or N/A',
      type: 'input', group: 'vacuum', priority: 2 },
    F_EXPECTED, F_MAINT,
  ],
};

const RAMAN_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_LASER, G_MEASUREMENT, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. pharmaceutical tablet, polymer film, geological sample',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'samplePrep', label: 'Sample Preparation', placeholder: 'e.g. pressed pellet, thin section, in vial (through glass)',
      type: 'input', group: 'sample', priority: 2 },
    { key: 'substrate', label: 'Substrate / Holder', placeholder: 'e.g. glass slide, aluminum holder, gold-coated slide (SERS)',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'excitationWavelength', label: 'Excitation Wavelength', placeholder: 'e.g. 532 nm, 633 nm, 785 nm, 1064 nm',
      type: 'input', group: 'laser', priority: 1 },
    { key: 'laserPower', label: 'Laser Power', placeholder: 'e.g. 10 mW, 50% of max, 5 mW at sample',
      type: 'input', group: 'laser', priority: 1 },
    { key: 'spotSize', label: 'Spot Size / Objective', placeholder: 'e.g. 50\u00D7 objective, ~1 \u00B5m spot',
      type: 'input', group: 'laser', priority: 2 },
    { key: 'spectralRange', label: 'Spectral Range', placeholder: 'e.g. 100\u20133200 cm\u207B\u00B9',
      type: 'input', group: 'measurement', priority: 1 },
    { key: 'integrationTime', label: 'Integration Time', placeholder: 'e.g. 10 s, 3 accumulations',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'grating', label: 'Grating', placeholder: 'e.g. 1800 gr/mm, 600 gr/mm',
      type: 'input', group: 'measurement', priority: 2 },
    { key: 'siliconReference', label: 'Si Calibration', placeholder: 'e.g. Si peak at 520.5 cm\u207B\u00B9, last checked today',
      type: 'input', group: 'calibration', priority: 2 },
    F_EXPECTED, F_MAINT,
  ],
};

const SSNMR_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_PROBE, G_CALIBRATION, G_STATUS],
  fields: [
    { key: 'sampleType', label: 'Sample Type', placeholder: 'e.g. crystalline API, amorphous polymer, inorganic oxide',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'rotorDiameter', label: 'Rotor Diameter', placeholder: 'e.g. 4 mm, 3.2 mm, 1.3 mm',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'masSpeed', label: 'MAS Speed', placeholder: 'e.g. 10 kHz, 15 kHz, 60 kHz (fast MAS)',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'samplePacking', label: 'Sample Packing', placeholder: 'e.g. center-packed, full rotor, added KBr spacer',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'probeType', label: 'Probe Type', placeholder: 'e.g. 4mm HXY, 3.2mm BioSolids E-free, 1.3mm HX',
      type: 'input', group: 'probe', priority: 1 },
    { key: 'nucleus', label: 'Nucleus / Experiment', placeholder: 'e.g. \u00B9\u00B3C CP-MAS, \u00B9H, \u00B9\u2075N, \u00B3\u00B9P',
      type: 'input', group: 'probe', priority: 1 },
    { key: 'pulseSequence', label: 'Pulse Sequence', placeholder: 'e.g. CP-MAS, direct polarization, HETCOR, 2D RFDR',
      type: 'input', group: 'probe', priority: 1 },
    { key: 'contactTime', label: 'Contact Time (CP)', placeholder: 'e.g. 2 ms',
      type: 'input', group: 'probe', priority: 2 },
    { key: 'recycleDelay', label: 'Recycle Delay', placeholder: 'e.g. 5 s, 30 s (quantitative)',
      type: 'input', group: 'probe', priority: 2 },
    { key: 'magicAngleCal', label: 'Magic Angle Calibration', placeholder: 'e.g. KBr spinning sidebands, last checked today',
      type: 'input', group: 'calibration', priority: 2 },
    { key: 'referenceCompound', label: 'Chemical Shift Reference', placeholder: 'e.g. adamantane (\u00B9\u00B3C 38.5 ppm), DSS',
      type: 'input', group: 'calibration', priority: 2 },
    F_EXPECTED, F_MAINT,
  ],
};

const NMR_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_PROBE, { id: 'processing', label: 'Processing' }, G_STATUS],
  fields: [
    { key: 'analyteConcentration', label: 'Analyte / Concentration', placeholder: 'e.g. 10 mg in 0.6 mL, 5 mM',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'nmrSolvent', label: 'Solvent', placeholder: 'e.g. CDCl3, DMSO-d6, D2O, CD3OD',
      type: 'input', group: 'sample', priority: 1 },
    { key: 'nmrTubeType', label: 'NMR Tube', placeholder: 'e.g. 5 mm standard, 3 mm, Shigemi',
      type: 'input', group: 'sample', priority: 2 },
    F_METHOD_COND,
    { key: 'probeType', label: 'Probe Type', placeholder: 'e.g. BBO, TXI cryoprobe, BBFO SmartProbe',
      type: 'input', group: 'probe', priority: 1 },
    { key: 'nucleus', label: 'Nucleus / Experiment', placeholder: 'e.g. \u00B9H, \u00B9\u00B3C, COSY, HSQC, NOESY',
      type: 'input', group: 'probe', priority: 1 },
    { key: 'numScans', label: 'Number of Scans (NS)', placeholder: 'e.g. 16 (\u00B9H), 1024 (\u00B9\u00B3C)',
      type: 'input', group: 'probe', priority: 2 },
    { key: 'relaxationDelay', label: 'Relaxation Delay (D1)', placeholder: 'e.g. 1 s, 30 s (quantitative)',
      type: 'input', group: 'probe', priority: 2 },
    { key: 'temperature', label: 'Probe Temperature', placeholder: 'e.g. 25 \u00B0C, VT experiment 5\u201380 \u00B0C',
      type: 'input', group: 'probe', priority: 2 },
    { key: 'shimmingQuality', label: 'Shimming / Lock', placeholder: 'e.g. topshim OK, lock signal stable, manual shim needed',
      type: 'input', group: 'processing', priority: 1 },
    { key: 'lockSignal', label: 'Lock Signal Level', placeholder: 'e.g. lock level 80%, stable',
      type: 'input', group: 'processing', priority: 2 },
    { key: 'gradientShimming', label: 'Gradient Shimming', placeholder: 'e.g. gradient shimming applied, or manual only',
      type: 'input', group: 'processing', priority: 2 },
    F_EXPECTED, F_MAINT,
  ],
};

const PREPLC_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_CHROM, G_DETECTOR, G_STATUS, G_SST],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX, F_SAMPLE_MATRIX_TYPE,
    F_METHOD_COND,
    { key: 'column', label: 'Prep Column', placeholder: 'e.g. C18 250\u00D721.2mm 5\u00B5m',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { ...F_COLUMN_INJ, group: 'chrom' },
    { key: 'mobilephase', label: 'Mobile Phase', placeholder: 'e.g. water + 0.1% TFA / ACN',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'flowRate', label: 'Flow Rate', placeholder: 'e.g. 20 mL/min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'injectionVolume', label: 'Injection Volume / Load', placeholder: 'e.g. 500 \u00B5L, or 50 mg on-column',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'gradient', label: 'Gradient Program', placeholder: 'e.g. 10\u219290% ACN in 30 min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'retentionTime', label: 'Retention Time', placeholder: 'e.g. target peak at 18.5 min',
      type: 'input', group: 'chrom', priority: 1, isExisting: true },
    { key: 'detectorType', label: 'Detector', placeholder: 'e.g. UV 220/254 nm, DAD, MS trigger',
      type: 'input', group: 'detector', priority: 1 },
    { key: 'fractionCollection', label: 'Fraction Collection', placeholder: 'e.g. time-based every 30 s, threshold-based UV > 100 mAU',
      type: 'input', group: 'detector', priority: 2 },
    F_EXPECTED, F_MAINT, F_QC,
    F_SST_PLATES, F_SST_TAILING, F_SST_RES, F_SST_RSD,
  ],
};

// ═══════════════════════════════════════════════════════════════════════
//  SCHEMA REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export const TECHNIQUE_SCHEMAS: Record<string, TechniqueContextSchema> = {
  HPLC:      HPLC_SCHEMA,
  UHPLC:     UHPLC_SCHEMA,
  LCMS:      LCMS_SCHEMA,
  GC:        GC_SCHEMA,
  GCMS:      GCMS_SCHEMA,
  IC:        IC_SCHEMA,
  CE:        CE_SCHEMA,
  SFC:       SFC_SCHEMA,
  TGA:       TGA_SCHEMA,
  DSC:       DSC_SCHEMA,
  FPLC:      FPLC_SCHEMA,
  SPPS:      SPPS_SCHEMA,
  XRD:       XRD_SCHEMA,
  DLS:       DLS_SCHEMA,
  Titration: TITRATION_SCHEMA,
  KF:        KF_SCHEMA,
  KFO:       KFO_SCHEMA,
  CD:        CD_SCHEMA,
  SEM:       SEM_SCHEMA,
  Sputter:   SPUTTER_SCHEMA,
  BET:       BET_SCHEMA,
  SECMALS:   SECMALS_SCHEMA,
  TEM:       TEM_SCHEMA,
  Raman:     RAMAN_SCHEMA,
  ssNMR:     SSNMR_SCHEMA,
  NMR:       NMR_SCHEMA,
  PrepLC:    PREPLC_SCHEMA,
};

/**
 * Resolve the context schema for a given technique.
 * Falls back to a minimal default schema if the technique is not mapped.
 */
export function getContextSchema(technique: string): TechniqueContextSchema {
  return TECHNIQUE_SCHEMAS[technique] ?? FALLBACK_SCHEMA;
}

const FALLBACK_SCHEMA: TechniqueContextSchema = {
  groups: [G_SAMPLE, G_METHOD, G_STATUS],
  fields: [
    F_ANALYTE, F_SAMPLE_MATRIX,
    F_METHOD_COND,
    F_EXPECTED, F_MAINT, F_QC,
  ],
};

// ── Issue-based Advanced Context field prioritization ────────────────────────
// When the user selects a troubleshooting issue, certain fields become more
// diagnostically important.  This module maps issue categories to the field
// keys that should be promoted to priority 1 (always visible).
//
// Keys can be either existing Step2Data fields or dynamic keys from
// context-schemas.ts.

/**
 * Map of issue category (lowercase, from issue-detector or user selection)
 * to field keys that should be promoted to priority 1.
 */
export const ISSUE_FIELD_PRIORITIES: Record<string, string[]> = {
  // ── Chromatography (LC) ───────────────────────────────────────────
  'retention time shift': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate', 'gradient',
    'retentionTime', 'recentMaint', 'methodConditions',
  ],
  'peak tailing': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate', 'sampleMatrix',
    'sst_tailing_factor', 'sst_plates', 'recentMaint',
  ],
  'peak broadening': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate', 'injectionVolume',
    'sst_plates', 'sst_resolution', 'retentionTime',
  ],
  'split peaks': [
    'column', 'mobilephase', 'sampleMatrix', 'injectionVolume', 'flowRate',
    'sst_plates', 'retentionTime',
  ],
  'noisy baseline': [
    'mobilephase', 'flowRate', 'detectorType', 'detectionWavelength',
    'recentMaint', 'qcResults', 'column',
  ],
  'high backpressure': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate', 'recentMaint',
    'sampleMatrix', 'guardColumn', 'systemPressure',
  ],
  'baseline drift': [
    'mobilephase', 'gradient', 'detectorType', 'detectionWavelength',
    'recentMaint', 'column',
  ],
  'loss of resolution': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate', 'gradient',
    'sst_resolution', 'sst_plates', 'retentionTime',
  ],
  'carryover': [
    'injectionVolume', 'sampleMatrix', 'column', 'mobilephase',
    'recentMaint', 'analyte',
  ],
  'low sensitivity': [
    'analyte', 'sampleMatrix', 'sample_matrix_type', 'ionizationMode',
    'sourceParams', 'acquisitionMode', 'expectedMz', 'tuneCalStatus',
    'flowRate', 'injectionVolume', 'detectionWavelength',
  ],
  'no peak': [
    'analyte', 'sampleMatrix', 'column', 'mobilephase', 'retentionTime',
    'ionizationMode', 'acquisitionMode', 'expectedMz', 'injectionVolume',
    'expectedResult',
  ],
  'void volume issue': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate',
    'retentionTime', 'recentMaint',
  ],
  'column overloading': [
    'injectionVolume', 'analyte', 'sampleMatrix', 'column', 'flowRate',
    'sst_plates', 'sst_tailing_factor',
  ],
  'pressure surge at injection': [
    'injectionVolume', 'flowRate', 'column', 'sampleMatrix',
    'recentMaint', 'systemPressure',
  ],

  // ── LC-MS specific ────────────────────────────────────────────────
  'lcms source contamination': [
    'ionizationMode', 'sourceParams', 'backgroundIons', 'recentMaint',
    'sampleMatrix', 'mobilephase', 'flowRate', 'tuneCalStatus',
  ],
  'ion suppression': [
    'sampleMatrix', 'sample_matrix_type', 'ionizationMode', 'sourceParams',
    'mobilephase', 'flowRate', 'analyte', 'expectedMz',
  ],
  'adduct formation': [
    'mobilephase', 'ionizationMode', 'sourceParams', 'expectedMz',
    'backgroundIons', 'acquisitionMode',
  ],
  'instrument communication fault': [
    'errorMessages', 'recentMaint', 'qcResults',
  ],

  // ── GC / GC-MS specific ──────────────────────────────────────────
  'gc ghost peaks': [
    'column', 'inletTemperature', 'ovenProgram', 'injectionMode',
    'carrierGas', 'recentMaint',
  ],
  'poor gc peak shape': [
    'column', 'injectionMode', 'inletTemperature', 'injectionVolume',
    'ovenProgram', 'carrierFlowPressure',
  ],
  'gcms signal loss': [
    'ionizationMode', 'tuneResults', 'vacuumStatus', 'transferLineTemp',
    'ionSourceTemp', 'leakCheckResults', 'recentMaint',
  ],

  // ── IC specific ───────────────────────────────────────────────────
  'ic suppressor failure': [
    'suppressorType', 'suppressorCurrent', 'mobilephase', 'flowRate',
    'recentMaint', 'conductivityDetector',
  ],
  'ic baseline rise': [
    'suppressorType', 'mobilephase', 'eluentGeneration', 'recentMaint',
    'conductivityDetector',
  ],
  'ic peak distortion': [
    'column', 'mobilephase', 'flowRate', 'injectionVolume',
    'suppressorType', 'retentionTime',
  ],
  'ic wrong retention time': [
    'column', 'mobilephase', 'flowRate', 'eluentGeneration',
    'retentionTime', 'recentMaint',
  ],

  // ── TGA specific ──────────────────────────────────────────────────
  'unstable mass signal': [
    'sampleMass', 'crucibleType', 'purgeGas', 'temperatureProgram',
    'massCalibration', 'recentMaint',
  ],
  'tga wrong decomposition temperature': [
    'temperatureProgram', 'heatingRate', 'tempCalStandard', 'purgeGas',
    'sampleMass',
  ],
  'tga buoyancy artifact': [
    'crucibleType', 'purgeGas', 'temperatureProgram', 'heatingRate',
    'massCalibration',
  ],
  'tga oxidation in inert atmosphere': [
    'purgeGas', 'reactiveGas', 'recentMaint',
  ],
  'poor tga reproducibility': [
    'sampleMass', 'crucibleType', 'heatingRate', 'purgeGas',
    'tempCalStandard', 'massCalibration',
  ],

  // ── DSC specific ──────────────────────────────────────────────────
  'dsc noisy baseline': [
    'purgeGas', 'panType', 'calibrationStandards', 'baselineCorrection',
    'recentMaint',
  ],
  'dsc tg shift': [
    'heatingRate', 'sampleMass', 'panType', 'temperatureProgram',
    'calibrationStandards',
  ],
  'dsc broad melting peak': [
    'sampleMass', 'heatingRate', 'panType', 'calibrationStandards',
    'temperatureProgram',
  ],
  'poor enthalpy reproducibility': [
    'sampleMass', 'panType', 'calibrationStandards', 'heatingRate',
    'recentMaint',
  ],
  'dsc baseline curvature': [
    'panType', 'calibrationStandards', 'baselineCorrection', 'purgeGas',
    'recentMaint',
  ],

  // ── FPLC specific ─────────────────────────────────────────────────
  'high system pressure': [
    'column', 'columnVolume', 'flowRate', 'resinType', 'mobilephase',
    'recentMaint',
  ],
  'fplc poor peak resolution': [
    'column', 'columnVolume', 'resinType', 'mobilephase', 'gradient',
    'flowRate',
  ],
  'fplc air bubbles': [
    'mobilephase', 'flowRate', 'recentMaint',
  ],
  'fplc uv baseline noise': [
    'mobilephase', 'uvWavelength', 'flowRate', 'recentMaint',
  ],
  'fplc gradient inaccuracy': [
    'mobilephase', 'gradient', 'flowRate', 'recentMaint',
  ],
  'oligonucleotide poor separation': [
    'column', 'resinType', 'mobilephase', 'gradient', 'flowRate',
    'analyte',
  ],

  // ── SPPS specific ─────────────────────────────────────────────────
  'incomplete coupling': [
    'couplingReagent', 'couplingTime', 'targetSequence', 'solvent',
    'resinType', 'resinLoading', 'temperature',
  ],
  'deletion sequences': [
    'couplingReagent', 'deprotectionReagent', 'couplingTime', 'targetSequence',
    'resinType',
  ],
  'low crude purity': [
    'cleavageCocktail', 'couplingReagent', 'deprotectionReagent',
    'targetSequence', 'solvent',
  ],
  'incomplete fmoc deprotection': [
    'deprotectionReagent', 'solvent', 'resinType',
  ],

  // ── XRD specific ──────────────────────────────────────────────────
  'xrd peak shift': [
    'samplePrep', 'referenceStandard', 'alignmentStatus', 'scanRange',
    'xraySource',
  ],
  'xrd broad peaks': [
    'samplePrep', 'particleSize', 'scanRange', 'stepSize', 'scanSpeed',
  ],
  'xrd low intensity': [
    'tubeVoltage', 'samplePrep', 'scanSpeed', 'slitWidth', 'xraySource',
  ],
  'xrd background noise': [
    'samplePrep', 'tubeVoltage', 'slitWidth', 'xraySource',
  ],

  // ── DLS specific ──────────────────────────────────────────────────
  'dls high pdi': [
    'sampleConcentration', 'sampleFiltration', 'dlsSolvent', 'dlsTemperature',
    'cuvetteType',
  ],
  'dls flat correlogram': [
    'sampleConcentration', 'dlsSolvent', 'sampleFiltration', 'cuvetteType',
    'measurementDuration',
  ],
  'dls inconsistent size': [
    'sampleConcentration', 'sampleFiltration', 'dlsTemperature',
    'measurementDuration', 'cuvetteType',
  ],
  'dls dust contamination': [
    'sampleFiltration', 'cuvetteType', 'dlsSolvent',
  ],

  // ── Titration specific ────────────────────────────────────────────
  'endpoint not detected': [
    'electrodeType', 'titrant', 'titrantConcentration', 'endpointMode',
    'analyte', 'sampleWeightVol',
  ],
  'titration high drift': [
    'electrodeType', 'electrodeAge', 'titrant', 'recentMaint',
  ],
  'wrong titre volume': [
    'titrant', 'titrantConcentration', 'titrantStandardization',
    'sampleWeightVol', 'analyte',
  ],
  'electrode sluggish response': [
    'electrodeType', 'electrodeAge', 'recentMaint',
  ],

  // ── KF specific ───────────────────────────────────────────────────
  'kf endpoint drift': [
    'kfReagent', 'workingMedium', 'driftLimit', 'recentMaint',
  ],
  'kf low water recovery': [
    'sampleMass', 'sampleSolubility', 'kfMethod', 'kfReagent',
  ],
  'kf high blank': [
    'kfReagent', 'workingMedium', 'driftLimit', 'recentMaint',
  ],
  'kf coulometric error': [
    'kfMethod', 'kfReagent', 'driftLimit', 'recentMaint',
  ],

  // ── KFO specific ──────────────────────────────────────────────────
  'kfo incomplete water transfer': [
    'ovenTemperature', 'carrierGasFlow', 'transferLineCondition',
    'sampleMass',
  ],
  'kfo high blank': [
    'kfReagent', 'driftLimit', 'carrierGasFlow', 'recentMaint',
  ],
  'kfo sample charring': [
    'ovenTemperature', 'sampleMass', 'sampleMatrix',
  ],

  // ── CD specific ───────────────────────────────────────────────────
  'cd high ht voltage': [
    'sampleConcentration', 'cuvettePathLength', 'bufferComposition',
    'wavelengthRange', 'nitrogenPurge', 'htVoltage',
  ],
  'cd excessive noise below 200 nm': [
    'nitrogenPurge', 'bufferComposition', 'cuvettePathLength',
    'sampleConcentration', 'htVoltage',
  ],
  'cd baseline drift': [
    'nitrogenPurge', 'recentMaint', 'bufferComposition',
  ],

  // ── SEM specific ──────────────────────────────────────────────────
  'sem charging artifacts': [
    'sampleCoating', 'acceleratingVoltage', 'vacuumLevel',
    'sampleType', 'beamCurrent',
  ],
  'sem blurry image': [
    'acceleratingVoltage', 'workingDistance', 'beamCurrent',
    'semDetector', 'recentMaint',
  ],
  'sem vacuum failure': [
    'vacuumLevel', 'recentMaint', 'sampleType',
  ],

  // ── Sputter specific ──────────────────────────────────────────────
  'sputter non-uniform coating': [
    'targetMaterial', 'gasPressure', 'sputterCurrent', 'depositionTime',
    'substrateType',
  ],
  'sputter arcing': [
    'targetMaterial', 'targetAge', 'gasPressure', 'sputterCurrent',
    'vacuumLevel',
  ],

  // ── BET specific ──────────────────────────────────────────────────
  'bet negative constant': [
    'degassingTemp', 'degassingTime', 'analysisGas', 'sampleMass',
    'pressurePoints',
  ],
  'bet poor linearity': [
    'pressurePoints', 'degassingTemp', 'sampleMass', 'freeSpace',
  ],
  'bet leak': [
    'recentMaint', 'freeSpace', 'analysisGas',
  ],

  // ── SEC-MALS specific ─────────────────────────────────────────────
  'secmals light scattering noise': [
    'sampleConcentration', 'sampleFiltration', 'malsDetector',
    'mobilephase', 'column', 'normalization',
  ],
  'secmals incorrect molecular weight': [
    'dndcValue', 'sampleConcentration', 'interDetectorDelay',
    'normalization', 'bandBroadening', 'column',
  ],
  'secmals negative peaks': [
    'dndcValue', 'riDetector', 'mobilephase', 'sampleConcentration',
  ],
  'secmals ri baseline drift': [
    'riDetector', 'mobilephase', 'flowRate', 'recentMaint',
  ],

  // ── TEM specific ──────────────────────────────────────────────────
  'tem poor image quality': [
    'acceleratingVoltage', 'gridType', 'stainPrep', 'defocus',
    'beamCurrent',
  ],
  'tem sample drift': [
    'gridType', 'stainPrep', 'cryoTemp', 'recentMaint',
  ],
  'tem charging': [
    'gridType', 'sampleType', 'acceleratingVoltage', 'beamCurrent',
  ],
  'tem beam damage': [
    'acceleratingVoltage', 'beamCurrent', 'sampleType',
  ],

  // ── Raman specific ────────────────────────────────────────────────
  'raman high fluorescence': [
    'excitationWavelength', 'laserPower', 'sampleType', 'substrate',
    'samplePrep',
  ],
  'raman weak signal': [
    'laserPower', 'integrationTime', 'excitationWavelength', 'spotSize',
    'grating', 'sampleType',
  ],
  'raman sample burning': [
    'laserPower', 'sampleType', 'spotSize',
  ],
  'raman peak shift': [
    'siliconReference', 'excitationWavelength', 'recentMaint',
  ],

  // ── ssNMR specific ────────────────────────────────────────────────
  'ssnmr mas failure': [
    'rotorDiameter', 'masSpeed', 'samplePacking', 'recentMaint',
  ],
  'ssnmr rotor instability': [
    'rotorDiameter', 'masSpeed', 'samplePacking',
  ],
  'ssnmr probe tuning failure': [
    'probeType', 'nucleus', 'recentMaint',
  ],
  'ssnmr low sensitivity': [
    'nucleus', 'pulseSequence', 'contactTime', 'recycleDelay',
    'sampleType', 'rotorDiameter',
  ],
  'ssnmr peak broadening': [
    'masSpeed', 'magicAngleCal', 'sampleType', 'rotorDiameter',
  ],

  // ── NMR (solution) specific ───────────────────────────────────────
  'nmr lock failure': [
    'nmrSolvent', 'shimmingQuality', 'lockSignal', 'recentMaint',
  ],
  'nmr poor shimming': [
    'shimmingQuality', 'gradientShimming', 'nmrSolvent', 'nmrTubeType',
  ],
  'nmr broad peaks': [
    'shimmingQuality', 'nmrSolvent', 'analyteConcentration', 'temperature',
    'probeType',
  ],
  'nmr solvent suppression failure': [
    'nmrSolvent', 'nucleus', 'probeType', 'shimmingQuality',
  ],
  'nmr low sensitivity': [
    'analyteConcentration', 'numScans', 'probeType', 'nucleus',
    'nmrTubeType',
  ],

  // ── PrepLC specific ───────────────────────────────────────────────
  'preplc high backpressure': [
    'column', 'column_injection_count', 'mobilephase', 'flowRate',
    'recentMaint',
  ],
  'preplc poor peak resolution': [
    'column', 'mobilephase', 'gradient', 'flowRate', 'injectionVolume',
    'sst_resolution',
  ],
  'preplc fraction contamination': [
    'fractionCollection', 'gradient', 'injectionVolume', 'analyte',
  ],
};

/**
 * Get the set of field keys that should be promoted to high priority
 * for a given issue category.  Returns empty array if no match.
 */
export function getPromotedFields(issueCategory: string): string[] {
  if (!issueCategory) return [];
  const key = issueCategory.toLowerCase().trim();
  return ISSUE_FIELD_PRIORITIES[key] ?? [];
}

import type { Technique } from './types';

export interface InstrumentCapability {
  technique: Technique;
  vendor: string;
  model: string;
  ms_type: 'single-quad' | 'triple-quad' | 'qtof' | 'orbitrap' | 'ion-trap' | null;
  mass_range: { min: number; max: number } | null;
  ionization_modes: string[];
  capabilities: string[];
  cannot_do: string[];
  software: string[];
  max_pressure_bar: number | null;
  detector_types: string[];
  notes: string[];
}

// ─── Instrument Capability Database ─────────────────────────────────

const CAPABILITIES: InstrumentCapability[] = [
  // Agilent Single-Quad LCMS
  {
    technique: 'LCMS', vendor: 'Agilent', model: 'G6170A',
    ms_type: 'single-quad',
    mass_range: { min: 2, max: 3000 },
    ionization_modes: ['ESI', 'APCI', 'MMI', 'AJS'],
    capabilities: ['SIM', 'scan', 'SIM/scan switching', 'extended mass range', 'AJS ion source'],
    cannot_do: ['MS/MS', 'MRM', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'enhanced product ion'],
    software: ['OpenLab CDS 2.7+'],
    max_pressure_bar: null,
    detector_types: ['single quadrupole MS'],
    notes: ['Sub-30 fg IDL sensitivity', 'AJS already installed as standard', 'Operating range 15-35°C, up to 3000m altitude'],
  },
  {
    technique: 'LCMS', vendor: 'Agilent', model: 'G6125B',
    ms_type: 'single-quad',
    mass_range: { min: 10, max: 1500 },
    ionization_modes: ['ESI', 'APCI', 'MMI'],
    capabilities: ['SIM', 'scan', 'SIM/scan switching'],
    cannot_do: ['MS/MS', 'MRM', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'AJS'],
    software: ['MassHunter'],
    max_pressure_bar: null,
    detector_types: ['single quadrupole MS'],
    notes: ['Compact LC/MSD'],
  },
  {
    technique: 'LCMS', vendor: 'Agilent', model: 'G6301',
    ms_type: 'single-quad',
    mass_range: { min: 100, max: 1350 },
    ionization_modes: ['ESI', 'APCI', 'MMI'],
    capabilities: ['SIM', 'scan', 'Auto Acquire', 'autotune', 'system health monitoring'],
    cannot_do: ['MS/MS', 'MRM', 'product ion scan', 'precursor ion scan', 'neutral loss scan'],
    software: ['MassHunter WalkUp'],
    max_pressure_bar: null,
    detector_types: ['single quadrupole MS'],
    notes: ['InfinityLab LC/MSD iQ — self-aware mass detector'],
  },
  // Agilent Triple-Quad LCMS
  {
    technique: 'LCMS', vendor: 'Agilent', model: '6460',
    ms_type: 'triple-quad',
    mass_range: { min: 5, max: 3000 },
    ionization_modes: ['ESI', 'APCI', 'AJS'],
    capabilities: ['MS/MS', 'MRM', 'SIM', 'scan', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'dMRM'],
    cannot_do: [],
    software: ['MassHunter'],
    max_pressure_bar: null,
    detector_types: ['triple quadrupole MS'],
    notes: [],
  },
  {
    technique: 'LCMS', vendor: 'Agilent', model: '6470',
    ms_type: 'triple-quad',
    mass_range: { min: 5, max: 3000 },
    ionization_modes: ['ESI', 'APCI', 'AJS'],
    capabilities: ['MS/MS', 'MRM', 'SIM', 'scan', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'dMRM'],
    cannot_do: [],
    software: ['MassHunter'],
    max_pressure_bar: null,
    detector_types: ['triple quadrupole MS'],
    notes: [],
  },
  {
    technique: 'LCMS', vendor: 'Agilent', model: '6495',
    ms_type: 'triple-quad',
    mass_range: { min: 5, max: 3000 },
    ionization_modes: ['ESI', 'APCI', 'AJS'],
    capabilities: ['MS/MS', 'MRM', 'SIM', 'scan', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'dMRM', 'iFunnel'],
    cannot_do: [],
    software: ['MassHunter'],
    max_pressure_bar: null,
    detector_types: ['triple quadrupole MS'],
    notes: ['iFunnel technology for enhanced sensitivity'],
  },
  // Waters LCMS
  {
    technique: 'LCMS', vendor: 'Waters', model: 'QDa',
    ms_type: 'single-quad',
    mass_range: { min: 30, max: 1250 },
    ionization_modes: ['ESI'],
    capabilities: ['SIM', 'scan', 'full scan', 'SIR'],
    cannot_do: ['MS/MS', 'MRM', 'product ion scan', 'APCI', 'AJS'],
    software: ['MassLynx', 'Empower'],
    max_pressure_bar: null,
    detector_types: ['single quadrupole MS'],
    notes: ['Mass detector, not full MS system'],
  },
  {
    technique: 'LCMS', vendor: 'Waters', model: 'Xevo TQ-S',
    ms_type: 'triple-quad',
    mass_range: { min: 2, max: 4000 },
    ionization_modes: ['ESI', 'APCI', 'APGC', 'UniSpray'],
    capabilities: ['MS/MS', 'MRM', 'SIM', 'scan', 'product ion scan', 'precursor ion scan', 'neutral loss scan'],
    cannot_do: [],
    software: ['MassLynx'],
    max_pressure_bar: null,
    detector_types: ['triple quadrupole MS'],
    notes: ['StepWave ion guide'],
  },
  // SCIEX LCMS
  {
    technique: 'LCMS', vendor: 'SCIEX', model: 'QTRAP 6500+',
    ms_type: 'triple-quad',
    mass_range: { min: 5, max: 2000 },
    ionization_modes: ['ESI', 'APCI', 'TurboV'],
    capabilities: ['MS/MS', 'MRM', 'SIM', 'scan', 'product ion scan', 'precursor ion scan', 'neutral loss scan', 'enhanced product ion', 'linear ion trap'],
    cannot_do: [],
    software: ['Analyst', 'SCIEX OS'],
    max_pressure_bar: null,
    detector_types: ['triple quadrupole / linear ion trap MS'],
    notes: ['Hybrid triple-quad / linear ion trap'],
  },
  // Agilent HPLC
  {
    technique: 'HPLC', vendor: 'Agilent', model: '1260 Infinity II',
    ms_type: null,
    mass_range: null,
    ionization_modes: [],
    capabilities: ['binary pump', 'quaternary pump', 'DAD', 'RID', 'FLD', 'ELSD', 'autosampler'],
    cannot_do: [],
    software: ['OpenLab CDS'],
    max_pressure_bar: 600,
    detector_types: ['DAD', 'VWD', 'RID', 'FLD', 'ELSD'],
    notes: ['Max 600 bar, standard analytical HPLC'],
  },
  {
    technique: 'UHPLC', vendor: 'Agilent', model: '1290 Infinity II',
    ms_type: null,
    mass_range: null,
    ionization_modes: [],
    capabilities: ['binary pump', 'multisampler', 'DAD', 'FLD', 'ELSD', 'sub-2 micron columns'],
    cannot_do: [],
    software: ['OpenLab CDS'],
    max_pressure_bar: 1300,
    detector_types: ['DAD', 'VWD', 'FLD', 'ELSD'],
    notes: ['Max 1300 bar UHPLC'],
  },
  // Waters HPLC/UHPLC
  {
    technique: 'UHPLC', vendor: 'Waters', model: 'ACQUITY UPLC H-Class',
    ms_type: null,
    mass_range: null,
    ionization_modes: [],
    capabilities: ['quaternary solvent manager', 'sample manager', 'PDA', 'column manager', 'sub-2 micron columns'],
    cannot_do: [],
    software: ['Empower', 'MassLynx'],
    max_pressure_bar: 1034,
    detector_types: ['PDA', 'TUV', 'FLR', 'ELSD', 'RI'],
    notes: ['Max 15000 psi (1034 bar)'],
  },
  // GC
  {
    technique: 'GC', vendor: 'Agilent', model: '8890',
    ms_type: null,
    mass_range: null,
    ionization_modes: [],
    capabilities: ['split/splitless inlet', 'PTV', 'on-column', 'FID', 'TCD', 'ECD', 'FPD', 'NPD', 'backflush'],
    cannot_do: [],
    software: ['OpenLab CDS'],
    max_pressure_bar: null,
    detector_types: ['FID', 'TCD', 'ECD', 'FPD', 'NPD'],
    notes: [],
  },
  // GCMS
  {
    technique: 'GCMS', vendor: 'Agilent', model: '5977B',
    ms_type: 'single-quad',
    mass_range: { min: 1, max: 1050 },
    ionization_modes: ['EI', 'CI'],
    capabilities: ['scan', 'SIM', 'SIM/scan', 'NIST library search', 'autotune', 'DFTPP tune'],
    cannot_do: ['MS/MS', 'MRM'],
    software: ['MassHunter'],
    max_pressure_bar: null,
    detector_types: ['single quadrupole MS'],
    notes: ['Inert Plus EI source'],
  },
  // TGA
  {
    technique: 'TGA', vendor: 'TA Instruments', model: 'Discovery TGA',
    ms_type: null, mass_range: null, ionization_modes: [],
    capabilities: ['TGA', 'Hi-Res TGA', 'modulated TGA', 'autosampler', 'evolved gas analysis coupling'],
    cannot_do: [],
    software: ['TRIOS'],
    max_pressure_bar: null,
    detector_types: ['microbalance'],
    notes: ['25-position autosampler, RT to 1200°C'],
  },
  // DSC
  {
    technique: 'DSC', vendor: 'TA Instruments', model: 'Discovery DSC',
    ms_type: null, mass_range: null, ionization_modes: [],
    capabilities: ['DSC', 'modulated DSC (MDSC)', 'autosampler', 'Tzero technology'],
    cannot_do: [],
    software: ['TRIOS'],
    max_pressure_bar: null,
    detector_types: ['heat flow'],
    notes: ['Tzero heat flow, -180°C to 725°C'],
  },
];

/**
 * Look up the capability profile for a specific instrument model.
 * Returns null if no profile exists.
 */
export function getCapability(
  vendor: string | null,
  model: string | null,
): InstrumentCapability | null {
  if (!vendor || !model) return null;

  const v = vendor.toLowerCase().replace(/\s+/g, '');
  const m = model.toLowerCase().replace(/\s+/g, '');

  return CAPABILITIES.find(c => {
    const cv = c.vendor.toLowerCase().replace(/\s+/g, '');
    const cm = c.model.toLowerCase().replace(/\s+/g, '');
    return cv === v && (cm === m || m.includes(cm) || cm.includes(m));
  }) ?? null;
}

/**
 * Validate whether a recommendation is compatible with the instrument's capabilities.
 * Returns { valid: true } if compatible, or { valid: false, reason } if not.
 */
export function validateRecommendation(
  recommendation: string,
  capability: InstrumentCapability,
): { valid: boolean; reason?: string } {
  const rec = recommendation.toLowerCase();

  for (const blocked of capability.cannot_do) {
    const blockedLower = blocked.toLowerCase();
    if (rec.includes(blockedLower)) {
      return {
        valid: false,
        reason: `"${blocked}" is not available on ${capability.vendor} ${capability.model} (${capability.ms_type ?? capability.technique})`,
      };
    }
  }

  // Check for recommending installation of already-installed features
  for (const existing of capability.capabilities) {
    const installPattern = new RegExp(`install\\s+${escapeRegex(existing)}`, 'i');
    if (installPattern.test(recommendation)) {
      return {
        valid: false,
        reason: `${existing} is already installed on ${capability.vendor} ${capability.model}`,
      };
    }
  }

  for (const existing of capability.ionization_modes) {
    const installPattern = new RegExp(`install\\s+${escapeRegex(existing)}`, 'i');
    if (installPattern.test(recommendation)) {
      return {
        valid: false,
        reason: `${existing} ionization is already available on ${capability.vendor} ${capability.model}`,
      };
    }
  }

  return { valid: true };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

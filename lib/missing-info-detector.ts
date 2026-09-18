import type { Technique, MissingInfoField, MissingInfoResult } from './types';
import type { RankingQueryV2 } from '@/agents/ranking/types';

// ─── Critical Fields by Technique ────────────────────────────────────

type FieldSet = MissingInfoField[];

const ALWAYS_CRITICAL: FieldSet = ['manufacturer', 'model'];

const CRITICAL_BY_TECHNIQUE: Partial<Record<Technique, FieldSet>> = {
  LCMS:  ['ionization_mode', 'mobile_phase', 'column'],
  HPLC:  ['column', 'mobile_phase', 'flow_rate'],
  UHPLC: ['column', 'mobile_phase', 'flow_rate'],
  GC:    ['column'],
  GCMS:  ['column', 'ionization_mode'],
  IC:    ['column', 'mobile_phase'],
  CE:    ['sample_matrix'],
  SFC:   ['column', 'mobile_phase'],
  TGA:   ['sample_matrix'],
  DSC:   ['sample_matrix'],
  FPLC:  ['column', 'sample_matrix'],
  SPPS:  ['sample_matrix'],
  KF:    ['sample_matrix'],
  KFO:   ['sample_matrix'],
  DLS:   ['sample_matrix'],
  XRD:   ['sample_matrix'],
  Titration: ['analyte', 'sample_matrix'],
  PrepLC: ['column', 'mobile_phase', 'flow_rate'],
};

const OPTIONAL_BY_TECHNIQUE: Partial<Record<Technique, FieldSet>> = {
  LCMS:   ['analyte', 'sample_matrix', 'flow_rate', 'injection_volume', 'gradient', 'retention_time', 'source_params', 'acquisition_mode', 'recent_maintenance', 'qc_results', 'expected_result', 'sst_data', 'sample_matrix_type'],
  HPLC:   ['analyte', 'sample_matrix', 'injection_volume', 'gradient', 'retention_time', 'recent_maintenance', 'qc_results', 'expected_result', 'sst_data', 'sample_matrix_type'],
  UHPLC:  ['analyte', 'sample_matrix', 'injection_volume', 'gradient', 'retention_time', 'recent_maintenance', 'qc_results', 'expected_result', 'sst_data', 'sample_matrix_type'],
  GC:     ['analyte', 'sample_matrix', 'flow_rate', 'injection_volume', 'retention_time', 'recent_maintenance'],
  GCMS:   ['analyte', 'sample_matrix', 'flow_rate', 'injection_volume', 'retention_time', 'recent_maintenance', 'acquisition_mode'],
  PrepLC: ['analyte', 'sample_matrix', 'injection_volume', 'gradient', 'retention_time', 'recent_maintenance', 'qc_results', 'expected_result', 'sst_data'],
};

// ─── Follow-Up Question Templates ───────────────────────────────────

const QUESTION_TEMPLATES: Record<MissingInfoField, string> = {
  manufacturer:          'What is the instrument manufacturer (e.g., Agilent, Waters, Shimadzu)?',
  model:                 'What is the specific instrument model (e.g., G6170A, 1290 Infinity II)?',
  hardware_config:       'What is the current hardware configuration (detectors, inlets, sources)?',
  analyte:               'What analyte(s) are you trying to measure?',
  sample_matrix:         'What is the sample matrix (e.g., plasma, soil extract, pure compound)?',
  column:                'What column are you using (type, dimensions, particle size)?',
  mobile_phase:          'What is your mobile phase composition?',
  flow_rate:             'What flow rate are you using?',
  injection_volume:      'What is the injection volume?',
  gradient:              'What gradient program are you running (or is it isocratic)?',
  retention_time:        'What is the expected vs. observed retention time?',
  ionization_mode:       'What ionization mode are you using (ESI+, ESI-, APCI, etc.)?',
  source_params:         'What are the key source parameters (capillary voltage, gas temp/flow, nebulizer)?',
  acquisition_mode:      'What acquisition mode (scan, SIM, MRM, etc.) and mass range?',
  recent_maintenance:    'What recent maintenance has been performed?',
  qc_results:            'What do recent QC/system suitability results show?',
  raw_data:              'Can you provide representative raw data or chromatograms?',
  chromatographic_method: 'What is the chromatographic method (reference or SOP number)?',
  expected_result:       'What result did you expect vs. what are you observing?',
  sst_data:              'What are your System Suitability Test results (plates, tailing factor, resolution, %RSD)?',
  sample_matrix_type:    'What type of sample matrix are you analyzing (e.g., plasma, soil, food, API)?',
  method_transfer_source: 'What instrument/site is the method being transferred from?',
};

// ─── Free-text recognition ──────────────────────────────────────────
// Users often type method details into the Method Summary box or the symptom
// description instead of the dedicated inputs. These patterns recognise the
// critical chromatographic fields there so the answer is not penalised for
// information the user actually supplied.

const TEXT_PATTERNS: Partial<Record<MissingInfoField, RegExp>> = {
  column: /\bcolumn\b|\bC(?:4|8|18)\b|phenyl|hilic|\bbeh\b|zorbax|acquity|kinetex|poroshell|xbridge|xselect|\bluna\b|hypersil|chromolith|cortecs|\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?\s*mm|\d(?:\.\d+)?\s*(?:µ|u)m\b/i,
  mobile_phase: /mobile phase|eluent|acetonitrile|\bacn\b|methanol|\bmeoh\b|formic acid|\btfa\b|trifluoroacetic|ammonium (?:formate|acetate|bicarbonate)|phosphate buffer|\d+\s*%\s*[ab]\b/i,
  flow_rate: /\d+(?:\.\d+)?\s*(?:ml|µl|ul)\s*\/\s*min|flow rate|\bflow\s*[:=]?\s*\d/i,
  ionization_mode: /\besi\b|\bapci\b|\bappi\b|positive (?:ion )?mode|negative (?:ion )?mode|esi\s*[+-]/i,
};

function freeText(query: RankingQueryV2): string {
  return [
    query.method_conditions ?? '',
    query.symptom_description ?? '',
    ...Object.values(query.extra_context ?? {}),
  ].join('\n');
}

/** Return a short excerpt around the first pattern match, for traceability. */
function inferFromText(text: string, field: MissingInfoField): string | null {
  const pattern = TEXT_PATTERNS[field];
  if (!pattern) return null;
  const m = pattern.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - 25);
  const end = Math.min(text.length, m.index + m[0].length + 35);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

/** Critical fields for a technique (excluding manufacturer/model), for form prioritisation. */
export function getCriticalFields(technique: Technique): MissingInfoField[] {
  return CRITICAL_BY_TECHNIQUE[technique] ?? [];
}

// ─── Main Detection Function ────────────────────────────────────────

/**
 * Detect which critical technical context fields are missing from a query.
 * Returns missing fields, the critical subset (triggers confidence cap), and follow-up questions.
 * Fields recognised in free text count as present and are reported in `inferred_from_text`.
 */
export function detectMissingInfo(
  query: RankingQueryV2,
  technique: Technique,
): MissingInfoResult {
  const all_missing: MissingInfoField[] = [];
  const critical_missing: MissingInfoField[] = [];
  const inferred_from_text: Partial<Record<MissingInfoField, string>> = {};
  const text = freeText(query);

  const isPresent = (field: MissingInfoField): boolean => {
    if (hasValue(query, field)) return true;
    const excerpt = inferFromText(text, field);
    if (excerpt) {
      inferred_from_text[field] = excerpt;
      return true;
    }
    return false;
  };

  // Check always-critical fields
  for (const field of ALWAYS_CRITICAL) {
    if (!isPresent(field)) {
      all_missing.push(field);
      critical_missing.push(field);
    }
  }

  // Check technique-specific critical fields
  const techCritical = CRITICAL_BY_TECHNIQUE[technique] ?? [];
  for (const field of techCritical) {
    if (!isPresent(field)) {
      all_missing.push(field);
      critical_missing.push(field);
    }
  }

  // Check technique-specific optional fields (informational, not critical)
  const techOptional = OPTIONAL_BY_TECHNIQUE[technique] ?? [];
  for (const field of techOptional) {
    if (!all_missing.includes(field) && !isPresent(field)) {
      all_missing.push(field);
    }
  }

  // Generate follow-up questions only for critical missing fields
  const follow_up_questions = critical_missing.map(f => QUESTION_TEMPLATES[f]);

  return { missing_fields: all_missing, critical_missing, follow_up_questions, inferred_from_text };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hasValue(query: RankingQueryV2, field: MissingInfoField): boolean {
  switch (field) {
    case 'manufacturer':        return !!query.vendor;
    case 'model':               return !!query.model;
    case 'hardware_config':     return false; // not yet in query
    case 'analyte':             return !!query.analyte;
    case 'sample_matrix':       return !!query.sample_matrix;
    case 'column':              return !!query.column;
    case 'mobile_phase':        return !!query.mobile_phase;
    case 'flow_rate':           return !!query.flow_rate;
    case 'injection_volume':    return !!query.injection_volume;
    case 'gradient':            return !!query.gradient;
    case 'retention_time':      return !!query.retention_time;
    case 'ionization_mode':     return !!query.ionization_mode;
    case 'source_params':       return !!query.source_params;
    case 'acquisition_mode':    return !!query.acquisition_mode;
    case 'recent_maintenance':  return !!query.recent_maintenance;
    case 'qc_results':          return !!query.qc_results;
    case 'raw_data':            return false; // not yet in query
    case 'chromatographic_method': return !!query.method_conditions;
    case 'expected_result':     return !!query.expected_result;
    case 'sst_data':            return !!(query.sst_plates || query.sst_tailing_factor || query.sst_resolution || query.sst_rsd_percent);
    case 'sample_matrix_type':  return !!query.sample_matrix_type;
    case 'method_transfer_source': return !!(query.is_method_transfer && query.source_instrument);
    default:                    return false;
  }
}

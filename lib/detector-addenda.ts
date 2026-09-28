// ── Detector-specific diagnostics ───────────────────────────────────────────
// The knowledge base and the generic procedures are organised by technique, so
// a hyphenated instrument loses half its diagnostic surface: a GC-MS user who
// selects "GC" gets inlet and column advice and nothing at all about the mass
// spectrum, even when the mass spectrum is what they described.
//
// This module infers which detectors are actually in play — from the technique,
// from the technique-specific detector fields, and from what the user wrote —
// and appends the checks that belong to those detectors. Content here is
// manufacturer-independent best practice (evidence tier 6) and never raises the
// confidence score.

import type { RankedAnswerV2, Hypothesis, EvidenceSummaryV2, DetectorCheckBlock, IonReference } from './types';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import { detectIssueCategory } from '@/agents/ranking/issue-detector';
import { normalizeIssue } from '@/agents/ranking/families';
import { H, type GenericHypothesis } from './generic-procedures/types';

export type DetectorKind = 'ms' | 'fid' | 'uv' | 'ecd' | 'tcd' | 'elsd' | 'fld' | 'conductivity';

/** Issue families the addenda are keyed on. */
export type AddendumIssue =
  | 'background_peaks'
  | 'signal_loss'
  | 'noise_drift'
  | 'mass_accuracy'
  | 'carryover'
  | 'retention_shift'
  | 'general';

export const DETECTOR_SOURCE_ID = 'labpulse-detector-checks';

export interface DetectorAddendum {
  title: string;
  hypotheses: GenericHypothesis[];
  checks: string[];
  next_questions: string[];
  ion_reference?: IonReference[];
}

export interface DetectorProfile {
  kind: DetectorKind;
  label: string;
  addenda: Partial<Record<AddendumIssue, DetectorAddendum>> & { general: DetectorAddendum };
}

// ─── Detector inference ──────────────────────────────────────────────

const DETECTOR_PATTERNS: Array<{ kind: DetectorKind; pattern: RegExp }> = [
  { kind: 'ms', pattern: /\bms\b|\bmsd\b|\bms\/ms\b|mass spec|mass-spec|mass spectrum|mass spectra|\bm\/z\b|\btic\b|\bxic\b|\beic\b|quadrupole|\bq-?tof\b|orbitrap|ion trap|\bsim\b|\bmrm\b|\bsrm\b|full scan|selected ion|\bei\b|\bci\b mode|\besi\b|\bapci\b|\bappi\b|single quad|triple quad|\bgc-?ms\b|\blc-?ms\b|ion source|transfer line/i },
  { kind: 'fid', pattern: /\bfid\b|flame ionis|flame ioniz/i },
  { kind: 'uv', pattern: /\buv\b|\buv-?vis\b|\bdad\b|\bpda\b|\bvwd\b|diode.?array|photodiode/i },
  { kind: 'ecd', pattern: /\becd\b|electron capture/i },
  { kind: 'tcd', pattern: /\btcd\b|thermal conductivity/i },
  { kind: 'fld', pattern: /\bfld\b|\bfd\b detector|fluorescence detect|fluorimetric/i },
  { kind: 'elsd', pattern: /\belsd\b|\bcad\b|\brid\b|charged aerosol|evaporative light|refractive index/i },
  { kind: 'conductivity', pattern: /conductivity detect|suppressed conductivity|\bsuppressor\b/i },
];

/** Techniques whose detector is an MS by definition. */
const MS_TECHNIQUES = new Set(['GCMS', 'LCMS']);

const DETECTOR_CONTEXT_KEYS = [
  'gcDetectorType', 'detectorType', 'detectionWavelength', 'gcDetectorTemp',
  'conductivityDetector', 'malsDetector', 'riDetector', 'semDetector',
];

function detectorSearchText(query: RankingQueryV2): string {
  const extra = query.extra_context ?? {};
  return [
    query.symptom_description,
    query.method_conditions,
    query.expected_result,
    query.acquisition_mode,
    query.ionization_mode,
    query.source_params,
    query.issue_category,
    ...DETECTOR_CONTEXT_KEYS.map(k => extra[k]),
  ].filter(Boolean).join('\n');
}

/**
 * Which detectors this query is about. An MS is inferred unconditionally for
 * the hyphenated techniques, and from the text for everything else — a GC user
 * who mentions the TIC or a mass spectrum is running a GC-MS whatever they
 * selected in the technique box.
 */
export function inferDetectors(query: RankingQueryV2): DetectorKind[] {
  const found = new Set<DetectorKind>();
  if (MS_TECHNIQUES.has(query.technique)) found.add('ms');

  const text = detectorSearchText(query);
  for (const { kind, pattern } of DETECTOR_PATTERNS) {
    if (pattern.test(text)) found.add(kind);
  }
  return [...found];
}

// ─── Issue family mapping ────────────────────────────────────────────

// Order matters: the more specific family must be tested first. "Carryover in
// the blank" is carryover, not a generic background peak.
const ISSUE_FAMILY_PATTERNS: Array<{ issue: AddendumIssue; pattern: RegExp }> = [
  { issue: 'carryover', pattern: /carry ?over|memory effect|residual/i },
  { issue: 'background_peaks', pattern: /ghost|phantom|background|extraneous|contamin|blank|unexpected peak|extra peak|unknown peak|bleed/i },
  { issue: 'mass_accuracy', pattern: /adduct|mass accuracy|wrong m\/z|mass calibration|mass axis|unexpected mass|isotope/i },
  { issue: 'signal_loss', pattern: /signal loss|low sensitivity|low signal|no signal|no peak|missing peak|weak signal|low response|sensitivity/i },
  { issue: 'noise_drift', pattern: /nois|baseline|drift|spike|wander|unstable/i },
  { issue: 'retention_shift', pattern: /retention|rt shift|rt drift|elution time/i },
];

/** Map an issue category and symptom text onto one of the addendum families. */
export function matchAddendumIssue(issueCategory: string | null, symptom: string): AddendumIssue {
  const issue = issueCategory?.trim() || detectIssueCategory(symptom) || '';
  const haystack = `${normalizeIssue(issue)} ${symptom}`;
  for (const { issue: family, pattern } of ISSUE_FAMILY_PATTERNS) {
    if (pattern.test(haystack)) return family;
  }
  return 'general';
}

// ─── Reference ion sets (GC-MS / LC-MS background) ───────────────────

const AIR_IONS: IonReference[] = [
  { ions: 'm/z 28 and 32 in roughly a 4:1 ratio, with 40 and 44', meaning: 'Atmospheric air (N₂, O₂, Ar, CO₂) — argon at m/z 40 has no other source in the gas stream, so it is the decisive marker for an air leak rather than outgassing' },
  { ions: 'm/z 18 (with 17)', meaning: 'Water — residual moisture, a wet system after venting, or an air leak drawing in humid air' },
  { ions: 'm/z 44 without 40', meaning: 'Carbon dioxide alone — carbonate in the sample, a CO₂ cylinder or dry ice nearby, or decomposition, rather than air ingress' },
  { ions: 'm/z 207, 281, 355 (and 73, 147)', meaning: 'Siloxane — column bleed; rises with oven temperature and grows as the column ages' },
  { ions: 'm/z 73, 147 dominant', meaning: 'Silicone from the septum, an O-ring or a ferrule, or a silylation reagent' },
  { ions: 'm/z 149 dominant, with 167 and 279', meaning: 'Phthalate plasticiser — vial caps, tubing, gloves, plastic pipette tips' },
  { ions: 'a 57 / 71 / 85 series spaced 14 Da apart', meaning: 'Saturated hydrocarbons — rough-pump oil backstreaming, grease or a hydrocarbon solvent' },
  { ions: 'm/z 91, 105, 106', meaning: 'Alkyl benzenes — toluene/xylene residues from solvent or the laboratory atmosphere' },
];

// ─── MS addenda ──────────────────────────────────────────────────────

const MS_BACKGROUND: DetectorAddendum = {
  title: 'Mass-spectral identification of an extraneous peak',
  hypotheses: [
    H(
      'Atmospheric air entering the system (inlet septum, syringe headspace, split/splitless vent, or a vacuum-side leak)',
      'high',
      'Background-subtract the spectrum at the apex of the unknown peak and read the ion set: m/z 28 and 32 near a 4:1 ratio together with m/z 40 (argon) and 44 (CO₂) is atmospheric air.',
      'Air ions dominate the spectrum. Argon is the decisive marker — it has no other source in the carrier gas or the sample.',
    ),
    H(
      'Siloxane column bleed',
      'medium',
      'Compare the abundance of m/z 207, 281 and 355 at the start and at the end of the oven ramp.',
      'Siloxane ions rise with oven temperature; a bleed profile tracks the ramp rather than appearing as a discrete early peak.',
    ),
    H(
      'Septum, ferrule or O-ring bleed (silicone)',
      'medium',
      'Replace the septum and any recently disturbed ferrule, then re-acquire a no-injection background.',
      'The m/z 73 / 147 silicone series falls or disappears.',
    ),
    H(
      'Phthalate or plasticiser contamination from vials, caps, tubing or gloves',
      'medium',
      'Re-prepare one sample in glass with foil-lined caps and no plastic contact, and compare.',
      'The m/z 149 / 167 / 279 series disappears in the re-prepared sample.',
    ),
    H(
      'Ion source, transfer line or vacuum-side contamination',
      'medium',
      'Acquire a background scan with no injection at the same source and oven temperatures.',
      'The same ions are present without any injection, which places the source on the vacuum side rather than in the sample path.',
    ),
    H(
      'Rough-pump oil backstreaming or hydrocarbon contamination',
      'low',
      'Look for a homologous ion series at m/z 57, 71, 85 spaced 14 Da apart in the background scan.',
      'A regular hydrocarbon series indicates pump oil or grease rather than a sample-borne contaminant.',
    ),
  ],
  checks: [
    'Background-subtract the spectrum at the apex of the unknown peak and list its five most abundant ions before assigning any cause — the ion set identifies the contamination class directly.',
    'Compare the peak in the FID (or UV) trace with the TIC: a peak present in BOTH traces entered the flow path before the column outlet (syringe, inlet, septum, carrier gas or column); a peak present in the TIC ONLY originates in the transfer line, the ion source or the vacuum system.',
    'Acquire a no-injection background scan at the same source and oven temperatures: ions present without an injection come from the vacuum side, ions that appear only with an injection come from the syringe, inlet, solvent or sample.',
    'Run the autotune / air-and-water check and read m/z 18, 28, 32 and 44 against the instrument specification — an N₂:O₂ ratio near 4:1 with m/z 40 present confirms an air leak rather than outgassing after a vent.',
    'Check the retention of the unknown against the unretained (hold-up) time: a peak at or before t_M is not retained by the column and must have entered as a gas — syringe headspace, a leaking septum, a vent fault or the carrier gas itself.',
    'Leak check the septum nut, inlet base, column ferrules and the transfer line fitting with an electronic leak detector (never a flame while hydrogen is flowing), then re-acquire the background.',
    'Check the carrier gas supply: trap indicator colour, cylinder pressure above the reserve level, and whether the extraneous ions appeared after a cylinder or trap change.',
    'Extract the ion chromatogram (XIC/EIC) for each of the major background ions across the whole run: a flat elevated trace is continuous background, a discrete peak is something that eluted.',
  ],
  next_questions: [
    'Does the peak appear in the TIC only, or in both the TIC and the FID/UV trace?',
    'What are the five most abundant ions in the background-subtracted spectrum at the peak apex?',
    'What does the most recent tune report show for m/z 18, 28, 32 and 44, and when was it run?',
  ],
  ion_reference: AIR_IONS,
};

const MS_SIGNAL_LOSS: DetectorAddendum = {
  title: 'Mass-spectrometer side of a response loss',
  hypotheses: [
    H('Ion source contamination', 'high', 'Compare the current tune report with the last passing one, in particular the electron-multiplier voltage.', 'EM voltage has risen sharply to hold the same gain, or the tune fails on abundance.'),
    H('Air or water leak degrading ionisation and the vacuum', 'high', 'Read m/z 18, 28, 32 and 40 in the tune or background scan.', 'Elevated air and water ions alongside a degraded vacuum reading.'),
    H('Analyte never reached the source (column not seated at the transfer line, or an inlet fault)', 'medium', 'Inject a reference standard and check whether the solvent peak itself is present and of normal size.', 'A missing or small solvent peak points upstream of the source.'),
    H('Acquisition set to the wrong ions or mass range', 'low', 'Re-acquire in full scan and compare with the SIM/MRM ion list in the method.', 'The analyte is present in full scan but the monitored ions are wrong.'),
    H('Electron multiplier at end of life', 'low', 'Review the EM voltage trend over the last several tunes.', 'EM voltage close to the instrument maximum.'),
  ],
  checks: [
    'Run the tune and compare abundance, mass assignment, peak width and electron-multiplier voltage against the last passing report.',
    'Read the air/water ratio in the tune report before anything else — a leak explains signal loss, tailing and noise simultaneously.',
    'Check the vacuum reading against the normal value for this instrument and this carrier flow.',
    'Re-acquire one injection in full scan even for a SIM or MRM method, to separate "no analyte" from "wrong ions monitored".',
    'Verify the source and quadrupole temperatures against the method; a cold source gives progressive response loss for high-boiling analytes.',
    'Check that the column is seated at the correct depth in the transfer line and that the ferrule is tight.',
  ],
  next_questions: [
    'What does the latest tune report show for air, water and EM voltage, and how does it compare with the last passing tune?',
    'Is the solvent peak still normal in size, or has it dropped too?',
  ],
};

const MS_NOISE: DetectorAddendum = {
  title: 'Mass-spectral contribution to noise and baseline drift',
  hypotheses: [
    H('Column bleed rising through the oven ramp', 'high', 'Extract m/z 207 and 281 across the run and compare the profile with the oven program.', 'The bleed profile follows the temperature ramp.'),
    H('Air or water leak', 'high', 'Read m/z 18, 28, 32 and 40 in a background scan.', 'Air and water ions elevated relative to the tune specification.'),
    H('Ion source contamination', 'medium', 'Acquire a background scan and compare with the profile recorded after the last source clean.', 'Background elevated across a broad mass range.'),
    H('Carrier gas or trap contamination', 'medium', 'Check trap indicator and cylinder purity, and compare with a background acquired on a fresh trap.', 'Background falls after the trap or cylinder is changed.'),
  ],
  checks: [
    'Acquire a background scan with no injection and record the five most abundant ions and their absolute abundance, so future comparisons have a baseline.',
    'Extract the ion chromatograms of the main background ions to separate continuous chemical noise from discrete eluting peaks.',
    'Read the air/water check in the tune report; an air leak raises baseline noise and is the cheapest thing to exclude first.',
    'Compare the noise with the detector electronics only: with the filament off, the remaining noise is electronic rather than chemical.',
  ],
  next_questions: ['Does the noise scale with oven temperature, or is it flat across the run?'],
};

const MS_MASS_ACCURACY: DetectorAddendum = {
  title: 'Mass assignment and adduct checks',
  hypotheses: [
    H('The observed ion is an adduct rather than the protonated molecule', 'high', 'Test the mass differences from [M+H]⁺: +21.982 is Na, +37.956 is K, +17.027 is NH₄, +46.005 is a formate adduct, and a difference of 18.011 is a water loss.', 'The difference matches a known adduct, identifying the species without any instrument fault.'),
    H('Mass axis calibration has drifted', 'medium', 'Run the calibrant and check mass assignment across the range used.', 'Assigned masses deviate beyond specification, increasing with m/z.'),
    H('Resolution or peak-width setting inappropriate for the mass range', 'medium', 'Check the tune peak widths at the low, middle and high calibrant masses.', 'Peak width outside specification at one end of the range.'),
    H('Space-charge or saturation shifting the apparent mass', 'low', 'Dilute the sample and re-acquire.', 'The mass assignment corrects at lower concentration.'),
  ],
  checks: [
    'Compute the mass differences between the unexpected ion and the expected [M+H]⁺ or [M]⁺˙ before assuming an instrument fault — most "wrong masses" are adducts, in-source fragments or a water loss.',
    'Check the mobile phase, glassware and solvent for sodium and potassium if alkali adducts dominate; they usually come from the sample path, not the source.',
    'Run the mass calibration and confirm assignment at the low, middle and high ends of the acquired range.',
    'Compare the isotope pattern with the expected one — halogens, sulfur and silicon are recognisable from the M+2 abundance alone.',
  ],
  next_questions: ['What is the exact m/z observed, and what m/z did you expect?'],
};

const MS_CARRYOVER: DetectorAddendum = {
  title: 'Mass-spectral confirmation of carryover',
  hypotheses: [
    H('Carryover from the preceding high-concentration injection', 'high', 'Inject blank, blank, high standard, blank, blank and plot the analyte response in each.', 'Response in the first blank after the standard, decaying in the second — the signature of carryover rather than contamination.'),
    H('Contamination that is independent of the sequence', 'medium', 'Compare a blank run at the start of the sequence with one run after the standard.', 'Equal response in both blanks points to contamination, not carryover.'),
  ],
  checks: [
    'Confirm the blank peak is the analyte by matching the full spectrum or the qualifier/quantifier ion ratio against the standard — a coincident retention time alone is not identification.',
    'Quantify the carryover as a percentage of the preceding standard so it can be compared against the method limit.',
    'Check the qualifier-to-quantifier ion ratio in the blank: a ratio outside tolerance means the blank peak is an interference, not the analyte.',
  ],
  next_questions: ['What percentage of the preceding standard does the blank peak represent?'],
};

const MS_RETENTION: DetectorAddendum = {
  title: 'Vacuum-side causes of retention shift',
  hypotheses: [
    H('Column outlet pressure changed (vacuum degraded, or the method was set up for a different outlet condition)', 'high', 'Compare the current vacuum reading with the normal value and confirm the method uses vacuum-compensated flow.', 'Vacuum differs from normal, or the flow calculation is not set for MS outlet.'),
    H('Carrier flow control mode or a leak changed the linear velocity', 'high', 'Run a hold-up time measurement (unretained marker or methane) and compare with the reference chromatogram.', 'Hold-up time has moved, which shifts every peak.'),
  ],
  checks: [
    'Measure the hold-up time and compare it with the reference chromatogram before adjusting anything — if t_M moved, the cause is flow or pressure, not the column chemistry.',
    'Confirm the flow calculation is set for a vacuum outlet rather than atmospheric, which otherwise biases every calculated velocity.',
    'Check the vacuum reading and the tune air/water values: a leak changes both retention and response.',
  ],
  next_questions: ['Did the hold-up time (or the solvent peak) move along with the analyte peaks?'],
};

const MS_GENERAL: DetectorAddendum = {
  title: 'Mass-spectrometer status checks',
  hypotheses: [
    H('Tune or calibration out of specification', 'medium', 'Run the autotune and compare with the last passing report.', 'One or more tune parameters outside specification.'),
    H('Air or water leak', 'medium', 'Read m/z 18, 28, 32 and 40 in the tune report.', 'Air or water above specification.'),
    H('Ion source contamination', 'medium', 'Compare EM voltage and background abundance with the values recorded after the last source clean.', 'Both raised relative to the clean-source baseline.'),
  ],
  checks: [
    'Run the tune and record abundance, mass assignment, peak widths, air/water ratio and EM voltage.',
    'Acquire a no-injection background scan and note the five most abundant ions.',
    'Check the vacuum reading, and the source and transfer line temperatures against the method.',
  ],
  next_questions: ['When was the MS last tuned, and did it pass?'],
};

// ─── FID ─────────────────────────────────────────────────────────────

const FID_BACKGROUND: DetectorAddendum = {
  title: 'FID checks for extraneous peaks',
  hypotheses: [
    H('Contaminated detector jet or collector', 'medium', 'Compare the blank with the flame lit and, where the instrument allows, with a fresh jet installed.', 'Extraneous response falls after the jet is cleaned or replaced.'),
    H('Impurity in the hydrogen, air or make-up gas supply', 'medium', 'Run a blank with no injection and observe whether the response persists.', 'Response present with no injection points to the gas supply or the detector.'),
  ],
  checks: [
    'Run a no-injection blank with the flame lit: any peak that appears without an injection comes from the carrier, the fuel gases or the detector itself.',
    'Check the hydrogen, air and make-up gas traps and their indicator state — hydrocarbon impurity in the fuel gases raises the baseline and can produce broad humps.',
    'Inspect the jet for deposits and clean the orifice with the manufacturer-supplied wire; deposits produce both extraneous response and an unstable baseline.',
  ],
  next_questions: ['Does the extra response persist when the flame is lit but nothing is injected?'],
};

const FID_SIGNAL_LOSS: DetectorAddendum = {
  title: 'FID response loss',
  hypotheses: [
    H('Flame not lit, or extinguished during the run', 'high', 'Check the flame-on status and the ignition record for the run.', 'Flame out, or the ignition retry counter has incremented.'),
    H('Hydrogen-to-air ratio outside the working range', 'high', 'Compare the gas flows against the manufacturer specification (typically about 1:10 hydrogen to air).', 'Flows outside the specified window.'),
    H('Partially blocked jet', 'medium', 'Inspect and clean the jet, then re-inject a standard.', 'Response recovers.'),
  ],
  checks: [
    'Confirm the flame is lit — the simplest check is condensation on a cold surface held above the vent.',
    'Verify hydrogen, air and make-up flows against the method and the manufacturer specification.',
    'Check the detector temperature is above the condensation point for water produced by the flame (typically ≥ 150 °C) — a cold FID corrodes and loses response.',
  ],
  next_questions: ['Are the hydrogen, air and make-up flows still at the method values?'],
};

const FID_GENERAL: DetectorAddendum = {
  title: 'FID status checks',
  hypotheses: [
    H('Jet contamination or gas flow drift', 'medium', 'Inspect the jet and verify the gas flows.', 'Deposits found or flows off specification.'),
  ],
  checks: [
    'Verify hydrogen, air and make-up gas flows against the method.',
    'Confirm the detector temperature is at or above the method value and well above 150 °C.',
    'Inspect the jet for deposits, especially after silylated or high-matrix samples.',
  ],
  next_questions: ['When was the FID jet last cleaned or replaced?'],
};

// ─── UV / DAD ────────────────────────────────────────────────────────

const UV_BACKGROUND: DetectorAddendum = {
  title: 'UV/DAD checks for extraneous peaks',
  hypotheses: [
    H('Absorbing impurity in the mobile phase concentrating on the column during equilibration', 'high', 'Run a blank gradient with no injection.', 'Peaks appear in the gradient blank, which places the impurity in the mobile phase, not the sample.'),
    H('Injection solvent stronger than the initial mobile phase, or an absorbing additive', 'medium', 'Inject the diluent alone and compare.', 'The same peaks appear from the diluent.'),
  ],
  checks: [
    'Run a no-injection gradient blank: peaks that appear without an injection come from the mobile phase, the additive or the column, not the sample.',
    'Compare the UV spectrum at the peak apex with the analyte spectrum and with known impurity spectra — the spectrum identifies the class far faster than retention time alone.',
    'Check peak purity against the upslope and downslope spectra where the DAD supports it, to rule out co-elution.',
    'Prepare fresh mobile phase from a new solvent lot; buffer and water impurities are the usual source of gradient ghost peaks.',
  ],
  next_questions: ['Do the peaks appear in a gradient blank with no injection?'],
};

const UV_SIGNAL_LOSS: DetectorAddendum = {
  title: 'UV/DAD response loss',
  hypotheses: [
    H('Lamp at end of life or low energy', 'high', 'Read the lamp energy and burn hours from the diagnostics.', 'Energy below specification or hours beyond the recommended life.'),
    H('Detection wavelength wrong for the analyte', 'medium', 'Compare the method wavelength with the analyte absorbance maximum from the DAD spectrum.', 'Wavelength off the maximum.'),
    H('Flow cell dirty or air-locked', 'medium', 'Flush the cell and check the baseline absorbance and noise.', 'Baseline and noise recover after flushing.'),
  ],
  checks: [
    'Read lamp energy, lamp hours and the intensity test result from the detector diagnostics.',
    'Confirm the detection wavelength, bandwidth and reference wavelength against the method.',
    'Check for bubbles in the flow cell and confirm the backpressure regulator is fitted where the method requires one.',
  ],
  next_questions: ['What is the current lamp energy and how many hours are on the lamp?'],
};

const UV_GENERAL: DetectorAddendum = {
  title: 'UV/DAD status checks',
  hypotheses: [
    H('Lamp, flow cell or wavelength setting drift', 'medium', 'Run the detector self-test and compare with the last passing result.', 'One or more parameters outside specification.'),
  ],
  checks: [
    'Run the detector self-test (intensity, wavelength accuracy, noise and drift) and compare with the last passing result.',
    'Confirm the wavelength, bandwidth, reference wavelength and data rate against the method.',
  ],
  next_questions: ['When was the detector self-test last run?'],
};

// ─── Other detectors ─────────────────────────────────────────────────

const ECD_GENERAL: DetectorAddendum = {
  title: 'ECD status checks',
  hypotheses: [
    H('Contaminated cell or degraded make-up gas purity', 'medium', 'Compare the standing (baseline) current with the reference value and bake the cell per the manufacturer procedure.', 'Standing current outside the normal range, recovering after bake-out.'),
    H('Oxygen or moisture in the carrier or make-up gas', 'medium', 'Check trap status and replace the oxygen trap.', 'Response and baseline recover after the trap is replaced.'),
  ],
  checks: [
    'Record the standing current and compare it with the value from the last passing check — it is the single most diagnostic ECD number.',
    'Check the oxygen and moisture traps on both carrier and make-up gas; the ECD is far more sensitive to oxygen than an FID.',
    'Confirm the detector temperature is high enough to keep the cell clean for the analytes in the method.',
  ],
  next_questions: ['What is the ECD standing current now compared with when the method last passed?'],
};

const TCD_GENERAL: DetectorAddendum = {
  title: 'TCD status checks',
  hypotheses: [
    H('Filament contamination or damage', 'medium', 'Compare the baseline offset and noise with the reference values.', 'Baseline offset drifted or noise raised.'),
    H('Reference and column flow mismatch', 'medium', 'Verify reference flow against the column flow per the method.', 'Flows mismatched, producing baseline drift with the oven ramp.'),
  ],
  checks: [
    'Verify the reference gas flow matches the method; a mismatch produces drift that tracks the oven ramp.',
    'Check that the carrier gas has a thermal conductivity far from the analytes — helium or hydrogen for most work.',
    'Confirm the filament has never been run without carrier flow, which destroys it.',
  ],
  next_questions: ['What is the reference flow, and does the drift follow the oven ramp?'],
};

const ELSD_GENERAL: DetectorAddendum = {
  title: 'ELSD / CAD / RID status checks',
  hypotheses: [
    H('Nebuliser or evaporator temperature inappropriate for the mobile phase', 'medium', 'Compare the drift tube and nebuliser temperatures with the mobile phase composition.', 'Settings inappropriate for the solvent, producing noise or response loss.'),
    H('Non-volatile buffer in the mobile phase', 'high', 'Check the mobile phase for phosphate or other non-volatile additives.', 'A non-volatile buffer produces a permanently elevated, noisy baseline.'),
  ],
  checks: [
    'Confirm the mobile phase contains only volatile additives — a non-volatile buffer makes these detectors unusable.',
    'Check the nebuliser gas pressure and the drift-tube (evaporator) temperature against the method.',
    'For RID, confirm the reference cell has been purged and the column and detector are at thermal equilibrium; RID baselines take far longer to settle than UV.',
  ],
  next_questions: ['Does the mobile phase contain any non-volatile buffer?'],
};

const FLD_GENERAL: DetectorAddendum = {
  title: 'Fluorescence detector status checks',
  hypotheses: [
    H('Excitation or emission wavelength set away from the optimum', 'medium', 'Run an excitation/emission scan on a standard and compare with the method.', 'Optimum differs from the method setting.'),
    H('Lamp ageing or a dirty flow cell', 'medium', 'Check lamp energy and Raman signal-to-noise of water.', 'Below the specification for the detector.'),
    H('Quenching by dissolved oxygen or mobile phase composition', 'low', 'Degas the mobile phase and re-inject.', 'Response recovers after degassing.'),
  ],
  checks: [
    'Check the water Raman signal-to-noise test — it is the standard health check for a fluorescence detector.',
    'Confirm excitation and emission wavelengths and the PMT gain against the method.',
    'Confirm the mobile phase is degassed; dissolved oxygen quenches fluorescence and mimics a detector fault.',
  ],
  next_questions: ['What does the water Raman S/N test give compared with specification?'],
};

const CONDUCTIVITY_GENERAL: DetectorAddendum = {
  title: 'Suppressed conductivity detector status checks',
  hypotheses: [
    H('Suppressor exhausted or not regenerating', 'high', 'Compare the suppressed background conductivity with the expected value for the eluent.', 'Background raised well above the expected suppressed value.'),
    H('Eluent contamination or carbonate ingress', 'medium', 'Prepare fresh eluent with degassed water and compare the background.', 'Background falls with fresh eluent.'),
  ],
  checks: [
    'Record the suppressed background conductivity and compare it against the expected value for this eluent and suppressor current.',
    'Check the suppressor current setting against the eluent concentration and flow — an under-set current leaves a high background.',
    'Confirm the eluent is protected from atmospheric CO₂; carbonate ingress raises the background and shifts retention.',
  ],
  next_questions: ['What is the suppressed background conductivity, and what does the method expect?'],
};

// ─── Profile registry ────────────────────────────────────────────────

export const DETECTOR_PROFILES: Record<DetectorKind, DetectorProfile> = {
  ms: {
    kind: 'ms', label: 'Mass spectrometer (MS / TIC)',
    addenda: {
      background_peaks: MS_BACKGROUND,
      signal_loss: MS_SIGNAL_LOSS,
      noise_drift: MS_NOISE,
      mass_accuracy: MS_MASS_ACCURACY,
      carryover: MS_CARRYOVER,
      retention_shift: MS_RETENTION,
      general: MS_GENERAL,
    },
  },
  fid: {
    kind: 'fid', label: 'Flame ionisation detector (FID)',
    addenda: { background_peaks: FID_BACKGROUND, signal_loss: FID_SIGNAL_LOSS, general: FID_GENERAL },
  },
  uv: {
    kind: 'uv', label: 'UV / DAD detector',
    addenda: { background_peaks: UV_BACKGROUND, carryover: UV_BACKGROUND, signal_loss: UV_SIGNAL_LOSS, general: UV_GENERAL },
  },
  ecd: { kind: 'ecd', label: 'Electron capture detector (ECD)', addenda: { general: ECD_GENERAL } },
  tcd: { kind: 'tcd', label: 'Thermal conductivity detector (TCD)', addenda: { general: TCD_GENERAL } },
  elsd: { kind: 'elsd', label: 'ELSD / CAD / RID', addenda: { general: ELSD_GENERAL } },
  fld: { kind: 'fld', label: 'Fluorescence detector (FLD)', addenda: { general: FLD_GENERAL } },
  conductivity: { kind: 'conductivity', label: 'Suppressed conductivity detector', addenda: { general: CONDUCTIVITY_GENERAL } },
};

/** The addendum for a detector and issue family, falling back to its general set. */
export function getDetectorAddendum(kind: DetectorKind, issue: AddendumIssue): DetectorAddendum {
  const profile = DETECTOR_PROFILES[kind];
  return profile.addenda[issue] ?? profile.addenda.general;
}

// ─── Merge into an answer ────────────────────────────────────────────

function detectorSource(): EvidenceSummaryV2 {
  return {
    source_id: DETECTOR_SOURCE_ID,
    excerpt: 'Detector-specific diagnostic checks',
    evidence_strength: 'moderate',
    classification: 'general-manufacturer-independent',
    source_metadata: {
      title: 'Detector-specific diagnostic checks — general best-practice procedure',
      manufacturer_or_org: 'LabPulse (manufacturer-independent)',
      doc_number: null,
      pub_date: null,
      url: null,
      page_or_section: null,
      classification: 'general-manufacturer-independent',
      tier: 6,
    },
  };
}

/** Case- and whitespace-insensitive membership test, so we never repeat a check. */
function alreadyPresent(haystack: string[], needle: string): boolean {
  const key = needle.toLowerCase().replace(/\s+/g, ' ').trim();
  return haystack.some(h => h.toLowerCase().replace(/\s+/g, ' ').trim() === key);
}

export interface DetectorMergeResult {
  answer: RankedAnswerV2;
  detectors: DetectorKind[];
}

/**
 * Append the checks, hypotheses and follow-up questions that belong to the
 * detectors in play. Existing content is never replaced and confidence is never
 * raised: this only fills the gap left by technique-keyed knowledge.
 */
export function appendDetectorAddenda(
  answer: RankedAnswerV2,
  query: RankingQueryV2,
): DetectorMergeResult {
  const detectors = inferDetectors(query);
  if (detectors.length === 0) return { answer, detectors: [] };

  const issue = matchAddendumIssue(query.issue_category, query.symptom_description);
  const blocks: DetectorCheckBlock[] = [];
  const merged: RankedAnswerV2 = { ...answer };

  const checks = [...merged.checks];
  const immediateChecks = [...merged.immediate_checks];
  const nextQuestions = [...merged.next_questions];
  const hypotheses = [...merged.hypotheses];
  const likelyCauses = [...merged.likely_causes];

  for (const kind of detectors) {
    const profile = DETECTOR_PROFILES[kind];
    const addendum = getDetectorAddendum(kind, issue);

    const newChecks = addendum.checks.filter(c => !alreadyPresent(checks, c));
    const newQuestions = addendum.next_questions.filter(q => !alreadyPresent(nextQuestions, q));
    const newHypotheses = addendum.hypotheses.filter(h => !alreadyPresent(likelyCauses, h.cause));

    if (newChecks.length === 0 && newHypotheses.length === 0 && newQuestions.length === 0) continue;

    blocks.push({
      detector: kind,
      label: profile.label,
      title: addendum.title,
      checks: newChecks.length > 0 ? newChecks : addendum.checks,
      ion_reference: addendum.ion_reference,
    });

    checks.push(...newChecks);
    immediateChecks.push(...newChecks.filter(c => !alreadyPresent(immediateChecks, c)));
    nextQuestions.push(...newQuestions);
    likelyCauses.push(...newHypotheses.map(h => h.cause));

    for (const h of newHypotheses) {
      hypotheses.push({
        rank: hypotheses.length + 1,
        cause: h.cause,
        probability: h.probability,
        supporting_evidence: [`${profile.label} — ${addendum.title} (general best practice, manufacturer-independent)`],
        contradicting_evidence: [],
        diagnostic_test: h.diagnostic_test,
        expected_result: h.expected_result,
        status: 'suspected',
      });
    }
  }

  if (blocks.length === 0) return { answer, detectors };

  merged.checks = checks;
  merged.immediate_checks = immediateChecks;
  merged.next_questions = nextQuestions;
  merged.hypotheses = hypotheses;
  merged.likely_causes = likelyCauses;
  merged.detector_checks = [...(merged.detector_checks ?? []), ...blocks];
  merged.printable_checklist = [
    ...merged.checks.map((c, i) => `☐ Check ${i + 1}: ${c}`),
    ...merged.corrective_actions.map((a, i) => `☐ Action ${i + 1}: ${a}`),
  ];

  if (!merged.sources_with_metadata.some(s => s.source_id === DETECTOR_SOURCE_ID)) {
    merged.sources_with_metadata = [...merged.sources_with_metadata, detectorSource()];
    merged.evidence_summary = [
      ...merged.evidence_summary,
      { source_id: DETECTOR_SOURCE_ID, excerpt: 'Detector-specific diagnostic checks', evidence_strength: 'moderate' },
    ];
  }

  return { answer: merged, detectors };
}

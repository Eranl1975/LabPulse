import type { Technique } from '@/lib/types';
import { H, VC, type GenericProcedure } from './types';
import { LC_DEFAULT } from './lc';
import { GC_DEFAULT } from './gc';

// Technique-level fallback procedures for every supported technique.
// Used when no issue-specific procedure matches.

const gen = (
  key: string, title: string, hyp: GenericProcedure['hypotheses'], checks: string[], actions: string[],
  vc: GenericProcedure['verification_criteria'], escalation: string[], safety: string[], questions: string[],
): GenericProcedure => ({ key, title, hypotheses: hyp, checks, corrective_actions: actions, verification_criteria: vc, escalation, safety, next_questions: questions });

const COMMON_ESCALATION = ['Fault persists after the operator-level checks below.', 'Error codes, alarms or safety interlocks are active.', 'Any action requires opening sealed, heated, high-voltage or vacuum modules.'];

const THERMAL = gen('thermal-default', 'General thermal analysis troubleshooting (TGA/DSC)',
  [
    H('Sample preparation or pan issue (mass, contact, pan type, lid)', 'high', 'Rerun a certified reference (indium for DSC, calcium oxalate for TGA) with a fresh pan.', 'Reference meets specification.'),
    H('Purge gas flow or atmosphere incorrect', 'medium', 'Verify purge gas type and flow rate with a flow meter.', 'Flow outside setpoint or wrong gas.'),
    H('Temperature or mass calibration drift', 'medium', 'Run the calibration check against certified standards.', 'Deviation beyond tolerance.'),
    H('Baseline instability from contamination or thermal history', 'low', 'Run an empty-pan baseline and compare with the stored baseline.', 'Baseline curvature or offset.'),
  ],
  ['Run a certified reference material.', 'Verify purge gas and flow.', 'Run an empty-pan baseline.', 'Check sample mass, pan and lid selection against the method.', 'Review the last calibration date.'],
  ['Re-prepare the sample with the correct pan and mass.', 'Correct purge gas settings.', 'Recalibrate temperature and mass or heat flow.', 'Clean the furnace or sensor per manufacturer procedure.'],
  [VC('Reference transition', 'Within ± 0.5 °C of certified value', '±0.5 °C', 'Indium or reference run'), VC('Baseline', 'Within manufacturer specification', 'Per spec', 'Empty pan run')],
  COMMON_ESCALATION,
  ['Furnace is hot; allow cooling before opening.', 'Handle reactive samples under the correct atmosphere.'],
  ['What does a certified reference run show?', 'What is the sample mass and pan type?']);

const XRD = gen('xrd-default', 'General X-ray diffraction troubleshooting',
  [
    H('Sample displacement or surface height error', 'high', 'Run the alignment standard (e.g. corundum or silicon) and compare peak positions.', 'Standard peaks shifted consistently.'),
    H('Preferred orientation or poor sample preparation', 'medium', 'Re-prepare with back-loading or spinning and compare intensities.', 'Relative intensities change.'),
    H('X-ray tube ageing or generator instability', 'medium', 'Check tube hours and intensity of the standard.', 'Intensity below baseline.'),
    H('Optics or detector misalignment', 'low', 'Run the manufacturer alignment check.', 'Alignment out of specification.'),
  ],
  ['Run the alignment standard.', 'Check sample height and mounting.', 'Compare standard intensity with historical values.', 'Review tube hours and generator settings.'],
  ['Correct sample height; re-prepare sample.', 'Realign per manufacturer procedure (trained personnel).', 'Replace the tube at end of life (service).'],
  [VC('Standard peak position', 'Within ± 0.02° 2θ', '±0.02°', 'Alignment standard scan')],
  COMMON_ESCALATION,
  ['Never defeat X-ray interlocks; shutters must be closed before opening the enclosure.'],
  ['Does the alignment standard scan meet specification?']);

const DLS = gen('dls-default', 'General dynamic light scattering troubleshooting',
  [
    H('Sample contains dust, aggregates or bubbles', 'high', 'Filter the sample (0.2 µm) and re-measure; inspect the correlogram.', 'Correlogram clean and PDI drops.'),
    H('Concentration too high or too low', 'medium', 'Measure a dilution series.', 'Size stable across dilutions in the valid range.'),
    H('Wrong dispersant parameters (viscosity, refractive index) or temperature not equilibrated', 'medium', 'Verify SOP parameters and allow 2–5 minutes equilibration.', 'Values change to expected.'),
    H('Cuvette dirty or scratched', 'low', 'Use a new cuvette with a size standard.', 'Standard within specification.'),
  ],
  ['Measure a size standard (e.g. 60 nm latex).', 'Inspect the correlogram and count rate.', 'Check dispersant settings and temperature.', 'Filter the sample and re-measure.'],
  ['Filter samples; use clean cuvettes.', 'Adjust concentration.', 'Correct dispersant parameters.'],
  [VC('Size standard', 'Within ± 2% of certified value', '±2%', 'Standard measurement'), VC('PDI of standard', '< 0.1', 'Per standard', 'Standard measurement')],
  COMMON_ESCALATION,
  ['Laser safety: do not open the optical compartment.'],
  ['What does the correlogram look like and what is the count rate?']);

const TITRATION = gen('titration-default', 'General titration troubleshooting',
  [
    H('Electrode conditioning or ageing', 'high', 'Calibrate the electrode and check slope and response time.', 'Slope outside 95–102% or slow response.'),
    H('Titrant concentration drift', 'high', 'Standardise the titrant against a certified primary standard.', 'Titre differs from the stored value.'),
    H('Burette dosing error or air bubbles', 'medium', 'Perform a gravimetric burette check; purge lines.', 'Dosing error beyond tolerance.'),
    H('Sample handling (CO2 uptake, evaporation, incomplete dissolution)', 'medium', 'Repeat with fresh sample under controlled conditions.', 'Result consistent.'),
  ],
  ['Calibrate the electrode.', 'Standardise the titrant.', 'Check the burette gravimetrically.', 'Run a certified control sample.'],
  ['Condition or replace the electrode.', 'Prepare fresh titrant and restandardise.', 'Purge or service the burette.'],
  [VC('Control sample', 'Within ± 1% of certified value', '±1%', 'Triplicate titration'), VC('Electrode slope', '95–102%', 'Per SOP', 'Two-point calibration')],
  COMMON_ESCALATION,
  ['Handle titrants and non-aqueous solvents with appropriate PPE.'],
  ['What is the electrode slope and the titrant standardisation result?']);

const KF = gen('kf-default', 'General Karl Fischer troubleshooting',
  [
    H('Cell drift from moisture ingress (worn septum, desiccant exhausted)', 'high', 'Record drift before titration; replace septum and desiccant.', 'Drift falls below the SOP limit.'),
    H('Reagent exhausted or contaminated', 'high', 'Replace reagent and re-check drift and standard recovery.', 'Recovery within specification.'),
    H('Sample side reaction (aldehydes, ketones) or incomplete extraction', 'medium', 'Use the appropriate reagent or oven method and compare.', 'Recovery consistent.'),
    H('Electrode fouled or generator electrode issue', 'low', 'Clean electrodes per procedure.', 'Endpoint detection normal.'),
  ],
  ['Measure and log the drift.', 'Run a certified water standard.', 'Inspect septa, desiccant and reagent age.', 'Check the sample for interfering groups.'],
  ['Replace septum and desiccant; replace reagent.', 'Clean electrodes.', 'Select the appropriate reagent or the oven technique.'],
  [VC('Water standard recovery', '97–103%', '±3%', 'Certified water standard in triplicate'), VC('Drift', 'Below SOP limit (e.g. < 20 µg/min)', 'Per SOP', 'Log before each titration')],
  COMMON_ESCALATION,
  ['KF reagents are toxic and flammable; work in a fume hood.'],
  ['What is the current drift and the water standard recovery?']);

const SPECTROSCOPY = gen('spectroscopy-default', 'General spectroscopy troubleshooting',
  [
    H('Sample preparation or cell/cuvette issue', 'high', 'Measure a reference standard in a clean cell.', 'Standard meets specification.'),
    H('Source or laser output degraded', 'medium', 'Check source hours and intensity against the baseline.', 'Intensity below specification.'),
    H('Optical alignment or purge (N2) problem', 'medium', 'Run the instrument performance test.', 'Test fails.'),
    H('Wrong acquisition parameters (bandwidth, integration, wavelength)', 'low', 'Compare parameters with the validated method.', 'A parameter differs.'),
  ],
  ['Run the performance verification.', 'Measure a reference standard.', 'Check source hours and purge.', 'Review acquisition parameters.'],
  ['Clean or replace cells.', 'Replace the source or lamp.', 'Realign or purge per procedure.', 'Restore parameters.'],
  [VC('Performance verification', 'Pass', 'Per instrument', 'Manufacturer verification routine')],
  COMMON_ESCALATION,
  ['Laser and UV sources: follow interlock and eye-protection requirements.'],
  ['Does the performance verification pass?']);

const MICROSCOPY = gen('microscopy-default', 'General electron microscopy troubleshooting',
  [
    H('Sample charging, contamination or poor conductivity', 'high', 'Image a standard specimen; check coating and grounding.', 'Standard images normally.'),
    H('Vacuum not reaching operating level', 'high', 'Check vacuum readings and chamber seals.', 'Vacuum below specification.'),
    H('Alignment, stigmation or aperture contamination', 'medium', 'Perform beam alignment and stigmation on the standard.', 'Image quality recovers.'),
    H('Filament or source ageing', 'low', 'Check emission current and source hours.', 'Emission unstable.'),
  ],
  ['Image the reference standard.', 'Check vacuum status.', 'Perform alignment and stigmation.', 'Check source hours and emission.'],
  ['Coat or ground the sample properly.', 'Clean or replace apertures (trained personnel).', 'Replace the filament (service).'],
  [VC('Resolution on standard', 'Meets instrument specification', 'Per spec', 'Standard specimen image')],
  COMMON_ESCALATION,
  ['High voltage and vacuum: do not open the column or chamber while energised.'],
  ['Does the reference standard image correctly?']);

const NMR_PROC = gen('nmr-default', 'General NMR troubleshooting',
  [
    H('Shimming or lock problem (sample, solvent, tube)', 'high', 'Insert the lineshape standard, lock and shim.', 'Lineshape meets specification.'),
    H('Probe tuning or matching off for the sample', 'medium', 'Tune and match the probe on the sample.', 'Reflected power minimal.'),
    H('Sample issue (concentration, particulates, tube quality)', 'medium', 'Filter and re-prepare in a new tube.', 'Spectrum quality recovers.'),
    H('Temperature or spinning instability', 'low', 'Check temperature regulation and spinning.', 'Stable readings.'),
  ],
  ['Run the lineshape and sensitivity standards.', 'Tune and match the probe.', 'Inspect the sample and tube.', 'Check lock level and temperature.'],
  ['Re-shim; re-prepare the sample.', 'Retune the probe.', 'Recalibrate temperature.'],
  [VC('Lineshape', 'Within specification (e.g. 50% width < 0.5 Hz)', 'Per spec', 'Lineshape standard')],
  COMMON_ESCALATION,
  ['Strong magnetic field: keep ferromagnetic objects and implants away.'],
  ['Does the standard lineshape test pass?']);

const BIOPROCESS = gen('fplc-default', 'General FPLC troubleshooting',
  [
    H('Column fouling or compression', 'high', 'Run a column performance test (acetone pulse) and compare plate count and asymmetry.', 'Plate count below specification.'),
    H('Buffer preparation or conductivity mismatch', 'medium', 'Verify buffer pH and conductivity.', 'Values differ from the method.'),
    H('Air in the system or pump problem', 'medium', 'Purge pumps; check for bubbles and pressure stability.', 'Pressure stabilises.'),
    H('UV cell or detector contamination', 'low', 'Clean the flow cell and check lamp status.', 'Baseline recovers.'),
  ],
  ['Run the column efficiency test.', 'Verify buffers.', 'Purge pumps and inspect pressure.', 'Check UV baseline with buffer.'],
  ['Clean-in-place or repack/replace the column.', 'Prepare fresh buffers.', 'Service pump seals.', 'Clean the flow cell.'],
  [VC('Column plate count', 'Within manufacturer specification', 'Per spec', 'Acetone pulse test')],
  COMMON_ESCALATION,
  ['Handle biological samples and buffers per biosafety requirements.'],
  ['What is the column plate count and asymmetry?']);

const SPPS_PROC = gen('spps-default', 'General solid-phase peptide synthesis troubleshooting',
  [
    H('Incomplete coupling (aggregation, hindered residues)', 'high', 'Perform a Kaiser or chloranil test after coupling; double-couple the step.', 'Test negative after double coupling.'),
    H('Incomplete Fmoc deprotection', 'high', 'Extend deprotection and monitor UV of the dibenzofulvene adduct.', 'Deprotection complete.'),
    H('Reagent quality (old coupling reagents, wet solvents)', 'medium', 'Use fresh reagents and dry solvent.', 'Coupling efficiency improves.'),
    H('Instrument delivery fault (valves, lines)', 'medium', 'Run the delivery volume test.', 'Delivery outside tolerance.'),
  ],
  ['Run colorimetric tests after coupling and deprotection.', 'Review reagent age and solvent water content.', 'Run the instrument delivery test.', 'Analyse a test cleavage by LC-MS.'],
  ['Double couple or use stronger coupling reagents.', 'Extend deprotection; add chaotropic salts for aggregation.', 'Replace reagents and solvents.', 'Service delivery lines.'],
  [VC('Crude purity by LC-MS', 'Meets target', 'Per project', 'Test cleavage analysis')],
  COMMON_ESCALATION,
  ['TFA and DMF: use a fume hood and appropriate PPE.'],
  ['Which coupling step shows deletion sequences in the test cleavage?']);

const SURFACE = gen('bet-default', 'General surface area and porosity troubleshooting',
  [
    H('Insufficient degassing', 'high', 'Extend degas time or temperature and re-measure.', 'Result changes and stabilises.'),
    H('Leak in the manifold or sample tube', 'high', 'Run the leak test.', 'Leak detected.'),
    H('Wrong sample mass for the surface area', 'medium', 'Adjust sample mass to give adequate total surface area in the tube.', 'Reproducibility improves.'),
    H('Reference material out of specification', 'low', 'Run the certified reference.', 'Deviation found.'),
  ],
  ['Run the certified reference material.', 'Perform the leak test.', 'Review degassing and sample mass.'],
  ['Re-degas properly.', 'Fix leaks; replace o-rings.', 'Adjust sample mass.'],
  [VC('Reference material surface area', 'Within ± 5% of certified value', '±5%', 'Reference measurement')],
  COMMON_ESCALATION,
  ['Liquid nitrogen: cryogenic PPE required.'],
  ['Does the reference material measure within specification?']);

const SPUTTER = gen('sputter-default', 'General sputter coater troubleshooting',
  [
    H('Vacuum not reaching the working pressure (leak, pump)', 'high', 'Check pump-down time and base pressure.', 'Base pressure above specification.'),
    H('Target eroded or contaminated', 'medium', 'Inspect the target.', 'Visible wear or contamination.'),
    H('Argon supply or pressure setting incorrect', 'medium', 'Verify gas supply and process pressure.', 'Setting off.'),
  ],
  ['Check base and process pressure.', 'Inspect the target and chamber seals.', 'Verify gas settings.'],
  ['Replace seals or service the pump.', 'Replace the target.', 'Correct gas settings.'],
  [VC('Coating thickness', 'Within ± 10% of setpoint', '±10%', 'Thickness monitor or test specimen')],
  COMMON_ESCALATION,
  ['High voltage present; do not open during operation.'],
  ['What base pressure is reached?']);

const CE_PROC = gen('ce-default', 'General capillary electrophoresis troubleshooting',
  [
    H('Capillary wall condition (insufficient conditioning, adsorption)', 'high', 'Recondition the capillary and rerun the standard.', 'Migration times and peak shape recover.'),
    H('Buffer depletion or preparation error', 'high', 'Prepare fresh buffer and replace vials.', 'Migration stable.'),
    H('Current instability from bubbles or blocked capillary', 'medium', 'Monitor current; flush the capillary.', 'Current stable.'),
  ],
  ['Monitor the current trace.', 'Recondition the capillary.', 'Prepare fresh buffer.', 'Inject a standard.'],
  ['Replace the capillary if flushing fails.', 'Refresh buffers per run count.'],
  [VC('Migration time RSD', '< 1%', 'Per method', 'Six replicate injections')],
  COMMON_ESCALATION,
  ['High voltage: keep the cartridge cover closed during runs.'],
  ['Is the current trace stable during the run?']);

export const TECHNIQUE_DEFAULTS: Record<Technique, GenericProcedure> = {
  HPLC: LC_DEFAULT, UHPLC: LC_DEFAULT, PrepLC: LC_DEFAULT, LCMS: LC_DEFAULT, SFC: LC_DEFAULT, IC: LC_DEFAULT,
  GC: GC_DEFAULT, GCMS: GC_DEFAULT,
  CE: CE_PROC,
  TGA: THERMAL, DSC: THERMAL,
  FPLC: BIOPROCESS,
  SPPS: SPPS_PROC,
  XRD: XRD,
  DLS: DLS,
  Titration: TITRATION,
  KF: KF, KFO: KF,
  CD: SPECTROSCOPY, Raman: SPECTROSCOPY,
  SEM: MICROSCOPY, TEM: MICROSCOPY,
  Sputter: SPUTTER,
  BET: SURFACE,
  SECMALS: LC_DEFAULT,
  NMR: NMR_PROC, ssNMR: NMR_PROC,
};

export const UNIVERSAL_DEFAULT: GenericProcedure = gen('universal-default', 'General instrument troubleshooting',
  [
    H('Recent change in sample, consumables, method or environment', 'medium', 'List every change since the last good result and revert them one at a time.', 'Result recovers after a specific reversion.'),
    H('Instrument performance drift', 'medium', 'Run the manufacturer performance verification or a certified reference.', 'Verification fails.'),
    H('Operator or data-processing error', 'low', 'Reprocess a known good data set and repeat the measurement with a second operator.', 'Result differs between operators or processing runs.'),
  ],
  ['Run a certified reference or performance verification.', 'Review the instrument log for errors and maintenance.', 'Compare current settings with the validated method.', 'Repeat the measurement with a fresh sample.'],
  ['Revert recent changes.', 'Perform routine maintenance per the manual.', 'Recalibrate.'],
  [VC('Reference measurement', 'Within specification', 'Per method', 'Certified reference run')],
  COMMON_ESCALATION,
  ['Follow the instrument safety manual before any intervention.'],
  ['What changed most recently?']);

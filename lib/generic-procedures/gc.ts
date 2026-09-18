import { H, VC, type GenericProcedure } from './types';

// Gas-chromatography procedures (GC, GCMS). Keys are normalised issue categories.

const GC_SAFETY = [
  'Inlet, detector and transfer line are hot; allow to cool before handling.',
  'Hydrogen carrier or fuel gas: check for leaks with an electronic leak detector, never a flame.',
  'Vent the MS and wait for the turbo pump to stop before opening the analyser.',
];

const GC_ESCALATION = [
  'Fault persists after liner, septum and column trim or replacement.',
  'Vacuum, high-voltage or heater error codes are present.',
  'Any action requires opening the MS analyser or the detector electronics.',
];

export const GC_ISSUE_PROCEDURES: Record<string, GenericProcedure> = {
  'gc ghost peaks': {
    key: 'gc ghost peaks',
    title: 'Ghost peaks in GC blanks',
    hypotheses: [
      H('Septum bleed or septum particles in the liner', 'high', 'Replace the septum and liner and run a blank.', 'Ghost peaks disappear.'),
      H('Carryover from the syringe or a previous high-concentration sample', 'high', 'Run solvent washes of the syringe and inject a blank; compare with an oven bake-out.', 'Peaks fall with washes.'),
      H('Contaminated carrier gas or gas lines (trap exhausted)', 'medium', 'Run a no-injection blank with the inlet in split mode.', 'Peaks present without injection.'),
      H('Column contamination eluting late in a later run', 'medium', 'Extend the final hold and bake the column within limits.', 'Ghost peaks move or disappear after bake-out.'),
    ],
    checks: ['Run a no-injection blank, then a solvent blank.', 'Inspect and replace the septum and liner.', 'Check gas trap status and line connections.', 'Review the previous samples in the sequence.'],
    corrective_actions: ['Replace septum, liner and o-ring.', 'Wash the syringe or replace it.', 'Replace gas traps and purge lines.', 'Bake out the column and trim the inlet end.'],
    verification_criteria: [VC('Blank chromatogram', 'No peaks above LOD at analyte retention times', 'Per method', 'Solvent blank after high standard')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['Do the ghost peaks appear in a no-injection blank?'],
  },
  'poor gc peak shape': {
    key: 'poor gc peak shape',
    title: 'Poor GC peak shape',
    hypotheses: [
      H('Active sites in the liner or the column inlet', 'high', 'Replace the liner with a deactivated one and trim 10–20 cm from the column inlet.', 'Tailing of active analytes improves.'),
      H('Column installed at the wrong depth or a poor column cut', 'high', 'Reinstall the column with a clean square cut at the manufacturer insertion depth.', 'Peak shape improves.'),
      H('Inlet temperature or split ratio inappropriate for the sample', 'medium', 'Adjust inlet temperature and split ratio per the method.', 'Fronting or tailing resolves.'),
      H('Solvent and stationary phase mismatch causing solvent effect problems (splitless)', 'medium', 'Check initial oven temperature relative to solvent boiling point.', 'Peak shape improves with correct focusing.'),
    ],
    checks: ['Inspect the liner and column cut.', 'Verify insertion depth and ferrule condition.', 'Check inlet temperature, split ratio and initial oven temperature.', 'Check for leaks at the inlet with an electronic leak detector.'],
    corrective_actions: ['Replace the liner and septum; trim and reinstall the column.', 'Correct inlet and oven parameters.', 'Replace the ferrule and fix leaks.'],
    verification_criteria: [VC('Tailing factor', '≤ 1.5 for test mix', 'Per method', 'Inject column test mix')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['Do all peaks show the problem or only polar analytes?'],
  },
  'gcms signal loss': {
    key: 'gcms signal loss',
    title: 'GC-MS signal loss',
    hypotheses: [
      H('Ion source contamination', 'high', 'Run the tune and compare with the last passing tune; check EM voltage.', 'Tune fails or EM voltage has risen sharply.'),
      H('Air or water leak into the vacuum system', 'high', 'Check m/z 18, 28 and 32 in the tune spectrum.', 'Elevated air or water peaks.'),
      H('Inlet or column problem reducing analyte transfer', 'medium', 'Replace liner and check the column installation at the transfer line.', 'Response recovers.'),
      H('Electron multiplier or detector ageing', 'low', 'Review EM voltage trend over time.', 'Voltage near maximum.'),
    ],
    checks: ['Run the tune and inspect air/water ratios and EM voltage.', 'Check vacuum readings against normal values.', 'Leak check fittings, septum and transfer line.', 'Inject a reference standard and compare response.'],
    corrective_actions: ['Clean the ion source (trained personnel).', 'Repair leaks; replace septum and ferrules.', 'Replace liner, trim column.', 'Replace the electron multiplier if at end of life (service).'],
    verification_criteria: [VC('Tune report', 'Passes with air/water within specification', 'Per instrument', 'Autotune'), VC('Standard response', 'Within 20% of historical', '±20%', 'Reference standard injection')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['What does the latest tune report show for air, water and EM voltage?'],
  },
  'gc oven cooling failure': {
    key: 'gc oven cooling failure',
    title: 'GC oven fails to cool',
    hypotheses: [
      H('Oven exhaust flap or fan not operating', 'high', 'Listen for the fan and observe the flap during cool-down.', 'No fan noise or flap movement.'),
      H('Ambient temperature or ventilation limiting cooling', 'medium', 'Check clearance behind the instrument and room temperature.', 'Restricted airflow or hot room.'),
      H('Cryogenic cooling supply empty or valve fault', 'low', 'Check coolant supply and valve operation.', 'Supply empty or valve inactive.'),
    ],
    checks: ['Time the cool-down from the maximum temperature to the initial temperature.', 'Inspect fan and flap operation.', 'Check clearance and room conditions.'],
    corrective_actions: ['Clear obstructions and restore ventilation.', 'Replace fan or flap motor (service).', 'Restore coolant supply.'],
    verification_criteria: [VC('Cool-down time', 'Within manufacturer specification', 'Per spec', 'Time from final to initial temperature')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['How long does cool-down take now compared with normal?'],
  },
  'gc oven temperature instability': {
    key: 'gc oven temperature instability',
    title: 'GC oven temperature instability',
    hypotheses: [
      H('Oven door seal or flap leaking air', 'high', 'Inspect seals and flap closure.', 'Visible gap or damaged seal.'),
      H('Temperature sensor or heater control fault', 'medium', 'Compare setpoint with an external probe.', 'Deviation beyond specification.'),
    ],
    checks: ['Log oven temperature during an isothermal hold.', 'Inspect door seal and flap.', 'Run the oven calibration check.'],
    corrective_actions: ['Replace the door seal.', 'Recalibrate or replace the sensor (service).'],
    verification_criteria: [VC('Isothermal stability', '± 0.1 °C', '±0.1 °C', '30 min hold with external probe')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['Does retention time RSD exceed the method limit?'],
  },
  'gc inlet contamination': {
    key: 'gc inlet contamination',
    title: 'GC inlet contamination',
    hypotheses: [
      H('Non-volatile residue in the liner and on the column inlet', 'high', 'Replace the liner and trim the column; rerun the standard.', 'Response and peak shape recover.'),
      H('Septum degradation', 'medium', 'Replace the septum and run a blank.', 'Bleed peaks disappear.'),
    ],
    checks: ['Inspect the liner for residue.', 'Count injections since last liner change.', 'Run a blank after replacement.'],
    corrective_actions: ['Replace liner, septum, o-ring; trim column inlet.', 'Improve sample cleanup or use a liner with glass wool.'],
    verification_criteria: [VC('Standard response', 'Within 10% of historical', '±10%', 'Reference standard injection')],
    escalation: GC_ESCALATION,
    safety: GC_SAFETY,
    next_questions: ['How many injections since the last liner change?'],
  },
};

export const GC_DEFAULT: GenericProcedure = {
  key: 'gc-default',
  title: 'General gas chromatography troubleshooting',
  hypotheses: [
    H('Inlet consumables exhausted (liner, septum, o-ring)', 'medium', 'Replace consumables and rerun the standard.', 'Performance recovers.'),
    H('Gas supply or leak problem', 'medium', 'Leak check inlet and fittings; verify gas pressures and trap status.', 'Leak found or pressure abnormal.'),
    H('Column performance degradation', 'medium', 'Trim the column inlet or install a new column.', 'Test mix passes.'),
    H('Detector or MS condition (contamination, tune)', 'medium', 'Run detector or MS tune and compare with baseline.', 'Tune fails or detector output abnormal.'),
  ],
  checks: [
    'Inject the column test mix and compare with the reference chromatogram.',
    'Leak check the inlet and column connections.',
    'Inspect liner and septum; note injection counts.',
    'Verify carrier gas flow, pressures and oven program against the method.',
    'Review instrument logs for errors.',
  ],
  corrective_actions: ['Replace inlet consumables and trim the column.', 'Repair leaks and replace gas traps.', 'Clean the detector or MS source (trained personnel).', 'Restore method parameters.'],
  verification_criteria: [VC('Test mix', 'Retention and peak shape within specification', 'Per method', 'Inject column test mix')],
  escalation: GC_ESCALATION,
  safety: GC_SAFETY,
  next_questions: ['Which parameter changed first: retention, response or peak shape?'],
};

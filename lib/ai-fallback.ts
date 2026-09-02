import Anthropic from '@anthropic-ai/sdk';
import type { RankedAnswer, RankedAnswerV2, Hypothesis, ConfidenceBreakdown, EvidenceSummaryV2, MissingInfoResult, VerificationCriterion, ActionDetail, SafetyLevel } from './types';
import type { RankingQuery, RankingQueryV2 } from '@/agents/ranking/types';
import { getCapability } from './instrument-capabilities';
import { detectMissingInfo } from './missing-info-detector';
import { deduplicateItems } from './deduplication';
import { runQualityChecks } from './quality-control';
import { validateSourceForVendor } from './evidence-hierarchy';
import { getConfidenceLabelV2 } from '@/agents/ranking/tiering';
import { CONFIDENCE_CAPS } from '@/agents/ranking/weights';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert analytical chemistry and materials characterisation instrument troubleshooter with deep knowledge across:

Separation techniques: HPLC, UHPLC, LCMS, GC, GCMS, IC (Ion Chromatography — Dionex/Thermo ICS series), CE, SFC
LC-MS instrument types and single-quadrupole specifics: single quadrupole — Agilent 6120B/6125B/6130B/6135B Compact LC/MSD (MassHunter, autotune, SIM vs scan sensitivity, fragmentor voltage optimisation, ESI capillary cleaning); Agilent InfinityLab LC/MSD iQ (G6301) — self-aware mass detector, Auto Acquire, autotune, system health monitoring, ESI/APCI/MMI, m/z 100-1350, MassHunter WalkUp; Agilent InfinityLab Pro iQ (G6160B) — m/z 2-1600, ESI/APCI/MMI, OpenLab CDS 2.7+; Agilent InfinityLab Pro iQ Plus (G6170A) — m/z 2-3000 extended mass range, ESI/APCI/MMI plus Agilent Jet Stream (AJS) ion source, sub-30 fg IDL sensitivity, OpenLab CDS 2.7+, 15-35°C, up to 3000m altitude; Waters QDa Mass Detector / QDa Performance Mass Detector / Xevo SQ Detector 2 (MassLynx, cone voltage optimisation, leucine enkephalin system suitability); triple quadrupole — Agilent 6460/6470/6495/6495C, Waters Xevo TQ-S/TQ-XS/TQ-S micro, SCIEX QTRAP 4500/5500/6500+/Triple Quad 5500+/6500+, Shimadzu LCMS-8045/8060/8060NX, Thermo Fisher TSQ Altis/Altis Plus/Quantis; Q-TOF/high-resolution — Agilent 6530/6545/6546/6560 Ion Mobility, Waters Xevo G2-XS/G3 QTof/Synapt XS/SELECT SERIES Cyclic IMS, SCIEX TripleTOF 6600+/ZenoTOF 7600, Thermo Fisher Q Exactive/Q Exactive Plus/HF/Orbitrap Exploris 480/Orbitrap Astral; key LCMS issues: ESI source contamination, cone/fragmentor voltage optimisation, adduct formation (Na+/K+/NH4+ — eliminate glass containers, reduce buffer concentration, increase fragmentor/cone voltage), SIM vs full-scan sensitivity trade-off, in-source CID, ion suppression, carryover, mobile phase MS compatibility (avoid non-volatile buffers)
Instrument communication faults and error codes (all MS techniques): Agilent MSD error event codes — ee(X,Y) format where X=error number, Y=sub-error; ee(65,0) is a dual-cause error that indicates EITHER a vacuum system fault (turbo pump failure, fore pump fault, vacuum leak) OR a communication fault (USB/LAN disconnection, firmware hang, Windows USB suspend, IP conflict); ALWAYS consider both causes and distinguish via MassHunter vacuum status panel and power-cycle test (if ee() clears after 15-min power cycle, communication hang more likely than hardware vacuum failure); general instrument communication troubleshooting: full power cycle (off → wait for turbo deceleration → on), USB cable replacement, disable Windows USB Selective Suspend, assign static IP for LAN instruments, reinstall/update instrument driver, check inter-module CAN bus cables; Waters MassLynx instrument connection errors: check Instrument Console status, ping instrument IP; Thermo Fisher instruments: check Instrument Configuration in Xcalibur; SCIEX Analyst: check hardware profile and instrument status; when user reports an instrument error code (ee(), Err, EC, E followed by numbers) ALWAYS suggest both hardware-specific cause AND communication/firmware cause as parallel hypotheses
Thermal analysis: TGA (Thermogravimetric Analysis) and DSC (Differential Scanning Calorimetry) — TA Instruments Discovery and Q series, NETZSCH, Mettler Toledo
Bioprocess chromatography: FPLC (Fast Protein Liquid Chromatography) — Cytiva ÄKTA avant 25/150, ÄKTA OligoPilot 10/100 Plus, UNICORN software; protein purification (IEX, HIC, SEC, affinity) and oligonucleotide purification (IP-RP, IEX)
Peptide synthesis: SPPS (Solid Phase Peptide Synthesis, Fmoc strategy) — CSBio CS136X/CS336X/CS536X series, CEM Liberty Blue/Liberty Blue HT/Liberty Prime, Biotage Syro Wave, Gyros Protein Technologies Prelude X / Symphony X; coupling reagents (HATU, HBTU, DIC/HOBt, PyBOP); resin chemistry (Wang, Rink amide, ChemMatrix, TentaGel); common issues: incomplete coupling, aggregation, Fmoc deprotection failure, cleavage/side-chain deprotection, racemization, aspartimide, diketopiperazine, instrument delivery failures
X-Ray Diffraction: XRD — Bruker D2 Phaser/D8 Advance/D8 Discover/D8 ENDEAVOR, Malvern Panalytical Empyrean/X'Pert Pro/Aeris, Rigaku MiniFlex 600/SmartLab SE/Ultima IV, Shimadzu XRD-6100/7000, Thermo Fisher ARL EQUINOX; sample displacement errors, goniometer alignment, preferred orientation, Scherrer crystallite size, Rietveld refinement, FWHM analysis, X-ray tube maintenance, PDF/ICDD search-match
Particle characterisation (DLS): Malvern Panalytical Zetasizer Nano S/ZS/ZSP/Ultra Red/Pro, Mastersizer 3000/3000E, NanoSight NS300/NS500; cumulants analysis, CONTIN, PDI interpretation, zeta potential (DTS1070 cell), autocorrelation function (ACF), count rate optimisation, sample filtration and preparation, dispersant optimisation
Titration: Metrohm Titrando (905, 888, 877 Titrino Plus, 848 Titrino Plus), Mettler Toledo Excellence T series; potentiometric endpoint detection, pH and ISE electrodes, electrode conditioning, titrant standardisation, CO2 protection of NaOH, gravimetric burette calibration, non-aqueous titration (Solvotrode), pharmaceutical assay titrations
Karl Fischer moisture analysis (KF): Metrohm 870 KF Titrino Plus, 851 Titrando, 899/917 Coulometer; volumetric and coulometric KF, Hydranal reagents (Composite, Composite 5K, Coulomat AG/CG), bipotentiometric endpoint, cell conditioning, drift control, reagent interference (aldehydes, ketones, reducing agents), anolyte/catholyte management
Karl Fischer Oven (KFO): Metrohm 874 Oven Sample Processor, 885 Compact Oven; carrier gas (N2) drying, transfer line temperature, drying time and temperature optimisation, blank contribution, sample charring prevention, cellulose moisture standard, integration with coulometric KF cell

Vendors: Agilent, Waters, Thermo Fisher, Dionex, TA Instruments, Cytiva (formerly GE Healthcare), Shimadzu, PerkinElmer, Bruker, SCIEX, NETZSCH, Mettler Toledo, Restek, Phenomenex, CSBio, CEM Corporation, Biotage, Gyros Protein Technologies, Metrohm, Malvern Panalytical, Rigaku, and others.

Your answers are based on:
- Official vendor service and troubleshooting manuals
- Peer-reviewed analytical chemistry, biochemistry, and materials literature
- Established laboratory best practices, ISO standards, and QC guidelines (USP, Ph. Eur., ICH Q6A, ICH M10, ISO 13320)

EVIDENCE HIERARCHY — classify every source you reference into one of these tiers:
1. Exact-model manufacturer documentation (specific to queried model)
2. Instrument-family manufacturer documentation (same vendor, related models)
3. Regulatory standards (ICH, USP, FDA, EMA, ISO)
4. Peer-reviewed publications (journal articles with DOI)
5. Verified technical documents (application notes, tech notes)
6. General manufacturer-independent best practices
7. AI-generated inference (your own reasoning — ALWAYS label clearly)

CRITICAL RULES:
- Do NOT invent document references, URLs, page numbers, or DOI numbers that do not exist
- Do NOT present vendor documentation for one manufacturer as evidence for a different manufacturer's instrument
- Every cited source MUST include: title or description, manufacturer/organization, and classification tier
- If you are uncertain about a source, classify it as tier 7 (AI-generated inference)
- Distinguish clearly between reported observations (what user sees) and conclusions (what you infer)
- Flag numeric values (flow rate, injection volume, voltage) as METHOD-DEPENDENT starting points unless sourced from exact-model documentation
- For ion suppression: distinguish high TIC noise from actual ion suppression; reference Matrix Factor calculation per ICH M10 principles; do NOT use "50% suppression" as a universal threshold
- Provide hypotheses ranked by probability with supporting AND contradicting evidence
- Label all hypotheses as "suspected" unless direct diagnostic evidence confirms them
- Separate immediate diagnostic checks from corrective actions — corrective actions should only follow confirmed diagnosis
- Exclude steps already tried (listed under "already_checked")

HARD CONFIDENCE RULES — you MUST follow these, violations will be overridden by the system:
- Symptom description only, no diagnostic results provided → confidence MUST be ≤ 0.40
- Missing manufacturer or model information → confidence MUST be ≤ 0.35
- Missing critical method context (column, mobile phase, ionization mode for LCMS) → confidence MUST be ≤ 0.30
- No exact-model documentation cited → confidence MUST be ≤ 0.50
- User reports an observation AND proposes a diagnosis without experimental evidence → treat the diagnosis as an UNCONFIRMED HYPOTHESIS, not a fact. List the user's proposed diagnosis as one hypothesis among several.
- High TIC baseline ≠ ion suppression. These are DIFFERENT problems with different root causes and diagnostics. High TIC suggests contamination, column bleed, or mobile phase background. Ion suppression requires matrix factor evaluation (post-extraction spike vs neat standard).
- NEVER use "50% suppression" or any fixed percentage as a universal threshold for ion suppression
- ALL hypotheses MUST be labeled "suspected" unless you have direct experimental evidence confirming them
- NEVER recommend corrective actions (method changes, hardware modifications) before the relevant diagnostic check confirms the cause

METHOD CONTEXT CROSS-VALIDATION — MANDATORY (zero tolerance for violations):
- BEFORE generating each hypothesis, cause, check, or action, you MUST verify it is consistent with the user's stated method context (mobile phase, ion pair reagent, column, analyte, sample matrix). If it contradicts or is irrelevant to ANY user-provided detail, DO NOT INCLUDE IT.
- NEVER mention, reference, or recommend chemicals, reagents, or additives that the user did NOT specify. If the user says their ion pair is "tributylammonium acetate", the ONLY ion pair you may discuss is tributylammonium acetate. Do NOT mention TFA, formic acid, HFBA, TEA, or any other reagent unless the user explicitly included it.
- NEVER recommend switching FROM a reagent the user did not mention. Example: if user says "tributylammonium ion pair", do NOT recommend "switch from TFA to formic acid" — TFA is not part of their method and must not appear anywhere in your response.
- NEVER assume default reagents (TFA, formic acid, acetonitrile) if the user specified different ones. Base all advice on the USER'S stated method. Generic textbook answers that reference default reagents are WRONG when the user specified a different method.
- If a generic troubleshooting step exists (e.g., "reduce mobile phase additive concentration"), ADAPT it to the user's specific reagent. Example: if user uses tributylammonium acetate, write "reduce tributylammonium acetate concentration" NOT "reduce TFA concentration".
- Ion pair reagents are method-critical and NOT interchangeable: tributylammonium (TBA) ≠ TFA ≠ triethylammonium (TEA) ≠ HFBA. Each has distinct chromatographic behaviour, ion suppression profiles, and MS compatibility. Recommendations MUST match the specific ion pair in use.
- If the user specifies a sample matrix (e.g., "synthetic compound in buffer"), do NOT recommend steps for a different matrix type (e.g., phospholipid removal is irrelevant for non-biological samples)
- Every cause, check, and action must be checked against the user's provided method details before inclusion. If it contradicts or is irrelevant to the stated method, EXCLUDE it.
- SELF-CHECK: After generating your full response, re-read every item and verify no chemical or reagent is mentioned that the user did not provide. If you find one, remove it or replace it with the user's actual reagent.

SAFETY AND COMPREHENSIVE TROUBLESHOOTING REQUIREMENTS:
- ALWAYS include safety_warnings for any action involving high voltage, high vacuum, heated zones, pressurized systems, hazardous chemicals, UV/laser radiation, or gas cylinders
- Classify every corrective action by safety level: "operator" (safe for trained lab staff), "maintenance" (requires trained lab maintenance personnel), or "service_engineer" (must be performed by manufacturer-authorized engineer)
- Do NOT recommend opening high-voltage covers, vacuum chambers, heated MS sources, or gas regulators unless official documentation explicitly allows trained operators to do so
- For every corrective action, specify: required materials/parts, the condition under which it should be performed, and a rollback/recovery procedure if the action fails
- For verification after correction, include measurable acceptance criteria: specific parameter, expected value, tolerance, and measurement method. Examples: "Baseline noise < 0.5 mAU measured over 10 min blank gradient", "RT RSD < 0.5% over 6 injections", "Mass accuracy < 5 ppm on tuning compound"
- Order diagnostic checks from safest/quickest/least-invasive to most complex
- Provide 8-12 diagnostic checks and 6-10 corrective actions for complex problems — do not artificially limit to fewer items when more are scientifically warranted
- Include instrument-specific acceptance criteria when the model is known`;

const DEDUP_LIMIT = 12;

// V2 Tool definition with extended structured output
const TROUBLESHOOT_TOOL_V2: Anthropic.Messages.Tool = {
  name: 'troubleshoot_response',
  description: 'Return a structured troubleshooting response with evidence hierarchy and hypothesis ranking',
  input_schema: {
    type: 'object' as const,
    properties: {
      reported_observations: {
        type: 'array',
        items: { type: 'string' },
        description: 'What the user actually reported/observed (facts, not interpretations)',
      },
      safety_warnings: {
        type: 'array',
        items: { type: 'string' },
        description: 'Immediate safety and preservation warnings: injury prevention, contamination control, instrument protection, vacuum/pressure hazards, data preservation. Include before any diagnostic or corrective actions.',
      },
      hypotheses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cause: { type: 'string', description: 'Root cause hypothesis' },
            probability: { type: 'string', enum: ['high', 'medium', 'low'] },
            supporting_evidence: { type: 'array', items: { type: 'string' }, description: 'Evidence supporting this hypothesis with source classification tier' },
            contradicting_evidence: { type: 'array', items: { type: 'string' }, description: 'Evidence against this hypothesis' },
            diagnostic_test: { type: 'string', description: 'Specific test to confirm or rule out this cause' },
            expected_result: { type: 'string', description: 'What the diagnostic test should show if this cause is correct' },
          },
          required: ['cause', 'probability', 'supporting_evidence', 'diagnostic_test', 'expected_result'],
        },
        description: 'Ranked hypotheses (max 12), most likely first. Include factors that increase or decrease likelihood.',
      },
      checks: {
        type: 'array',
        items: { type: 'string' },
        description: 'Immediate diagnostic steps ordered from safest/quickest to most invasive. Include: what to inspect, how to perform check, expected normal result, abnormal result meaning, required tools/standards. Provide 8-12 checks for complex problems.',
      },
      corrective_actions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fixes — only recommend AFTER cause is confirmed via diagnostics. Provide 6-10 actions for complex problems.',
      },
      action_details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'The corrective action (must match an item in corrective_actions)' },
            condition: { type: 'string', description: 'When to perform this action (e.g., "If leak test shows >5% pressure drop in 10 min")' },
            materials: { type: 'array', items: { type: 'string' }, description: 'Required tools, parts, standards, or consumables' },
            safety_level: { type: 'string', enum: ['operator', 'maintenance', 'service_engineer'], description: 'Who can safely perform this action' },
            evidence_source: { type: 'string', description: 'Source supporting this recommendation (title + tier)' },
            rollback: { type: 'string', description: 'Recovery procedure if action fails or worsens the problem' },
          },
          required: ['action', 'condition', 'materials', 'safety_level', 'evidence_source', 'rollback'],
        },
        description: 'Detailed per-action metadata for each corrective action',
      },
      verification_steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Steps to verify the problem is resolved after correction',
      },
      verification_criteria: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            parameter: { type: 'string', description: 'What to measure (e.g., "Baseline noise", "RT RSD", "Mass accuracy")' },
            expected_value: { type: 'string', description: 'Acceptable value (e.g., "< 0.5 mAU", "< 0.5%", "< 5 ppm")' },
            tolerance: { type: 'string', description: 'Acceptable range or deviation' },
            method: { type: 'string', description: 'How to perform the measurement (e.g., "Run 6 replicate injections of system suitability standard")' },
          },
          required: ['parameter', 'expected_value', 'tolerance', 'method'],
        },
        description: 'Measurable acceptance criteria after correction. Use instrument-specific specs when model is known.',
      },
      stop_conditions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Escalation triggers for service engineer',
      },
      confidence: {
        type: 'number',
        description: 'Confidence 0.0–1.0. Cap at 0.50 for symptoms-only (no diagnostics). Cap at 0.60 if critical method info is missing. Cap at 0.70 without exact-model source. Use 0.95+ ONLY with direct diagnostic evidence.',
      },
      uncertainties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Remaining uncertainties and what additional info would improve diagnosis',
      },
      next_questions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Follow-up questions to narrow root cause',
      },
      method_dependent_flags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Items that are method-dependent starting points (flag flow rates, voltages, volumes)',
      },
      sources_with_metadata: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Source title or description' },
            manufacturer_or_org: { type: 'string', description: 'Manufacturer or organization' },
            classification: { type: 'string', enum: ['exact-model', 'instrument-family', 'regulatory-standard', 'peer-reviewed', 'verified-technical', 'general-manufacturer-independent', 'ai-inference'] },
          },
          required: ['title', 'manufacturer_or_org', 'classification'],
        },
        description: 'All referenced sources with classification. Do NOT invent sources.',
      },
    },
    required: ['reported_observations', 'safety_warnings', 'hypotheses', 'checks', 'corrective_actions', 'stop_conditions', 'confidence', 'uncertainties', 'next_questions', 'sources_with_metadata'],
  },
};

// Legacy tool kept for backwards compatibility
const TROUBLESHOOT_TOOL: Anthropic.Messages.Tool = {
  name: 'troubleshoot_response',
  description: 'Return a structured troubleshooting response',
  input_schema: {
    type: 'object' as const,
    properties: {
      likely_causes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Most to least likely causes, max 6',
      },
      checks: {
        type: 'array',
        items: { type: 'string' },
        description: 'Diagnostic steps to perform now, max 6',
      },
      corrective_actions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fixes ordered by likelihood, max 6',
      },
      stop_conditions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Escalation triggers for service engineer',
      },
      confidence: {
        type: 'number',
        description: 'Confidence 0.0–1.0 reflecting how specific the input is',
      },
      uncertainties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional info that would improve diagnosis',
      },
      next_questions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Follow-up questions to narrow root cause',
      },
    },
    required: ['likely_causes', 'checks', 'corrective_actions', 'stop_conditions', 'confidence', 'uncertainties', 'next_questions'],
  },
};

const OPUS_ESCALATION_THRESHOLD = 0.5;

interface TroubleshootResult {
  likely_causes: string[];
  checks: string[];
  corrective_actions: string[];
  stop_conditions: string[];
  confidence: number;
  uncertainties: string[];
  next_questions: string[];
}

interface TroubleshootResultV2 extends TroubleshootResult {
  reported_observations: string[];
  safety_warnings: string[];
  hypotheses: Array<{
    cause: string;
    probability: 'high' | 'medium' | 'low';
    supporting_evidence: string[];
    contradicting_evidence: string[];
    diagnostic_test: string;
    expected_result: string;
  }>;
  verification_steps: string[];
  verification_criteria: Array<{
    parameter: string;
    expected_value: string;
    tolerance: string;
    method: string;
  }>;
  action_details: Array<{
    action: string;
    condition: string;
    materials: string[];
    safety_level: string;
    evidence_source: string;
    rollback: string;
  }>;
  method_dependent_flags: string[];
  sources_with_metadata: Array<{
    title: string;
    manufacturer_or_org: string;
    classification: string;
  }>;
}

async function callModel(model: string, userMessage: string): Promise<{ parsed: TroubleshootResult; modelUsed: string }> {
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    tools: [TROUBLESHOOT_TOOL],
    tool_choice: { type: 'tool', name: 'troubleshoot_response' },
  });

  // Extract tool_use block — guaranteed by tool_choice
  const toolBlock = message.content.find(b => b.type === 'tool_use');

  if (toolBlock && toolBlock.type === 'tool_use') {
    const input = toolBlock.input as Record<string, unknown>;
    return {
      parsed: {
        likely_causes: arr(input.likely_causes),
        checks: arr(input.checks),
        corrective_actions: arr(input.corrective_actions),
        stop_conditions: arr(input.stop_conditions),
        confidence: typeof input.confidence === 'number' ? input.confidence : 0.5,
        uncertainties: arr(input.uncertainties),
        next_questions: arr(input.next_questions),
      },
      modelUsed: model,
    };
  }

  // Fallback: try text extraction (legacy compatibility)
  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const raw = JSON.parse(jsonMatch[0]);
    return {
      parsed: {
        likely_causes: arr(raw.likely_causes),
        checks: arr(raw.checks),
        corrective_actions: arr(raw.corrective_actions),
        stop_conditions: arr(raw.stop_conditions),
        confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.5,
        uncertainties: arr(raw.uncertainties),
        next_questions: arr(raw.next_questions),
      },
      modelUsed: model,
    };
  } catch {
    return {
      parsed: {
        likely_causes: [],
        checks: [],
        corrective_actions: [],
        stop_conditions: [],
        confidence: 0.3,
        uncertainties: ['AI response could not be parsed. Please try rephrasing your query.'],
        next_questions: [],
      },
      modelUsed: model,
    };
  }
}

async function callModelV2(model: string, userMessage: string): Promise<{ parsed: TroubleshootResultV2; modelUsed: string }> {
  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    tools: [TROUBLESHOOT_TOOL_V2],
    tool_choice: { type: 'tool', name: 'troubleshoot_response' },
  });

  const toolBlock = message.content.find(b => b.type === 'tool_use');

  if (toolBlock && toolBlock.type === 'tool_use') {
    const input = toolBlock.input as Record<string, unknown>;
    const hypothesesRaw = Array.isArray(input.hypotheses) ? input.hypotheses : [];

    return {
      parsed: {
        likely_causes: hypothesesRaw.map((h: Record<string, unknown>) => typeof h.cause === 'string' ? h.cause : ''),
        checks: arr(input.checks),
        corrective_actions: arr(input.corrective_actions),
        stop_conditions: arr(input.stop_conditions),
        confidence: typeof input.confidence === 'number' ? input.confidence : 0.5,
        uncertainties: arr(input.uncertainties),
        next_questions: arr(input.next_questions),
        reported_observations: arr(input.reported_observations),
        safety_warnings: arr(input.safety_warnings),
        hypotheses: hypothesesRaw.map((h: Record<string, unknown>) => ({
          cause: typeof h.cause === 'string' ? h.cause : '',
          probability: (['high', 'medium', 'low'].includes(h.probability as string) ? h.probability : 'medium') as 'high' | 'medium' | 'low',
          supporting_evidence: arr(h.supporting_evidence),
          contradicting_evidence: arr(h.contradicting_evidence),
          diagnostic_test: typeof h.diagnostic_test === 'string' ? h.diagnostic_test : '',
          expected_result: typeof h.expected_result === 'string' ? h.expected_result : '',
        })),
        verification_steps: arr(input.verification_steps),
        verification_criteria: Array.isArray(input.verification_criteria)
          ? input.verification_criteria.map((vc: Record<string, unknown>) => ({
              parameter: typeof vc.parameter === 'string' ? vc.parameter : '',
              expected_value: typeof vc.expected_value === 'string' ? vc.expected_value : '',
              tolerance: typeof vc.tolerance === 'string' ? vc.tolerance : '',
              method: typeof vc.method === 'string' ? vc.method : '',
            }))
          : [],
        action_details: Array.isArray(input.action_details)
          ? input.action_details.map((ad: Record<string, unknown>) => ({
              action: typeof ad.action === 'string' ? ad.action : '',
              condition: typeof ad.condition === 'string' ? ad.condition : '',
              materials: arr(ad.materials),
              safety_level: typeof ad.safety_level === 'string' ? ad.safety_level : 'operator',
              evidence_source: typeof ad.evidence_source === 'string' ? ad.evidence_source : '',
              rollback: typeof ad.rollback === 'string' ? ad.rollback : '',
            }))
          : [],
        method_dependent_flags: arr(input.method_dependent_flags),
        sources_with_metadata: Array.isArray(input.sources_with_metadata)
          ? input.sources_with_metadata.map((s: Record<string, unknown>) => ({
              title: typeof s.title === 'string' ? s.title : '',
              manufacturer_or_org: typeof s.manufacturer_or_org === 'string' ? s.manufacturer_or_org : '',
              classification: typeof s.classification === 'string' ? s.classification : 'ai-inference',
            }))
          : [],
      },
      modelUsed: model,
    };
  }

  // Fallback: empty V2 result
  return {
    parsed: {
      likely_causes: [], checks: [], corrective_actions: [], stop_conditions: [],
      confidence: 0.3,
      uncertainties: ['AI response could not be parsed. Please try rephrasing your query.'],
      next_questions: [],
      reported_observations: [], safety_warnings: [], hypotheses: [], verification_steps: [],
      verification_criteria: [], action_details: [],
      method_dependent_flags: [], sources_with_metadata: [],
    },
    modelUsed: model,
  };
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/** Legacy V1 fallback — preserved for backwards compatibility */
export async function aiAnswerFallback(query: RankingQuery): Promise<RankedAnswer> {
  const userMessage = buildUserMessage(query);

  // Default: Sonnet (fast, cost-efficient)
  let { parsed, modelUsed } = await callModel('claude-sonnet-4-6', userMessage);

  // Escalate to Opus if Sonnet confidence is below threshold
  if (parsed.confidence < OPUS_ESCALATION_THRESHOLD) {
    const opusResult = await callModel('claude-opus-4-6', userMessage);
    if (opusResult.parsed.confidence >= parsed.confidence) {
      parsed = opusResult.parsed;
      modelUsed = opusResult.modelUsed;
    }
  }

  return {
    problem_summary:    query.symptom_description,
    likely_causes:      parsed.likely_causes,
    checks:             parsed.checks,
    corrective_actions: parsed.corrective_actions,
    stop_conditions:    parsed.stop_conditions,
    confidence:         parsed.confidence,
    evidence_summary:   [{ source_id: modelUsed, excerpt: 'AI-generated answer based on scientific literature and instrument documentation', evidence_strength: 'moderate' }],
    uncertainties:      parsed.uncertainties,
    next_questions:     parsed.next_questions,
  };
}

/** V2 fallback with structured hypotheses, evidence hierarchy, and quality control */
export async function aiAnswerFallbackV2(
  query: RankingQueryV2,
  kbResult?: RankedAnswer,
): Promise<RankedAnswerV2> {
  const userMessage = buildUserMessageV2(query, kbResult);

  // Default: Sonnet
  let { parsed, modelUsed } = await callModelV2('claude-sonnet-4-6', userMessage);

  // Escalate to Opus if Sonnet confidence is below threshold
  if (parsed.confidence < OPUS_ESCALATION_THRESHOLD) {
    const opusResult = await callModelV2('claude-opus-4-6', userMessage);
    if (opusResult.parsed.confidence >= parsed.confidence) {
      parsed = opusResult.parsed;
      modelUsed = opusResult.modelUsed;
    }
  }

  // Detect missing info
  const missingInfo = detectMissingInfo(query, query.technique);

  // Apply confidence caps — HARD enforcement regardless of what Claude returned
  const caps: string[] = [];
  let confidence = parsed.confidence;

  // AI sources are never exact-model (always tier 7)
  caps.push(`AI-generated answer (no exact-model source): max ${CONFIDENCE_CAPS.NO_EXACT_MODEL_SOURCE * 100}%`);
  confidence = Math.min(confidence, CONFIDENCE_CAPS.NO_EXACT_MODEL_SOURCE);

  if (missingInfo.critical_missing.length > 0) {
    caps.push(`Missing critical method info (${missingInfo.critical_missing.join(', ')}): max ${CONFIDENCE_CAPS.MISSING_CRITICAL_INFO * 100}%`);
    confidence = Math.min(confidence, CONFIDENCE_CAPS.MISSING_CRITICAL_INFO);
  }

  if (!query.qc_results && !query.recent_maintenance) {
    caps.push(`Symptoms only, no diagnostic confirmation: max ${CONFIDENCE_CAPS.SYMPTOMS_ONLY * 100}%`);
    confidence = Math.min(confidence, CONFIDENCE_CAPS.SYMPTOMS_ONLY);
  }

  // Contradictions in AI output
  const hasContradiction = parsed.uncertainties.some(u => u.toLowerCase().includes('conflict') || u.toLowerCase().includes('contradict'));
  if (hasContradiction) {
    caps.push(`Conflicting evidence: reduced by ${CONFIDENCE_CAPS.CONFLICTING_EVIDENCE_REDUCTION * 100}%`);
    confidence = Math.max(0, confidence - CONFIDENCE_CAPS.CONFLICTING_EVIDENCE_REDUCTION);
  }

  confidence = parseFloat(confidence.toFixed(2));

  // Deduplicate
  const dedupCauses = deduplicateItems(parsed.likely_causes, DEDUP_LIMIT);
  const dedupChecks = deduplicateItems(parsed.checks, DEDUP_LIMIT);
  const dedupActions = deduplicateItems(parsed.corrective_actions, DEDUP_LIMIT);

  // Method context relevance filter — remove items contradicting user's stated method
  const methodContextFlags: string[] = [];
  const filteredCauses = filterByMethodContext(dedupCauses.main, query, methodContextFlags);
  const filteredChecks = filterByMethodContext(dedupChecks.main, query, methodContextFlags);
  const filteredActions = filterByMethodContext(dedupActions.main, query, methodContextFlags);

  // Build hypotheses — filter out those whose cause mentions irrelevant chemicals
  const hypotheseCauses = parsed.hypotheses.map(h => h.cause);
  const filteredHypothesisCauses = filterByMethodContext(hypotheseCauses, query, methodContextFlags);
  const filteredHypothesisCauseSet = new Set(filteredHypothesisCauses);

  const hypotheses: Hypothesis[] = parsed.hypotheses
    .filter(h => filteredHypothesisCauseSet.has(h.cause))
    .map((h, i) => ({
      rank: i + 1,
      cause: h.cause,
      probability: h.probability,
      supporting_evidence: h.supporting_evidence,
      contradicting_evidence: h.contradicting_evidence ?? [],
      diagnostic_test: h.diagnostic_test,
      expected_result: h.expected_result,
      status: 'suspected' as const,
    }));

  // Build sources with metadata
  const classificationMap: Record<string, EvidenceSummaryV2['classification']> = {
    'exact-model': 'exact-model',
    'instrument-family': 'instrument-family',
    'regulatory-standard': 'regulatory-standard',
    'peer-reviewed': 'peer-reviewed',
    'verified-technical': 'verified-technical',
    'general-manufacturer-independent': 'general-manufacturer-independent',
    'ai-inference': 'ai-inference',
  };

  const sourcesWithMetadata: EvidenceSummaryV2[] = parsed.sources_with_metadata.map(s => {
    let classification = classificationMap[s.classification] ?? 'ai-inference';
    let tier = (Object.entries(classificationMap).findIndex(([k]) => k === s.classification) + 1 || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

    // Cross-vendor validation: if source mentions a different vendor, downgrade to ai-inference
    if (query.vendor && s.manufacturer_or_org) {
      const sourceVendor = s.manufacturer_or_org.toLowerCase().replace(/\s+/g, '');
      const queryVendor = query.vendor.toLowerCase().replace(/\s+/g, '');
      const isVendorSpecific = ['exact-model', 'instrument-family'].includes(classification);
      if (isVendorSpecific && sourceVendor !== queryVendor && !sourceVendor.includes(queryVendor) && !queryVendor.includes(sourceVendor)) {
        classification = 'ai-inference';
        tier = 7;
      }
    }

    return {
      source_id: modelUsed,
      excerpt: s.title,
      evidence_strength: 'moderate' as const,
      classification,
      source_metadata: {
        title: s.title,
        manufacturer_or_org: s.manufacturer_or_org,
        doc_number: null,
        pub_date: null,
        url: null,
        page_or_section: null,
        classification,
        tier,
      },
    };
  });

  const confidenceBreakdown: ConfidenceBreakdown = {
    raw_score: parsed.confidence,
    caps_applied: caps,
    final_score: confidence,
    label: getConfidenceLabelV2(confidence),
    factor_scores: {
      source_authority: 0.30,  // AI = tier 7
      technique_relevance: 1.0,
      issue_relevance: parsed.confidence,
      recency: 1.0,
      evidence_strength: 0.70,
    },
    explanation: `AI-generated answer (${modelUsed}). ${caps.length > 0 ? `Caps applied: ${caps.join('; ')}` : 'No caps applied.'}`,
  };

  const result: RankedAnswerV2 = {
    problem_summary: query.symptom_description,
    likely_causes: filteredCauses,
    checks: filteredChecks,
    corrective_actions: filteredActions,
    stop_conditions: parsed.stop_conditions,
    confidence,
    evidence_summary: [{ source_id: modelUsed, excerpt: 'AI-generated answer based on scientific literature and instrument documentation', evidence_strength: 'moderate' }],
    uncertainties: parsed.uncertainties,
    next_questions: parsed.next_questions,

    missing_information: missingInfo,
    hypotheses,
    immediate_checks: filteredChecks,
    verification_steps: parsed.verification_steps ?? [],
    escalation_criteria: parsed.stop_conditions,
    sources_with_metadata: sourcesWithMetadata,
    confidence_breakdown: confidenceBreakdown,
    method_dependent_flags: [...(parsed.method_dependent_flags ?? []), ...methodContextFlags],
    printable_checklist: [
      ...filteredChecks.map((c, i) => `☐ Check ${i + 1}: ${c}`),
      ...filteredActions.map((a, i) => `☐ Action ${i + 1}: ${a}`),
    ],
    reported_observations: parsed.reported_observations ?? [query.symptom_description],
    confirmed_evidence: [],
    remaining_uncertainty: parsed.uncertainties,
    // V3 comprehensive troubleshooting fields
    safety_warnings: parsed.safety_warnings ?? [],
    verification_criteria: (parsed.verification_criteria ?? []).map(vc => ({
      parameter: vc.parameter,
      expected_value: vc.expected_value,
      tolerance: vc.tolerance,
      method: vc.method,
    })),
    action_details: (parsed.action_details ?? []).map(ad => ({
      action: ad.action,
      condition: ad.condition,
      materials: ad.materials,
      safety_level: (['operator', 'maintenance', 'service_engineer'].includes(ad.safety_level) ? ad.safety_level : 'operator') as SafetyLevel,
      evidence_source: ad.evidence_source,
      rollback: ad.rollback,
    })),
  };

  // Symptom/cause confusion check: remove causes that restate the symptom
  const symptomWords = getWordSet(query.symptom_description);
  if (symptomWords.size >= 3) {
    const filtered: string[] = [];
    for (const cause of result.likely_causes) {
      const causeWords = getWordSet(cause);
      const overlap = [...symptomWords].filter(w => causeWords.has(w)).length;
      const similarity = overlap / Math.max(symptomWords.size, causeWords.size);
      if (similarity > 0.6) {
        // Move to observations instead of causes
        if (!result.reported_observations.includes(cause)) {
          result.reported_observations.push(cause);
        }
      } else {
        filtered.push(cause);
      }
    }
    result.likely_causes = filtered;
  }

  // Run quality checks — enforce caps directly
  const qc = runQualityChecks(result, query);
  if (qc.action === 'downgrade' || qc.action === 'regenerate') {
    // Apply recommended confidence cap from QC
    if (qc.recommended_confidence !== null && qc.recommended_confidence < result.confidence) {
      result.confidence = qc.recommended_confidence;
    } else {
      // Fallback: subtract 0.15 per error
      const errorCount = qc.failures.filter(f => f.severity === 'error').length;
      result.confidence = Math.max(0, result.confidence - errorCount * 0.15);
    }
    result.confidence = parseFloat(result.confidence.toFixed(2));
    result.confidence_breakdown.final_score = result.confidence;
    result.confidence_breakdown.label = getConfidenceLabelV2(result.confidence);
    result.confidence_breakdown.caps_applied.push(`Quality control ${qc.action}: ${qc.failures.length} issue(s)`);
    result.uncertainties.push(
      ...qc.failures.map(f => `QC ${f.severity}: ${f.message}`)
    );
  }

  return result;
}

function buildUserMessage(query: RankingQuery): string {
  const lines: string[] = [
    `Technique: ${query.technique}`,
  ];
  if (query.vendor)            lines.push(`Vendor: ${query.vendor}`);
  if (query.model)             lines.push(`Model: ${query.model}`);
  if (query.issue_category)    lines.push(`Issue category: ${query.issue_category}`);
  if (query.method_conditions) lines.push(`Method conditions: ${query.method_conditions}`);
  lines.push(`Symptom description: ${query.symptom_description}`);
  if (query.already_checked.length > 0) {
    lines.push(`Already checked: ${query.already_checked.join(', ')}`);
  }
  return lines.join('\n');
}

function buildUserMessageV2(query: RankingQueryV2, kbResult?: RankedAnswer): string {
  const lines: string[] = [
    `Technique: ${query.technique}`,
  ];
  if (query.vendor)            lines.push(`Vendor: ${query.vendor}`);
  if (query.model)             lines.push(`Model: ${query.model}`);
  if (query.issue_category)    lines.push(`Issue category: ${query.issue_category}`);
  if (query.method_conditions) lines.push(`Method conditions: ${query.method_conditions}`);

  // Extended context fields
  if (query.analyte)           lines.push(`Analyte: ${query.analyte}`);
  if (query.sample_matrix)     lines.push(`Sample matrix: ${query.sample_matrix}`);
  if (query.column)            lines.push(`Column: ${query.column}`);
  if (query.mobile_phase)      lines.push(`Mobile phase: ${query.mobile_phase}`);
  if (query.flow_rate)         lines.push(`Flow rate: ${query.flow_rate}`);
  if (query.injection_volume)  lines.push(`Injection volume: ${query.injection_volume}`);
  if (query.gradient)          lines.push(`Gradient: ${query.gradient}`);
  if (query.retention_time)    lines.push(`Retention time: ${query.retention_time}`);
  if (query.ionization_mode)   lines.push(`Ionization mode: ${query.ionization_mode}`);
  if (query.source_params)     lines.push(`Source parameters: ${query.source_params}`);
  if (query.acquisition_mode)  lines.push(`Acquisition mode: ${query.acquisition_mode}`);
  if (query.recent_maintenance) lines.push(`Recent maintenance: ${query.recent_maintenance}`);
  if (query.qc_results)        lines.push(`QC results: ${query.qc_results}`);
  if (query.expected_result)   lines.push(`Expected result: ${query.expected_result}`);

  lines.push(`Symptom description: ${query.symptom_description}`);

  if (query.already_checked.length > 0) {
    lines.push(`Already checked: ${query.already_checked.join(', ')}`);
  }

  // Inject instrument capability profile
  const capability = getCapability(query.vendor, query.model);
  if (capability) {
    lines.push('');
    lines.push('=== INSTRUMENT CAPABILITY PROFILE ===');
    lines.push(`Type: ${capability.ms_type ?? capability.technique}`);
    if (capability.mass_range) lines.push(`Mass range: m/z ${capability.mass_range.min}–${capability.mass_range.max}`);
    if (capability.ionization_modes.length > 0) lines.push(`Ionization modes: ${capability.ionization_modes.join(', ')}`);
    if (capability.capabilities.length > 0) lines.push(`Capabilities: ${capability.capabilities.join(', ')}`);
    if (capability.cannot_do.length > 0) lines.push(`CANNOT DO: ${capability.cannot_do.join(', ')} — do NOT recommend these`);
    if (capability.notes.length > 0) lines.push(`Notes: ${capability.notes.join('; ')}`);
  }

  // Inject KB evidence if available
  if (kbResult && kbResult.likely_causes.length > 0) {
    lines.push('');
    lines.push('=== KNOWLEDGE BASE EVIDENCE (for context) ===');
    lines.push(`KB confidence: ${(kbResult.confidence * 100).toFixed(0)}%`);
    lines.push(`KB likely causes: ${kbResult.likely_causes.slice(0, 3).join('; ')}`);
    if (kbResult.evidence_summary.length > 0) {
      lines.push(`KB sources: ${kbResult.evidence_summary.map(e => `${e.source_id} (${e.evidence_strength})`).join(', ')}`);
    }
  }

  // Inject missing info
  const missingInfo = detectMissingInfo(query, query.technique);
  if (missingInfo.critical_missing.length > 0) {
    lines.push('');
    lines.push(`=== MISSING CRITICAL INFO: ${missingInfo.critical_missing.join(', ')} ===`);
    lines.push('Due to missing information, your confidence MUST NOT exceed 0.30. Note what additional details would improve the diagnosis.');
  }

  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getWordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/** Chemical keyword groups for method context filtering */
const METHOD_CHEMICAL_GROUPS: string[][] = [
  ['tributylammonium', 'tba', 'tributylamine'],
  ['tfa', 'trifluoroacetic', 'trifluoroacetate'],
  ['triethylammonium', 'tea', 'triethylamine'],
  ['tetrabutylammonium', 'tbah', 'tbaoh'],
  ['hfba', 'hexafluorobutyric', 'heptafluorobutyric'],
  ['formic acid', 'formate'],
  ['acetic acid', 'acetate'],
  ['ammonium formate'],
  ['ammonium acetate'],
  ['ammonium bicarbonate'],
];

/**
 * Filter items that mention chemicals contradicting the user's stated method context.
 * Returns filtered array. Removed items are logged to flags array.
 */
function filterByMethodContext(
  items: string[],
  query: RankingQueryV2,
  flags: string[],
): string[] {
  const userContext = [
    query.mobile_phase ?? '',
    query.column ?? '',
    query.sample_matrix ?? '',
    query.analyte ?? '',
    query.method_conditions ?? '',
  ].join(' ').toLowerCase();

  if (userContext.trim().length < 3) return items;

  // Find which chemical groups the user's method contains
  const userGroupIndices = new Set<number>();
  for (let i = 0; i < METHOD_CHEMICAL_GROUPS.length; i++) {
    if (METHOD_CHEMICAL_GROUPS[i].some(kw => userContext.includes(kw))) {
      userGroupIndices.add(i);
    }
  }
  if (userGroupIndices.size === 0) return items;

  // Identify which broad categories (ion pair, modifier) user's chemicals belong to
  // Ion pair indices: 0-4, Modifier indices: 1,5-9 (TFA is in both)
  const ionPairRange = [0, 1, 2, 3, 4];
  const userHasIonPair = ionPairRange.some(i => userGroupIndices.has(i));

  return items.filter(item => {
    const lower = item.toLowerCase();

    // Check if item mentions a chemical from a group the user did NOT specify
    for (let i = 0; i < METHOD_CHEMICAL_GROUPS.length; i++) {
      if (userGroupIndices.has(i)) continue; // user uses this chemical, it's fine

      const mentioned = METHOD_CHEMICAL_GROUPS[i].some(kw => lower.includes(kw));
      if (!mentioned) continue;

      // If user has an ion pair and this item mentions a DIFFERENT ion pair,
      // filter it out — ANY mention of an irrelevant chemical is a contradiction
      if (userHasIonPair && ionPairRange.includes(i)) {
        const userIonPair = ionPairRange.find(idx => userGroupIndices.has(idx));
        const userChemName = userIonPair !== undefined ? METHOD_CHEMICAL_GROUPS[userIonPair][0] : 'user-specified';
        const itemChemName = METHOD_CHEMICAL_GROUPS[i][0];
        flags.push(`Removed: "${item.substring(0, 80)}..." — mentions ${itemChemName} but user's method uses ${userChemName}`);
        return false;
      }

      // For non-ion-pair chemicals: filter if the item recommends actions involving an irrelevant chemical
      const itemChemName = METHOD_CHEMICAL_GROUPS[i][0];
      if (lower.includes('switch') || lower.includes('replace') || lower.includes('from ' + itemChemName) ||
          lower.includes(itemChemName + ' concentration') || lower.includes(itemChemName + ' >') ||
          lower.includes('reduce ' + itemChemName) || lower.includes('increase ' + itemChemName)) {
        flags.push(`Removed: "${item.substring(0, 80)}..." — mentions ${itemChemName} which is not in user's method`);
        return false;
      }
    }

    return true;
  });
}

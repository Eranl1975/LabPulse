import Anthropic from '@anthropic-ai/sdk';
import type { RankedAnswer } from './types';
import type { RankingQuery } from '@/agents/ranking/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert analytical chemistry and materials characterisation instrument troubleshooter with deep knowledge across:

Separation techniques: HPLC, UHPLC, LCMS, GC, GCMS, IC (Ion Chromatography — Dionex/Thermo ICS series), CE, SFC
LC-MS instrument types and single-quadrupole specifics: single quadrupole — Agilent 6120B/6125B/6130B/6135B Compact LC/MSD (MassHunter, autotune, SIM vs scan sensitivity, fragmentor voltage optimisation, ESI capillary cleaning); Waters QDa Mass Detector / QDa Performance Mass Detector / Xevo SQ Detector 2 (MassLynx, cone voltage optimisation, leucine enkephalin system suitability); triple quadrupole — Agilent 6460/6470/6495/6495C, Waters Xevo TQ-S/TQ-XS/TQ-S micro, SCIEX QTRAP 4500/5500/6500+/Triple Quad 5500+/6500+, Shimadzu LCMS-8045/8060/8060NX, Thermo Fisher TSQ Altis/Altis Plus/Quantis; Q-TOF/high-resolution — Agilent 6530/6545/6546/6560 Ion Mobility, Waters Xevo G2-XS/G3 QTof/Synapt XS/SELECT SERIES Cyclic IMS, SCIEX TripleTOF 6600+/ZenoTOF 7600, Thermo Fisher Q Exactive/Q Exactive Plus/HF/Orbitrap Exploris 480/Orbitrap Astral; key LCMS issues: ESI source contamination, cone/fragmentor voltage optimisation, adduct formation (Na+/K+/NH4+ — eliminate glass containers, reduce buffer concentration, increase fragmentor/cone voltage), SIM vs full-scan sensitivity trade-off, in-source CID, ion suppression, carryover, mobile phase MS compatibility (avoid non-volatile buffers)
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
- Established laboratory best practices, ISO standards, and QC guidelines (USP, Ph. Eur., ICH Q6A, ISO 13320)

Rules:
- ALWAYS provide actionable, specific answers — never say "insufficient information"
- If details are missing, assume the most common scenario for that technique and issue
- Exclude steps already tried (listed under "already_checked")`;

// Tool definition for structured output — eliminates JSON parse failures
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

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

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

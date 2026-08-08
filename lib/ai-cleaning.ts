import Anthropic from '@anthropic-ai/sdk';
import type { CleaningProcedureContent } from './cleaning-types';

// Shared lazy client — same pattern as ai-fallback.ts
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are an expert analytical instrument maintenance specialist with deep knowledge of cleaning procedures for all major laboratory instruments.

Your knowledge spans official manufacturer documentation including:
- Agilent (HPLC, UHPLC, LCMS, GC, GCMS, CE, SFC, PrepLC — user manuals, maintenance guides, MassHunter documentation)
- Waters (ACQUITY UPLC/HPLC, QDa, Xevo, Synapt — care and use manuals, MassLynx documentation)
- Thermo Fisher Scientific (Vanquish, TSQ, Orbitrap, ISQ, UltiMate 3000, Trace GC, Phenom SEM, TEM — operator manuals)
- Shimadzu (Prominence, Nexera, LCMS-8060, GCMS-QP series — user guides)
- SCIEX (QTRAP, TripleTOF, ZenoTOF — maintenance guides)
- Bruker (XRD D8 series, NMR Avance Neo, Raman Senterra — operator manuals)
- TA Instruments (Discovery TGA/DSC, Q-series — operator guides, TA-100 series tech notes)
- NETZSCH (TG 209, DSC 200/214/300 — operator manuals)
- Mettler Toledo (TGA/DSC, Karl Fischer, Titration — operating instructions)
- PerkinElmer (Clarus GC, TGA/DSC, STA — user manuals)
- Cytiva (ÄKTA avant/pure/start, UNICORN — system administration manuals)
- CSBio / CEM Corporation / Biotage (SPPS synthesizers — operator manuals)
- Metrohm (Titrando, KF Titrino, Oven Sample Processor — operator instructions)
- Malvern Panalytical (Zetasizer, OMNISEC, Empyrean XRD — user manuals)
- JASCO (J-1500/J-1700 CD spectrometers — hardware manuals)
- Denton Vacuum (Desk V/VI sputter coaters — operator manuals)
- Micromeritics (ASAP 2020/2460, Gemini, TriStar — operator manuals)
- Wyatt Technology (DAWN, Optilab — maintenance guides)
- JEOL (TEM JEM series, NMR ECZ series — operator manuals)
- Hitachi (TEM HT series — operator manuals)
- Renishaw / HORIBA (Raman spectrometers — maintenance guides)
- KNAUER (AZURA HPLC/UHPLC/FPLC/PrepLC — operator manuals)
- And any other analytical instrument manufacturer.

Your task: Generate a comprehensive, practical cleaning procedure for the specified instrument.

CRITICAL RULES:
1. Assess your source type honestly:
   - "official_manufacturer": Use ONLY when your procedure closely follows specific manufacturer manual instructions you are confident exist (e.g., Agilent 1260 column care from the 1260 User Manual, Waters QDa cleaning from the QDa Care and Use Manual).
   - "manufacturer_documentation": Use when your procedure is partially based on known manufacturer recommendations but includes general best practices.
   - "ai_generated": Use when you are generating a procedure based on general analytical chemistry knowledge without specific manufacturer manual recall.

2. NEVER invent or hallucinate:
   - URLs or links to documents
   - Specific manual names, document numbers, or part numbers you are not confident about
   - Manufacturer bulletin numbers
   - Page numbers
   Set source_url to null and source_title to null if you cannot cite a specific real document with certainty.

3. Be conservative and safety-focused:
   - Do NOT include service-engineer-only procedures
   - Do NOT include high-voltage servicing, laser servicing, or radiation-source servicing
   - Do NOT include opening sealed modules or dangerous vacuum operations
   - If a step requires certified manufacturer service, state: "Contact an authorized manufacturer service engineer."

4. Be instrument-specific when possible:
   - Tailor solvents, tools, and materials to the specific instrument type
   - Include instrument-specific warnings (e.g., ESI source cleaning differs from APCI)
   - Reference specific components by their actual names used by the manufacturer

5. The "what_not_to_do" section must contain 3-8 instrument-specific warnings.
   - These must be real, meaningful hazards — not generic filler.

CONCISENESS RULES:
- Keep each step description to 1-3 sentences maximum.
- Limit cleaning_steps to 8-12 steps.
- Keep materials_needed to 6-10 items.
- Keep what_not_to_do to 3-6 items.
- Keep safety_warnings to 3-5 items.
- Keep notes to 2-4 items.
- Total JSON response MUST be under 5000 characters.

Return ONLY a raw JSON object — no markdown code fences, no explanation before or after, JUST the JSON object starting with { and ending with }.

Schema:

{
  "instrument": string,
  "manufacturer": string,
  "model": string,
  "source_type": "official_manufacturer" | "manufacturer_documentation" | "ai_generated",
  "source_label": string,
  "source_url": string | null,
  "source_title": string | null,
  "confidence": number,
  "confidence_note": string,
  "materials_needed": [{ "name": string, "specification": string or null, "purpose": string }],
  "before_cleaning": [string],
  "cleaning_steps": [{ "step_number": number, "title": string, "description": string, "duration": string or null, "warnings": [string] or null }],
  "after_cleaning": [string],
  "what_not_to_do": [string],
  "cleaning_frequency": { "routine": string, "after_contamination": string, "preventive": string },
  "safety_warnings": [string],
  "notes": [string]
}

source_label values:
- "Official Manufacturer Procedure" for official_manufacturer
- "Manufacturer Documentation - Procedure Extracted or Summarized" for manufacturer_documentation
- "AI-Generated Cleaning Procedure" for ai_generated`;

// Confidence threshold below which we escalate from Sonnet to Opus
// (same pattern as ai-fallback.ts)
const OPUS_ESCALATION_THRESHOLD = 0.5;

async function callModel(
  modelId: string,
  userMessage: string,
): Promise<{ parsed: Partial<CleaningProcedureContent>; modelUsed: string }> {
  console.log(`[ai-cleaning] Calling ${modelId}...`);

  const message = await getClient().messages.create({
    model: modelId,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  console.log(`[ai-cleaning] ${modelId} responded, length=${text.length}, stop_reason=${message.stop_reason}`);

  let parsed: Partial<CleaningProcedureContent> = {};
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .trim();

    // Find the outermost balanced JSON object
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) throw new Error('No JSON object found in response');

    let depth = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;
    for (let i = startIdx; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
    }

    if (endIdx === -1) throw new Error('Unbalanced JSON in response');
    parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    console.log(`[ai-cleaning] Parsed OK, source_type=${parsed.source_type}, confidence=${parsed.confidence}`);
  } catch (parseErr) {
    console.error('[ai-cleaning] JSON parse error:', parseErr);
    console.error('[ai-cleaning] Raw response (first 800 chars):', text.slice(0, 800));
    // Graceful degradation — same as ai-fallback.ts: return partial result
    parsed = {
      notes: ['AI response could not be parsed. Please try again or consult the manufacturer manual directly.'],
    };
  }

  return { parsed, modelUsed: modelId };
}

/**
 * Generate a cleaning procedure via AI — follows the same pattern as
 * aiAnswerFallback() in ai-fallback.ts:
 *   1. Try Sonnet first (fast, cost-efficient)
 *   2. If Sonnet confidence < 0.5, escalate to Opus
 *   3. Use Opus result only if it has equal or higher confidence
 *   4. Never throw — always return a result (even if degraded)
 */
export async function generateCleaningProcedure(
  technique: string,
  vendor?: string | null,
  model?: string | null,
): Promise<{ content: CleaningProcedureContent; modelUsed: string }> {
  const lines: string[] = [
    `Generate a comprehensive cleaning procedure for the following analytical instrument:`,
    ``,
    `Technique: ${technique}`,
  ];
  if (vendor) lines.push(`Manufacturer/Vendor: ${vendor}`);
  if (model)  lines.push(`Model: ${model}`);
  if (!vendor && !model) {
    lines.push(``, `No specific manufacturer or model provided. Generate a generic cleaning procedure appropriate for this instrument category.`);
  }

  const userMessage = lines.join('\n');

  // ── Sonnet first, then Opus escalation (same as ai-fallback.ts) ─────────
  let { parsed, modelUsed } = await callModel('claude-sonnet-4-6', userMessage);

  const sonnetConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
  if (sonnetConfidence < OPUS_ESCALATION_THRESHOLD) {
    console.log(`[ai-cleaning] Sonnet confidence ${sonnetConfidence} < ${OPUS_ESCALATION_THRESHOLD}, escalating to Opus...`);
    try {
      const opusResult = await callModel('claude-opus-4-6', userMessage);
      const opusConfidence = typeof opusResult.parsed.confidence === 'number' ? opusResult.parsed.confidence : 0.5;
      if (opusConfidence >= sonnetConfidence) {
        parsed = opusResult.parsed;
        modelUsed = opusResult.modelUsed;
      }
    } catch (opusErr) {
      // Opus escalation failure is non-fatal — keep Sonnet result
      console.error('[ai-cleaning] Opus escalation failed, using Sonnet result:', opusErr);
    }
  }

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : [];

  const content: CleaningProcedureContent = {
    instrument:       typeof parsed.instrument === 'string' ? parsed.instrument : technique,
    manufacturer:     typeof parsed.manufacturer === 'string' ? parsed.manufacturer : (vendor ?? 'Generic'),
    model:            typeof parsed.model === 'string' ? parsed.model : (model ?? 'General'),
    source_type:      (parsed.source_type === 'official_manufacturer' || parsed.source_type === 'manufacturer_documentation')
                        ? parsed.source_type : 'ai_generated',
    source_label:     typeof parsed.source_label === 'string' ? parsed.source_label : 'AI-Generated Cleaning Procedure',
    source_url:       typeof parsed.source_url === 'string' ? parsed.source_url : null,
    source_title:     typeof parsed.source_title === 'string' ? parsed.source_title : null,
    confidence:       typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    confidence_note:  typeof parsed.confidence_note === 'string' ? parsed.confidence_note : '',
    materials_needed: Array.isArray(parsed.materials_needed)
      ? parsed.materials_needed.map((m: unknown) => {
          const item = m as Record<string, unknown>;
          return {
            name:          typeof item.name === 'string' ? item.name : '',
            specification: typeof item.specification === 'string' ? item.specification : undefined,
            purpose:       typeof item.purpose === 'string' ? item.purpose : '',
          };
        })
      : [],
    before_cleaning:  arr(parsed.before_cleaning),
    cleaning_steps:   Array.isArray(parsed.cleaning_steps)
      ? parsed.cleaning_steps.map((s: unknown, i: number) => {
          const step = s as Record<string, unknown>;
          return {
            step_number: typeof step.step_number === 'number' ? step.step_number : i + 1,
            title:       typeof step.title === 'string' ? step.title : `Step ${i + 1}`,
            description: typeof step.description === 'string' ? step.description : '',
            duration:    typeof step.duration === 'string' ? step.duration : undefined,
            warnings:    Array.isArray(step.warnings) ? step.warnings.filter((w): w is string => typeof w === 'string') : undefined,
          };
        })
      : [],
    after_cleaning:   arr(parsed.after_cleaning),
    what_not_to_do:   arr(parsed.what_not_to_do),
    cleaning_frequency: (() => {
      const cf = parsed.cleaning_frequency as unknown as Record<string, unknown> | undefined;
      return {
        routine:             typeof cf?.routine === 'string' ? cf.routine : 'Consult manufacturer manual.',
        after_contamination: typeof cf?.after_contamination === 'string' ? cf.after_contamination : 'Clean immediately after suspected contamination.',
        preventive:          typeof cf?.preventive === 'string' ? cf.preventive : 'Follow manufacturer preventive maintenance schedule.',
      };
    })(),
    safety_warnings:  arr(parsed.safety_warnings),
    notes:            arr(parsed.notes),
  };

  return { content, modelUsed };
}

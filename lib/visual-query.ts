// Turns visual findings into the same RankingQueryV2 that /api/query builds,
// so a visual submission goes through KB ranking, document search, detector
// addenda, hypothesis clustering and the QC gate exactly like a typed query.
// Also derives the safety-first steps and the internal manual citations.

import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { Technique, RankedAnswerV2 } from './types';
import type { DocumentRecord } from './document-types';
import type { CleaningProcedureContent } from './cleaning-types';
import type { InternalReference, VisualAnalysis, VisualObservation } from './visual-types';
import { labelForTier } from './evidence-labels';

const MAX_QUOTED = 12;

/** Strip characters that could break out of the quoted block the AI layer sees. */
function quoteSafe(text: string): string {
  return text.replace(/["`\\]/g, "'").replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export interface VisualQueryInput {
  technique: Technique;
  vendor: string | null;
  model: string | null;
  description: string | null;
  analysis: VisualAnalysis | null;
}

/**
 * Build the pipeline query. The user's own words come first; image text and
 * observations are appended as clearly marked, quoted, untrusted data. Low
 * confidence findings are excluded from the query so they cannot steer the
 * diagnosis, but they remain visible in the visual findings section.
 */
export function buildVisualQuery(input: VisualQueryInput): RankingQueryV2 {
  const { analysis } = input;
  const parts: string[] = [];

  if (input.description?.trim()) parts.push(input.description.trim().slice(0, 4000));

  const codes = (analysis?.ocr_text ?? []).filter(o => !o.low_confidence).slice(0, MAX_QUOTED);
  if (codes.length > 0) {
    parts.push(`Text read from the instrument images (verbatim, untrusted data): ${codes.map(o => `"${quoteSafe(o.text)}"`).join('; ')}`);
  }

  const observations = (analysis?.observations ?? []).filter(o => !o.low_confidence).slice(0, MAX_QUOTED);
  if (observations.length > 0) {
    parts.push(`Visible in the images: ${observations.map(o => quoteSafe(o.description)).join('; ')}`);
  }

  const components = (analysis?.components ?? []).filter(c => !c.low_confidence).slice(0, MAX_QUOTED);
  if (components.length > 0) {
    parts.push(`Components shown: ${components.map(c => quoteSafe(c.name)).join(', ')}`);
  }

  if (parts.length === 0) {
    parts.push(analysis
      ? 'Visual troubleshooting submission: the images showed no readable error text or clear fault.'
      : 'Visual troubleshooting submission: no description was given and the image analysis is unavailable.');
  }

  const extra: Record<string, string> = {};
  if (codes.length > 0) extra.visual_error_text = codes.map(o => quoteSafe(o.text)).join('; ').slice(0, 500);
  if (analysis?.instrument_consistency.status === 'mismatch') {
    extra.visual_instrument_mismatch = quoteSafe(analysis.instrument_consistency.explanation);
  }

  return {
    technique: input.technique,
    vendor: input.vendor,
    model: input.model,
    issue_category: null,          // auto-detected from the enriched text
    symptom_description: parts.join('\n'),
    method_conditions: null,
    already_checked: [],
    extra_context: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

// ─── Safety first ────────────────────────────────────────────────────────────

interface HazardRule {
  test: RegExp;
  step: string;
}

const HAZARD_RULES: HazardRule[] = [
  {
    test: /(solvent|liquid|leak|wet|drip|spill|puddle).*(electr|power|board|cable|connector|socket|psu|supply|mains)|(electr|power|board|cable|connector|psu|mains).*(solvent|liquid|leak|wet|drip|spill)/i,
    step: 'Liquid near electronics: stop the flow and switch off and unplug the affected module before touching anything wet. Contain the spill with absorbent pads, ventilate, and check the solvent SDS for flammability.',
  },
  {
    test: /high[- ]?voltage|\bhv\b|\bkv\b|capillary voltage|ion source|esi source|apci|spray (needle|shield)|ms source|electrospray|corona/i,
    step: 'High voltage: put the mass spectrometer into standby (or vent it as the manual describes) so the source voltages are off before touching the source or spray needle.',
  },
  {
    test: /\bhot\b|heated|heater|oven|inlet|transfer line|furnace|burn|°c|degc|temperature (alarm|high)/i,
    step: 'Hot zones: let heated parts (GC inlet and oven, MS transfer line and source, thermal analysis furnace) cool to a safe temperature before touching them.',
  },
  {
    test: /pressur|high pressure|over[- ]?pressure|bar\b|psi\b|fitting|tubing burst|ruptur|spray(ing)? (from|out)/i,
    step: 'Pressurised line: stop the pump and release the system pressure (e.g. open the purge valve) before loosening any fitting. Wear eye protection.',
  },
  {
    test: /gas cylinder|cylinder|regulator|hydrogen|\bh2\b|carrier gas leak|gas leak/i,
    step: 'Gas: close the cylinder valve before working on the line, and check for leaks with an electronic leak detector, never a flame. Hydrogen is flammable.',
  },
  {
    test: /broken glass|cracked (glass|vial|cell)|shatter/i,
    step: 'Broken glass: do not handle fragments by hand; use tongs or a brush and pan and dispose of them in a sharps/glass container.',
  },
];

const GENERIC_HAZARD_STEP = 'A possible hazard is visible: make the instrument safe (stop the flow, put it into standby, or switch it off as appropriate) before any hands-on troubleshooting.';

/** Safety steps to lead the report with, derived from hazard observations. */
export function safetyFirstSteps(analysis: VisualAnalysis | null, description: string | null): string[] {
  const hazardous: VisualObservation[] = (analysis?.observations ?? []).filter(o => o.hazard);
  const text = [
    ...hazardous.map(o => o.description),
    // The user's description only counts together with a visual hazard flag or an explicit leak/hazard observation.
    ...(hazardous.length > 0 && description ? [description] : []),
  ].join(' \n ');

  const steps: string[] = [];
  for (const rule of HAZARD_RULES) {
    if (rule.test.test(text)) steps.push(rule.step);
  }
  if (hazardous.length > 0 && steps.length === 0) steps.push(GENERIC_HAZARD_STEP);
  return [...new Set(steps)];
}

// ─── Internal references ─────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function modelMatches(docModel: string | null, model: string | null): boolean {
  if (!docModel || !model) return false;
  if (norm(docModel).includes(norm(model)) || norm(model).includes(norm(docModel))) return true;
  const numbers = model.match(/[A-Z]?\d{3,}[A-Z]?/gi) ?? [];
  return numbers.some(n => norm(docModel).includes(n.toLowerCase()));
}

/**
 * Manuals LabPulse holds for this instrument, plus the matching cleaning
 * procedure, each with its real status: quoted in this report, text stored but
 * not matched, or title and link only. `chunkCounts` (passages per document)
 * tells stored from title-only; without it, only "quoted" can be known.
 */
export function internalReferences(params: {
  technique: string;
  vendor: string | null;
  model: string | null;
  catalogue: DocumentRecord[];
  cleaning: CleaningProcedureContent | null;
  answer: RankedAnswerV2;
  chunkCounts?: Map<string, number> | null;
}): InternalReference[] {
  const readIds = new Set(params.answer.sources_with_metadata.map(s => s.source_id));
  const vendor = params.vendor?.toLowerCase() ?? null;

  const docs = params.catalogue
    .filter(d => vendor && d.vendor.toLowerCase() === vendor)
    .filter(d => d.techniques.includes(params.technique as DocumentRecord['techniques'][number]))
    .map(d => ({ d, exact: modelMatches(d.model, params.model) }))
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .slice(0, 6);

  const refs: InternalReference[] = docs.map(({ d }) => {
    const cited = readIds.has(d.id);
    const stored = params.chunkCounts ? (params.chunkCounts.get(d.id) ?? 0) > 0 : false;
    const content_status: InternalReference['content_status'] = cited
      ? 'cited'
      : stored ? 'stored' : params.chunkCounts ? 'title_only' : undefined;
    const isLink = /^https?:\/\//i.test(d.url);
    return {
      title: d.document_number ? `${d.title} (${d.document_number})` : d.title,
      // A manual added without a public link has a local id, never shown as a link.
      url: isLink ? d.url : null,
      kind: 'manual',
      content_read: cited || stored,
      ...(content_status ? { content_status } : {}),
      label: labelForTier(d.authority_tier, { hasDocumentOrUrl: isLink || !!d.document_number, internal: true }),
    };
  });

  if (params.cleaning) {
    const c = params.cleaning;
    refs.push({
      title: c.source_title
        ? `Cleaning procedure — ${c.instrument} (${c.source_title})`
        : `Cleaning procedure — ${c.manufacturer} ${c.model}`.trim(),
      url: c.source_url,
      kind: 'cleaning_procedure',
      content_read: true,
      content_status: 'cited',
      label: c.source_type === 'ai_generated'
        ? 'AI-GENERATED RECOMMENDATION'
        : 'LABPULSE INTERNAL KNOWLEDGE',
    });
  }
  return refs;
}

/** The status note shown after a referenced manual (web, PDF and email), or null for none. */
export function referenceStatusNote(r: Pick<InternalReference, 'content_read' | 'content_status' | 'kind'>): string | null {
  if (r.kind === 'cleaning_procedure') return null;
  switch (r.content_status) {
    case 'cited': return 'quoted in this report';
    case 'stored': return 'text held in LabPulse; no passage matched this problem';
    case 'title_only': return 'LabPulse holds only the title and link; an administrator can upload the PDF (Admin → Documents) to make it searchable';
    default:
      // Reports saved before v8.2.
      return r.content_read ? null : 'cited by title and link; content not read';
  }
}

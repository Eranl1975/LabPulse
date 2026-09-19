// Rule-based extraction of symptom → cause → action triples from vendor text.
// Produces the ExtractedItem shape the existing pipeline already scores,
// deduplicates and persists. Anything that cannot be parsed confidently is
// dropped rather than guessed.

import type { ExtractedItem } from '../types';
import type { DocumentChunk, DocType } from '@/lib/document-types';
import type { Technique, Severity } from '@/lib/types';

export interface TroubleshootingSourceMeta {
  source_id: string;
  source_type: 'vendor' | 'scientific' | 'community';
  source_title: string;
  source_url: string;
  publication_date: string | null;
  fetched_at: string;
  vendor: string;
  instrument_family: string | null;
  model: string | null;
  techniques: Technique[];
  doc_type: DocType;
}

const CAUSE_LABELS  = /^(possible|probable|likely|potential)?\s*causes?\b|^reason\b|^root cause\b/i;
const ACTION_LABELS = /^(corrective\s+)?actions?\b|^(recommended\s+)?solutions?\b|^remed(y|ies)\b|^fix\b|^correction\b|^what to do\b/i;
const CHECK_LABELS  = /^(diagnostic\s+)?checks?\b|^diagnos(is|tics?)\b|^verify\b|^test\b|^inspect\b/i;
const SYMPTOM_LABELS = /^symptoms?\b|^problems?\b|^issues?\b|^condition\b|^observation\b|^fault\b/i;

const SEVERITY_HINTS: Array<[Severity, RegExp]> = [
  ['critical', /\b(damage|hazard|injur|fire|explos|irreversible|do not operate)\b/i],
  ['high',     /\b(stop|shut ?down|leak|overpressure|contaminat|fail(ure|ed)|unsafe)\b/i],
  ['low',      /\b(cosmetic|minor|informational|no action)\b/i],
];

/**
 * Extract troubleshooting entries from a document's chunks.
 * `maxItems` caps how much one document may contribute in a single run.
 */
export function extractTroubleshootingItems(
  chunks: DocumentChunk[],
  meta: TroubleshootingSourceMeta,
  maxItems = 40,
): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    if (items.length >= maxItems) break;

    const parsed = parseChunk(chunk);
    if (!parsed) continue;

    const key = parsed.symptom.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);

    const technique = meta.techniques[0];
    if (!technique) continue;

    items.push({
      technique,
      instrument_family: meta.instrument_family ?? 'generic',
      model: meta.model,
      issue_category: deriveIssueCategory(parsed.symptom),
      symptom: parsed.symptom,
      likely_causes: parsed.causes,
      diagnostics: parsed.checks,
      corrective_actions: parsed.actions,
      severity: deriveSeverity(`${parsed.symptom} ${parsed.actions.join(' ')}`),
      escalation_conditions: parsed.escalations,
      tags: buildTags(meta, chunk),
      source_id: meta.source_id,
      source_type: meta.source_type,
      source_title: meta.source_title,
      source_url: chunk.page_number ? `${meta.source_url}#page=${chunk.page_number}` : meta.source_url,
      publication_date: meta.publication_date,
      fetched_at: meta.fetched_at,
    });
  }

  return items;
}

interface ParsedChunk {
  symptom: string;
  causes: string[];
  checks: string[];
  actions: string[];
  escalations: string[];
}

/**
 * A chunk qualifies only if it names a symptom AND at least one cause or action.
 * Vendor guides express these as labelled lines or as "Symptom | Cause | Action" tables.
 */
function parseChunk(chunk: DocumentChunk): ParsedChunk | null {
  const lines = chunk.text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const causes: string[] = [];
  const checks: string[] = [];
  const actions: string[] = [];
  const escalations: string[] = [];
  let symptom = '';
  let bucket: 'cause' | 'check' | 'action' | null = null;

  for (const line of lines) {
    const { label, rest } = splitLabel(line);

    if (label && SYMPTOM_LABELS.test(label)) {
      if (!symptom && rest) symptom = clean(rest);
      bucket = null;
      continue;
    }
    if (label && CAUSE_LABELS.test(label)) {
      bucket = 'cause';
      if (rest) causes.push(...splitItems(rest));
      continue;
    }
    if (label && CHECK_LABELS.test(label)) {
      bucket = 'check';
      if (rest) checks.push(...splitItems(rest));
      continue;
    }
    if (label && ACTION_LABELS.test(label)) {
      bucket = 'action';
      if (rest) actions.push(...splitItems(rest));
      continue;
    }

    if (/\b(contact|call)\s+(your\s+)?(agilent|waters|thermo|shimadzu|sciex|service|support|field engineer)/i.test(line)) {
      escalations.push(clean(line));
      continue;
    }

    const bullet = stripBullet(line);
    if (bullet && bucket) {
      const target = bucket === 'cause' ? causes : bucket === 'check' ? checks : actions;
      target.push(clean(bullet));
      continue;
    }

    if (!symptom && isSymptomSentence(line)) symptom = clean(line);
  }

  // Fall back to the chunk heading as the symptom when the body did not label one.
  if (!symptom && chunk.heading && isSymptomSentence(chunk.heading)) {
    symptom = clean(chunk.heading);
  }

  if (!symptom || symptom.length < 12) return null;
  if (causes.length === 0 && actions.length === 0) return null;

  return {
    symptom,
    causes: dedupe(causes).slice(0, 8),
    checks: dedupe(checks).slice(0, 8),
    actions: dedupe(actions).slice(0, 8),
    escalations: dedupe(escalations).slice(0, 4),
  };
}

function splitLabel(line: string): { label: string | null; rest: string } {
  const m = line.match(/^([A-Za-z][A-Za-z \t]{2,40}?)\s*[:–—-]\s*(.*)$/);
  if (!m) return { label: null, rest: line };
  return { label: m[1].trim(), rest: m[2].trim() };
}

function splitItems(text: string): string[] {
  return text
    .split(/\s*(?:;|·|•|•|\s\|\s)\s*/)
    .map(clean)
    .filter(s => s.length > 3);
}

function stripBullet(line: string): string | null {
  const m = line.match(/^(?:[-*••●]|\d+[.)]|[a-z][.)])\s+(.*)$/i);
  return m ? m[1].trim() : null;
}

function isSymptomSentence(line: string): boolean {
  if (line.length < 12 || line.length > 200) return false;
  return /\b(no|low|high|poor|loss of|excess|unstable|noisy|drift|shift|tailing|broad|split|ghost|carryover|leak|error|fail|not\s+\w+|incorrect|unexpected)\b/i
    .test(line);
}

function deriveIssueCategory(symptom: string): string {
  const CATEGORIES: Array<[string, RegExp]> = [
    ['high backpressure',   /\b(back)?pressure\b/i],
    ['retention time shift',/\bretention (time )?(shift|drift)|\brt (shift|drift)/i],
    ['peak tailing',        /\btailing\b/i],
    ['peak broadening',     /\bbroaden|\bbroad peak/i],
    ['baseline noise',      /\bbaseline\b|\bnoise\b|\bdrift\b/i],
    ['sensitivity loss',    /\bsensitivit|\blow (signal|response|intensity)|\bsignal loss/i],
    ['carryover',           /\bcarry ?over\b|\bghost peak/i],
    ['leak',                /\bleak\b/i],
    ['contamination',       /\bcontaminat/i],
    ['instrument error',    /\berror\b|\bfault\b|\bcode\b/i],
    ['reproducibility',     /\breproducib|\brsd\b|\bprecision\b/i],
  ];
  for (const [category, pattern] of CATEGORIES) {
    if (pattern.test(symptom)) return category;
  }
  return 'general troubleshooting';
}

function deriveSeverity(text: string): Severity {
  for (const [severity, pattern] of SEVERITY_HINTS) {
    if (pattern.test(text)) return severity;
  }
  return 'medium';
}

function buildTags(meta: TroubleshootingSourceMeta, chunk: DocumentChunk): string[] {
  const tags = new Set<string>([meta.vendor.toLowerCase(), meta.doc_type]);
  for (const t of meta.techniques) tags.add(t.toLowerCase());
  if (chunk.heading) tags.add('sectioned');
  return [...tags];
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/^[\s:;,.-]+|[\s;,]+$/g, '').trim();
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

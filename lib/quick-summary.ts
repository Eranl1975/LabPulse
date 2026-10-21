// Quick Summary: a short view of one troubleshooting analysis.
//
// It is derived field by field from the same validated RankedAnswerV2 the
// Detailed Analysis renders, so both views always describe the same analysis,
// switching between them costs no API call, and a saved report (or a report
// saved before this view existed) can be summarised later. It selects and
// ranks; it never writes new findings. Every line comes from a field of the
// answer, and every source keeps the evidence label of lib/evidence-labels.ts.
//
// Pure and dependency-free so the browser, the PDF and the email share it.

import type { RankedAnswer, RankedAnswerV2, Hypothesis } from './types';
import type { EvidenceLabel } from './visual-types';
import { labelForSource, labelForGeneration } from './evidence-labels';

export type ResponseFormat = 'summary' | 'detailed';

export const RESPONSE_FORMATS: readonly { key: ResponseFormat; label: string; desc: string }[] = [
  { key: 'summary', label: 'Quick Summary', desc: 'Problem, likely causes, first actions and warnings (about 150–250 words)' },
  { key: 'detailed', label: 'Detailed Analysis', desc: 'The full report: every hypothesis, diagnostic, action, reference and precaution' },
];

/** Default is the Detailed Analysis, the behaviour before this option existed. */
export const DEFAULT_RESPONSE_FORMAT: ResponseFormat = 'detailed';

export function isResponseFormat(v: unknown): v is ResponseFormat {
  return v === 'summary' || v === 'detailed';
}

export interface SummaryCause {
  text: string;
  probability: Hypothesis['probability'] | null;
  confirmed: boolean;
  /** Further causes the same diagnostic test separates (v7 clustering). */
  related: number;
}

export interface SummaryAction {
  text: string;
  kind: 'check' | 'fix' | 'info';
}

export interface SummarySource {
  title: string;
  url: string | null;
  label: EvidenceLabel;
}

export interface QuickSummary {
  problem: string;
  /** What the image analysis saw (visual reports only). */
  observed: string | null;
  /** e.g. "Preliminary hypothesis — 50%". */
  assessment: string;
  /** AI-unavailable and fallback notices. Never dropped from the summary. */
  notices: string[];
  causes: SummaryCause[];
  actions: SummaryAction[];
  warnings: string[];
  escalate: string | null;
  sources: SummarySource[];
  /** How the recommendations were produced, as one evidence label. */
  recommendations_label: EvidenceLabel;
  missing_info: string[];
  /** What the Detailed Analysis holds beyond this summary. */
  omitted: { causes: number; actions: number; warnings: number; sources: number };
  word_count: number;
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Whole sentences from the start, up to maxWords; always at least one sentence. */
export function leadingSentences(text: string, maxWords: number): string {
  const sentences = text.trim().match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map(s => s.trim()).filter(Boolean) ?? [];
  if (sentences.length === 0) return text.trim();
  let out = sentences[0];
  for (const s of sentences.slice(1)) {
    if (words(out) + words(s) > maxWords) break;
    out += ` ${s}`;
  }
  return out;
}

/** A qualifier holding any of these is never dropped when a step is shortened. */
const KEEP_QUALIFIER = /\b(never|not|don'?t|avoid|before|after|until|only|unless|caution|warning|safety|danger|hazard|depressuri[sz]e|power(?:ed)? off|unplug|switch off|cool|hot|burn|voltage|hydrogen|flammab|toxic|ventilat|glove|eye protection|pressur)/i;

/**
 * Shorten a long step at its first clause break (" — ", "; ", or a sentence
 * end), but only when the part dropped carries no warning, condition or
 * negation. Otherwise the step is kept whole: a summary may be less detailed,
 * never less safe. Never cuts inside a clause.
 */
export function shortenStep(text: string, maxWords = 32): string {
  const t = text.trim();
  if (words(t) <= maxWords) return t;
  const m = /\s+—\s+|;\s+|(?<=[.!?])\s+(?=[A-Z])/.exec(t);
  if (!m) return t;
  const head = t.slice(0, m.index).replace(/[:,]$/, '').trim();
  const tail = t.slice(m.index + m[0].length);
  if (words(head) < 4 || KEEP_QUALIFIER.test(tail)) return t;
  return /[.!?]$/.test(head) ? head : `${head}.`;
}

function norm(text: string): string {
  return text.toLowerCase().replace(/^safety:\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
}

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(i => {
    const k = key(i);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const SAFETY_TEXT = /^safety:|\b(depressuri[sz]e|pressuri[sz]ed|hydrogen|high voltage|electr(?:ic|ical|onics)|unplug|power (?:off|down)|switch off|uv radiation|eye ?wear|eye protection|glove|ventilat|fume hood|flammab|toxic|burn|hot (?:zone|surface)|heat-resistant|cool(?:s|ed)? (?:down|below)|liquid near|spill|cryogen|magnet|radiation|laser)\b/i;

function stripSafetyPrefix(text: string): string {
  return text.replace(/^SAFETY:\s*/i, '');
}

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []);
}

/** Same advice in other words: most of the shorter text's terms recur in the longer one. */
function nearDuplicate(x: string, y: string): boolean {
  const a = tokens(x), b = tokens(y);
  const small = Math.min(a.size, b.size);
  return small > 0 && overlap(a, b) / small >= 0.7;
}

function dropNearDuplicates<T>(items: T[], text: (t: T) => string): T[] {
  const kept: T[] = [];
  for (const item of items) if (!kept.some(k => nearDuplicate(text(k), text(item)))) kept.push(item);
  return kept;
}

/** Target length of the summary's content, from the product spec (150–250 words). */
export const SUMMARY_WORD_BUDGET = 250;

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

const LABEL_RANK: Record<EvidenceLabel, number> = {
  'OFFICIAL MANUFACTURER GUIDANCE': 0,
  'LABPULSE INTERNAL KNOWLEDGE': 1,
  'TECHNICAL / SCIENTIFIC SOURCE': 2,
  'AI-GENERATED RECOMMENDATION': 3,
};

const FIELD_NAMES: Record<string, string> = {
  hardware_config: 'hardware configuration',
  sample_matrix: 'sample matrix',
  mobile_phase: 'mobile phase',
  flow_rate: 'flow rate',
  injection_volume: 'injection volume',
  retention_time: 'retention time',
  ionization_mode: 'ionisation mode',
  source_params: 'source parameters',
  acquisition_mode: 'acquisition mode',
  recent_maintenance: 'recent maintenance',
  qc_results: 'QC results',
  raw_data: 'raw data',
  chromatographic_method: 'chromatographic method',
  expected_result: 'expected result',
  sst_data: 'system suitability data',
  sample_matrix_type: 'sample matrix type',
  method_transfer_source: 'method transfer source',
};

function confidenceLabel(c: number): string {
  if (c >= 0.95) return 'Confirmed';
  if (c >= 0.80) return 'Strongly supported';
  if (c >= 0.60) return 'Probable cause';
  if (c >= 0.40) return 'Preliminary hypothesis';
  return 'Insufficient evidence';
}

function contentDescription(source: string | undefined): string {
  switch (source) {
    case 'knowledge_base': return 'the LabPulse knowledge base';
    case 'generic_procedure': return 'a general best-practice procedure that is not instrument-specific';
    case 'knowledge_base+generic': return 'the LabPulse knowledge base and a general best-practice procedure';
    default: return 'LabPulse internal knowledge';
  }
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildQuickSummary(input: RankedAnswer | RankedAnswerV2): QuickSummary {
  const a = input as Partial<RankedAnswerV2> & RankedAnswer;
  const hypotheses = [...(a.hypotheses ?? [])].sort((x, y) => x.rank - y.rank);
  const vf = a.visual_findings;
  const gen = a.generation;

  // 1. Identified problem: the user's own statement (first line; later lines of a
  //    visual report restate the OCR and observations, summarised separately).
  const firstLine = (a.problem_summary ?? '').split('\n').find(l => l.trim()) ?? '';
  const problem = leadingSentences(firstLine, 40) || 'No problem description was provided.';

  let observed: string | null = null;
  if (vf?.analysis) {
    const parts: string[] = [];
    if (vf.analysis.summary) parts.push(leadingSentences(vf.analysis.summary, 30));
    const ocr = vf.analysis.ocr_text.find(o => !o.low_confidence && o.text.trim());
    if (ocr) parts.push(`Display reads: “${ocr.text.trim().slice(0, 120)}”.`);
    if (vf.analysis.instrument_consistency.status === 'mismatch') {
      parts.push(`Instrument mismatch: ${leadingSentences(vf.analysis.instrument_consistency.explanation, 20)}`);
    }
    observed = parts.join(' ') || null;
  }

  const pct = Math.round((a.confidence ?? 0) * 100);
  const assessment = `${a.confidence_breakdown?.label ?? confidenceLabel(a.confidence ?? 0)} — ${pct}%`;

  // AI status is never hidden: the pipeline's notice, every visual notice, and
  // an explicit line when the AI call failed and nothing else says so.
  const notices: string[] = [];
  if (gen?.notice) notices.push(gen.notice);
  for (const n of vf?.status.notices ?? []) notices.push(n);
  if (gen?.ai_status === 'error' && !notices.some(n => /\bAI\b|credit|billing/i.test(n))) {
    notices.push(
      `AI analysis unavailable${gen.ai_reason ? `: ${gen.ai_reason}` : ''}. ` +
      `This report is built from ${contentDescription(gen.content_source)} only; it has not been checked against manufacturer documentation by AI.`,
    );
  }

  // 2. Most likely causes: the ranked hypotheses, 2–3 of them.
  let causes: SummaryCause[];
  if (hypotheses.length > 0) {
    const top = hypotheses.slice(0, 3);
    if (top.length === 3 && top[2].probability === 'low' && top[0].probability !== 'low' && top[1].probability !== 'low') top.pop();
    causes = top.map(h => ({
      text: shortenStep(h.cause, 25),
      probability: h.probability,
      confirmed: h.status === 'confirmed',
      related: Math.max(0, (h.grouped_causes?.length ?? 0) - 1),
    }));
  } else {
    causes = (a.likely_causes ?? []).slice(0, 3).map(c => ({ text: shortenStep(c, 25), probability: null, confirmed: false, related: 0 }));
  }
  const totalCauses = Math.max(hypotheses.length, hypotheses.length ? 0 : (a.likely_causes ?? []).length);

  // 3. Recommended actions, 3–5: test the leading causes first, then fix.
  const checks = uniqueBy<SummaryAction>([
    hypotheses[0]?.diagnostic_test, a.immediate_checks?.[0], hypotheses[1]?.diagnostic_test, a.immediate_checks?.[1],
    ...(a.checks ?? []).slice(0, 2),
  ].filter((t): t is string => !!t?.trim()).map(t => ({ text: t.trim(), kind: 'check' })), x => norm(x.text));
  const fixes = uniqueBy<SummaryAction>((a.corrective_actions ?? []).filter(t => t?.trim()).map(t => ({ text: t.trim(), kind: 'fix' })), x => norm(x.text));
  const picked: SummaryAction[] = [...checks.slice(0, 2), ...fixes.slice(0, 2)];
  for (const extra of [checks[2], fixes[2], checks[3], fixes[3]]) {
    if (picked.length >= 5) break;
    if (extra) picked.push(extra);
  }
  if (picked.length < 3) {
    const followUps = a.missing_information?.follow_up_questions?.length ? a.missing_information.follow_up_questions : (a.next_questions ?? []);
    for (const q of followUps) {
      if (picked.length >= 3) break;
      picked.push({ text: q, kind: 'info' });
    }
  }
  const actions = dropNearDuplicates(uniqueBy(picked, x => norm(x.text)), x => x.text)
    .map(x => ({ ...x, text: x.kind === 'info' ? x.text : shortenStep(x.text) }));
  const totalActions = uniqueBy([...checks, ...fixes], x => norm(x.text)).length + (a.detector_checks ?? []).reduce((n, b) => n + b.checks.length, 0);

  // 4. Critical warnings: every safety-first step from the image analysis, then
  //    the true safety items (not stop conditions) most relevant to this problem.
  const context = tokens([problem, observed ?? '', ...causes.map(c => c.text), ...actions.map(x => x.text)].join(' '));
  const safetyFirst = vf?.safety_first ?? [];
  const candidates = dropNearDuplicates(uniqueBy((a.safety_warnings ?? []).filter(w => SAFETY_TEXT.test(w)), norm), w => w)
    .filter(w => !safetyFirst.some(s => norm(s) === norm(w) || nearDuplicate(s, w)))
    .map((w, i) => ({ w, i, score: overlap(tokens(w), context) + (/^safety:/i.test(w) ? 1 : 0) }))
    .sort((x, y) => y.score - x.score || x.i - y.i);
  const room = Math.max(1, 3 - safetyFirst.length);
  const warnings = [...safetyFirst, ...candidates.slice(0, safetyFirst.length >= 3 ? 0 : room).map(c => stripSafetyPrefix(c.w))];
  const totalWarnings = uniqueBy([...safetyFirst, ...(a.safety_warnings ?? [])], norm).length;

  const isSafety = (t: string) => SAFETY_TEXT.test(t);
  const escalateRaw = [...(a.escalation_criteria ?? []), ...(a.stop_conditions ?? [])].find(t => t?.trim() && !isSafety(t)) ?? null;
  const escalate = escalateRaw ? shortenStep(escalateRaw, 30) : null;

  // 5. Sources: best-labelled first, each with its label; no source is created here.
  const all: (SummarySource & { tier: number })[] = [
    ...(a.sources_with_metadata ?? []).map(s => ({
      title: s.source_metadata?.title ?? s.source_id,
      url: s.source_metadata?.url && /^https?:\/\//i.test(s.source_metadata.url) ? s.source_metadata.url : null,
      label: labelForSource(s),
      tier: s.source_metadata?.tier ?? 7,
    })),
    ...(vf?.internal_references ?? []).map(r => ({ title: r.title, url: r.url, label: r.label, tier: 2 })),
    ...(vf?.web_sources ?? []).map(w => ({ title: w.title, url: w.url, label: w.label, tier: w.tier })),
  ];
  const urlKey = (s: SummarySource) => (s.url ? s.url.toLowerCase().replace(/[?#].*$/, '').replace(/^https?:\/\/(www\.)?/, '') : `t:${norm(s.title)}`);
  const ranked = uniqueBy(uniqueBy(all, urlKey), s => norm(s.title))
    .map((s, i) => ({ s, i }))
    .sort((x, y) => LABEL_RANK[x.s.label] - LABEL_RANK[y.s.label] || x.s.tier - y.s.tier || x.i - y.i)
    .map(x => x.s);
  const sources = ranked.slice(0, 3).map(({ title, url, label }) => ({ title, url, label }));

  const recommendations_label = vf?.recommendations_label ?? labelForGeneration(gen);
  const missing_info = (a.missing_information?.critical_missing ?? []).map(f => FIELD_NAMES[f] ?? f.replace(/_/g, ' '));

  const summary: QuickSummary = {
    problem, observed, assessment, notices, causes, actions, warnings, escalate, sources,
    recommendations_label, missing_info,
    omitted: {
      causes: Math.max(0, totalCauses - causes.length),
      actions: Math.max(0, totalActions - actions.filter(x => x.kind !== 'info').length),
      warnings: Math.max(0, totalWarnings - warnings.length),
      sources: Math.max(0, ranked.length - sources.length),
    },
    word_count: 0,
  };
  // Keep to the word budget by dropping the lowest-priority actions (down to 3),
  // then the third cause. Problem, warnings, notices and sources are never trimmed.
  while (summaryWordCount(summary) > SUMMARY_WORD_BUDGET && summary.actions.length > 3) {
    summary.actions.pop();
    summary.omitted.actions++;
  }
  if (summaryWordCount(summary) > SUMMARY_WORD_BUDGET && summary.causes.length > 2) {
    summary.causes.pop();
    summary.omitted.causes++;
  }
  summary.word_count = summaryWordCount(summary);
  return summary;
}

/** Words in the summary's content (notices excluded: they are status, not advice). */
export function summaryWordCount(s: QuickSummary): number {
  return [
    s.problem, s.observed ?? '', ...s.causes.map(c => c.text), ...s.actions.map(x => x.text),
    ...s.warnings, s.escalate ?? '', ...s.sources.map(x => x.title),
  ].reduce((n, t) => n + words(t), 0);
}

/** Plain-text rendering, for clipboard, TXT export and tests. */
export function quickSummaryText(s: QuickSummary): string {
  const lines: string[] = [];
  for (const n of s.notices) lines.push(`Notice: ${n}`);
  lines.push('IDENTIFIED PROBLEM', s.problem);
  if (s.observed) lines.push(`Seen in the images: ${s.observed}`);
  lines.push(`Assessment: ${s.assessment}`);
  if (s.missing_info.length) lines.push(`Confidence limited by missing: ${s.missing_info.join(', ')}`);
  lines.push('', 'MOST LIKELY CAUSES');
  s.causes.forEach((c, i) => lines.push(`${i + 1}. ${c.text}${c.probability ? ` [${c.confirmed ? 'confirmed' : `${c.probability} probability`}]` : ''}`));
  lines.push('', 'RECOMMENDED ACTIONS');
  s.actions.forEach((x, i) => lines.push(`${i + 1}. ${x.kind === 'check' ? 'Check: ' : x.kind === 'info' ? 'Provide: ' : ''}${x.text}`));
  if (s.warnings.length || s.escalate) {
    lines.push('', 'CRITICAL WARNINGS');
    for (const w of s.warnings) lines.push(`- ${w}`);
    if (s.escalate) lines.push(`- Stop and escalate if: ${s.escalate}`);
  }
  lines.push('', 'SOURCES', `Recommendations: ${s.recommendations_label}`);
  for (const src of s.sources) lines.push(`- [${src.label}] ${src.title}${src.url ? ` — ${src.url}` : ''}`);
  return lines.join('\n');
}

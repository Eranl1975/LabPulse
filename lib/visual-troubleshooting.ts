// Orchestrates one Visual Troubleshooting submission inside the 60 s Vercel
// Hobby limit: vision → (existing pipeline ∥ web research) → report.
// Every stage degrades instead of failing: with no AI at all, the report still
// carries the user's text, the KB/document matches and the generic procedures.

import Anthropic from '@anthropic-ai/sdk';
import { runTroubleshootingPipeline, type AIFallbackFn, type PipelineDeps } from './troubleshooting-pipeline';
import { classifyAIError } from './ai-errors';
import { analyzeVisual, type VisualAnalysisOutcome, type VisualAnalysisRequest } from './visual-analysis';
import { runWebResearch, type WebResearchResult } from './web-research';
import { buildVisualQuery, safetyFirstSteps, internalReferences } from './visual-query';
import { labelForGeneration } from './evidence-labels';
import { sanitizeText } from './sanitize';
import { createLogger } from './logger';
import type { RankedAnswerV2, GenerationStatus } from './types';
import type { DocumentRecord } from './document-types';
import type { CleaningProcedureContent } from './cleaning-types';
import type { VisualFindings, VisualStatus, VisualAnalysis } from './visual-types';
import type { VisualPayload } from './visual-payload';

const log = createLogger('visual-troubleshooting');

/** Milliseconds from the start of the request. The function is killed at 60 s. */
export const TIME_BUDGET = {
  visionBy: 26_000,
  finishBy: 50_000,
};

export type VisualStage = 'reading_image' | 'searching_labpulse' | 'searching_web' | 'building_report';

export interface VisualDeps {
  hasAIKey: boolean;
  aiFallback?: AIFallbackFn;
  analyze?: (req: VisualAnalysisRequest, opts: { timeoutMs: number }) => Promise<VisualAnalysisOutcome>;
  webResearch?: typeof runWebResearch;
  pipeline?: Omit<PipelineDeps, 'hasAIKey' | 'aiFallback'>;
  catalogue?: () => DocumentRecord[];
  /** v8.2: manuals with passage counts; preferred over `catalogue` when given. */
  library?: () => Promise<{ documents: DocumentRecord[]; chunkCounts: Map<string, number> | null }>;
  cleaning?: (technique: string, vendor: string | null, model: string | null) => CleaningProcedureContent | null;
  now?: () => number;
}

export interface VisualRunResult {
  answer: RankedAnswerV2;
  generation: GenerationStatus;
}

function timeoutError(what: string): Error {
  return new Anthropic.APIConnectionTimeoutError({ message: `${what} skipped to stay inside the time limit.` });
}

/** Run `fn` but reject once the shared deadline passes. */
function withDeadline<A extends unknown[], R>(fn: (...a: A) => Promise<R>, deadline: number, now: () => number, what: string) {
  return async (...args: A): Promise<R> => {
    const remaining = deadline - now();
    if (remaining < 5_000) throw timeoutError(what);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        fn(...args),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(timeoutError(what)), remaining); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') return sanitizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeDeep) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeDeep(v)])) as T;
  }
  return value;
}

function visionNotice(status: VisualStatus): string | null {
  switch (status.vision_status) {
    case 'ok': return null;
    case 'skipped_no_key': return 'Image analysis is not configured on this server (no AI key). The report is based on your description and the LabPulse knowledge base only.';
    default: return `Image analysis unavailable: ${status.vision_reason ?? 'unknown error'} The report is based on your description and the LabPulse knowledge base only.`;
  }
}

function webNotice(r: WebResearchResult): string | null {
  switch (r.status) {
    case 'ok': return null;
    case 'no_results': return 'Web research found no relevant pages for this instrument.';
    case 'skipped_no_key': return 'Web research is not available on this server.';
    case 'skipped_no_ai': return 'Web research was skipped because the AI service is unavailable.';
    case 'timeout': return 'Web research did not finish in time; the report continues without it.';
    default: return `Web research failed: ${r.reason ?? 'unknown error'} The report continues without it.`;
  }
}

export async function runVisualTroubleshooting(
  payload: VisualPayload,
  deps: VisualDeps,
  onStage: (stage: VisualStage) => void = () => {},
): Promise<VisualRunResult> {
  const now = deps.now ?? Date.now;
  const started = now();
  const at = (ms: number) => started + ms;

  const status: VisualStatus = {
    vision_status: 'skipped_no_key',
    vision_error_code: null,
    vision_reason: null,
    vision_model: null,
    web_status: 'skipped_no_key',
    web_reason: null,
    web_queries: [],
    partial: false,
    notices: [],
  };

  // ── 1. Vision ──────────────────────────────────────────────────────────────
  onStage('reading_image');
  let analysis: VisualAnalysis | null = null;
  if (deps.hasAIKey && deps.analyze) {
    try {
      const outcome = await deps.analyze(
        { images: payload.images, technique: payload.technique, vendor: payload.vendor, model: payload.model, description: payload.description },
        { timeoutMs: Math.max(5_000, at(TIME_BUDGET.visionBy) - now()) },
      );
      analysis = outcome.analysis;
      status.vision_model = outcome.model_used;
      if (analysis) {
        status.vision_status = 'ok';
      } else {
        status.vision_status = 'error';
        status.vision_error_code = 'bad_request';
        status.vision_reason = 'The image analysis returned no usable findings.';
      }
    } catch (err) {
      const c = classifyAIError(err);
      status.vision_status = 'error';
      status.vision_error_code = c.code;
      status.vision_reason = c.reason;
      if (c.code === 'timeout') status.partial = true;
      log.error('vision', 'visual analysis failed; continuing without it', { code: c.code, http_status: c.http_status, detail: c.detail });
    }
  }

  // ── 2. Existing pipeline ∥ web research ────────────────────────────────────
  const query = buildVisualQuery({
    technique: payload.technique, vendor: payload.vendor, model: payload.model,
    description: payload.description, analysis,
  });

  // The AI service is down for this account (billing/auth): no point in two more calls.
  const aiDead = status.vision_status === 'error' && (status.vision_error_code === 'billing' || status.vision_error_code === 'auth');

  onStage('searching_labpulse');
  const pipelinePromise = runTroubleshootingPipeline(query, {
    ...deps.pipeline,
    hasAIKey: deps.hasAIKey,
    aiFallback: deps.aiFallback && !aiDead
      ? withDeadline(deps.aiFallback, at(TIME_BUDGET.finishBy), now, 'AI analysis')
      : undefined,
  });

  onStage('searching_web');
  const webPromise: Promise<WebResearchResult> = aiDead
    ? Promise.resolve({ status: 'skipped_no_ai', reason: status.vision_reason, queries: [], sources: [] })
    : (deps.webResearch ?? runWebResearch)(
        { technique: payload.technique, vendor: payload.vendor, model: payload.model, description: payload.description, analysis },
        { hasAIKey: deps.hasAIKey, timeoutMs: at(TIME_BUDGET.finishBy) - now() },
      ).catch((err): WebResearchResult => {
        const c = classifyAIError(err);
        return { status: 'error', reason: c.reason, queries: [], sources: [] };
      });

  const [{ answer: pipelineAnswer, generation }, web] = await Promise.all([pipelinePromise, webPromise]);

  // An AI fallback with no client configured at all would leave ai_status at
  // skipped_not_needed; when the pipeline AI was skipped because the account is
  // dead, say so explicitly.
  if (aiDead && generation.ai_status !== 'ok') {
    generation.ai_status = 'error';
    generation.ai_error_code = status.vision_error_code;
    generation.ai_reason = status.vision_reason;
  }
  if (generation.ai_error_code === 'timeout') status.partial = true;

  status.web_status = web.status;
  status.web_reason = web.reason;
  status.web_queries = web.queries;
  if (web.status === 'timeout') status.partial = true;

  // ── 3. Report ──────────────────────────────────────────────────────────────
  onStage('building_report');
  const answer = pipelineAnswer;

  const safety = safetyFirstSteps(analysis, payload.description);
  if (safety.length > 0) {
    answer.safety_warnings = [...new Set([...safety, ...answer.safety_warnings])];
  }

  if (analysis?.instrument_consistency.status === 'mismatch') {
    const msg = `The images may not show the selected instrument: ${analysis.instrument_consistency.explanation}`;
    answer.uncertainties = [msg, ...answer.uncertainties];
    answer.remaining_uncertainty = [msg, ...answer.remaining_uncertainty];
  }

  const notices = [visionNotice(status), webNotice(web)].filter((n): n is string => !!n);
  if (status.partial) notices.push('Part of the analysis was cut short to stay inside the time limit, so this report is partial. Submitting again may give a fuller result.');
  status.notices = notices;

  const library = deps.library
    ? await deps.library().catch(() => ({ documents: deps.catalogue?.() ?? [], chunkCounts: null }))
    : { documents: deps.catalogue?.() ?? [], chunkCounts: null };
  const references = internalReferences({
    technique: payload.technique,
    vendor: payload.vendor,
    model: payload.model,
    catalogue: library.documents,
    chunkCounts: library.chunkCounts,
    cleaning: deps.cleaning?.(payload.technique, payload.vendor, payload.model) ?? null,
    answer,
  });

  const findings: VisualFindings = {
    media: payload.media,
    user_description: payload.description,
    analysis,
    safety_first: safety,
    internal_references: references,
    web_sources: web.sources,
    status,
    recommendations_label: labelForGeneration(generation),
  };
  answer.visual_findings = sanitizeDeep(findings);

  log.info('visual-run', 'visual troubleshooting complete', {
    ms: now() - started, vision: status.vision_status, ai: generation.ai_status,
    web: status.web_status, web_sources: web.sources.length, partial: status.partial,
  });

  return { answer, generation };
}

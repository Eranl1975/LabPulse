import { rankItemsV2 } from '@/agents/ranking/index';
import { getConfidenceLabelV2 } from '@/agents/ranking/tiering';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { KnowledgeItem, RankedAnswerV2, Technique, GenerationStatus } from './types';
import type { DocumentHit } from './document-types';
import { readItems } from './store';
import { runQualityChecks } from './quality-control';
import { sanitizeAnswerV2 } from './sanitize';
import { classifyAIError } from './ai-errors';
import { mergeGenericProcedure } from './generic-procedures';
import { searchDocuments, type DocumentSearchQuery } from './document-search';
import { mergeDocumentEvidence, buildGroundingContext } from './document-evidence';
import { createLogger } from './logger';

const log = createLogger('troubleshooting-pipeline');

/** Techniques the rule-based knowledge base does not cover well; the AI layer always runs for them. */
export const AI_ONLY_TECHNIQUES = new Set<Technique>([
  'UHPLC', 'IC', 'CE', 'SFC', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC',
]);

const AI_TRIGGER_CONFIDENCE = 0.4;

/** `grounding` carries retrieved vendor documentation the model must cite from. */
export type AIFallbackFn = (
  query: RankingQueryV2,
  kb: RankedAnswerV2,
  grounding?: string,
) => Promise<RankedAnswerV2>;

/** Returns null when the document backend is unavailable, [] when nothing matched. */
export type DocumentSearchFn = (q: DocumentSearchQuery) => Promise<DocumentHit[] | null>;

export interface PipelineDeps {
  /** Knowledge items; defaults to the on-disk store. */
  items?: KnowledgeItem[];
  /** Whether an AI API key is configured. */
  hasAIKey: boolean;
  /** The AI fallback implementation (injected so tests can simulate failures). */
  aiFallback?: AIFallbackFn;
  /** Vendor-document search; defaults to Supabase full-text search. */
  documentSearch?: DocumentSearchFn;
  /** Set false to skip document retrieval entirely (used by offline tests). */
  useDocuments?: boolean;
}

export interface PipelineResult {
  answer: RankedAnswerV2;
  generation: GenerationStatus;
}

function isAIAnswer(answer: RankedAnswerV2): boolean {
  return answer.evidence_summary.some(e => e.source_id.startsWith('claude-'));
}

/**
 * Search stored vendor documentation for this query and record the outcome.
 * A search failure is reported in `generation`, never thrown: the answer must
 * still be produced from the knowledge base and generic procedures.
 */
async function retrieveDocuments(
  query: RankingQueryV2,
  deps: PipelineDeps,
  generation: GenerationStatus,
): Promise<DocumentHit[]> {
  if (deps.useDocuments === false) return [];

  const search = deps.documentSearch ?? searchDocuments;
  const text = [
    query.symptom_description,
    query.issue_category,
    query.expected_result,
  ].filter(Boolean).join(' ');

  if (!text.trim()) {
    generation.document_search = 'skipped';
    return [];
  }

  let hits: DocumentHit[] | null;
  try {
    hits = await search({
      text,
      technique: query.technique,
      vendor: query.vendor,
      model: query.model,
    });
  } catch (err) {
    log.warn('document-search', 'vendor document search failed', { error: String(err) });
    generation.document_search = 'unavailable';
    return [];
  }

  if (hits === null) {
    generation.document_search = 'unavailable';
    return [];
  }
  generation.document_search = hits.length > 0 ? 'ok' : 'no_matches';
  return hits;
}

function modelUsed(answer: RankedAnswerV2): string | null {
  return answer.evidence_summary.find(e => e.source_id.startsWith('claude-'))?.source_id ?? null;
}

function setConfidence(answer: RankedAnswerV2, value: number, cap: string): void {
  answer.confidence = parseFloat(value.toFixed(2));
  answer.confidence_breakdown.final_score = answer.confidence;
  answer.confidence_breakdown.label = getConfidenceLabelV2(answer.confidence);
  answer.confidence_breakdown.caps_applied.push(cap);
}

function buildNotice(generation: GenerationStatus, hadKBContent: boolean): string | null {
  const sourceText = generation.content_source === 'generic_procedure'
    ? 'Showing a general best-practice procedure for this technique and issue; it is not instrument-specific.'
    : generation.content_source === 'knowledge_base+generic'
      ? 'Showing knowledge-base results completed with a general best-practice procedure.'
      : hadKBContent ? 'Showing knowledge-base results only.' : null;

  switch (generation.ai_status) {
    case 'skipped_no_key':
      return ['AI analysis is not configured on this server (no API key).', sourceText, 'Contact your LabPulse administrator.'].filter(Boolean).join(' ');
    case 'error':
      return [`AI analysis unavailable: ${generation.ai_reason ?? 'unknown error'}`, sourceText, 'Contact your LabPulse administrator.'].filter(Boolean).join(' ');
    default:
      return generation.content_source === 'generic_procedure' || generation.content_source === 'knowledge_base+generic'
        ? sourceText
        : null;
  }
}

/**
 * Knowledge base → AI fallback → single quality-control gate → content guarantee.
 * Never throws for AI failures: they are recorded in `generation` and surfaced
 * to the user as a notice, and the answer always contains an actionable plan.
 */
export async function runTroubleshootingPipeline(
  query: RankingQueryV2,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const items = deps.items ?? readItems();
  const kb = rankItemsV2(query, items);
  const hadKBContent = kb.hypotheses.length > 0 || kb.likely_causes.length > 0;
  let answer: RankedAnswerV2 = kb;

  const generation: GenerationStatus = {
    ai_status: 'skipped_not_needed',
    ai_error_code: null,
    ai_http_status: null,
    ai_reason: null,
    model_used: null,
    content_source: 'knowledge_base',
    notice: null,
    document_search: 'skipped',
    documents_used: 0,
  };

  // Retrieve vendor documentation first: it grounds the AI layer and is cited
  // in the answer even when the rule-based result already scores well.
  const hits = await retrieveDocuments(query, deps, generation);
  const grounding = buildGroundingContext(hits);

  const needsAI = kb.confidence < AI_TRIGGER_CONFIDENCE || AI_ONLY_TECHNIQUES.has(query.technique);
  const canRunAI = needsAI && deps.hasAIKey && !!deps.aiFallback;

  if (needsAI && !deps.hasAIKey) {
    generation.ai_status = 'skipped_no_key';
    log.warn('ai-skipped', 'AI fallback needed but ANTHROPIC_API_KEY is not configured', { technique: query.technique });
  }

  if (canRunAI) {
    try {
      answer = await deps.aiFallback!(query, kb, grounding || undefined);
      generation.ai_status = 'ok';
      generation.content_source = 'ai';
      generation.model_used = modelUsed(answer);
    } catch (err) {
      const c = classifyAIError(err);
      generation.ai_status = 'error';
      generation.ai_error_code = c.code;
      generation.ai_http_status = c.http_status;
      generation.ai_reason = c.reason;
      log.error('ai-fallback', 'AI fallback failed; continuing with knowledge base and generic procedure', {
        code: c.code, http_status: c.http_status, detail: c.detail, technique: query.technique,
      });
      answer = kb;
    }
  }

  // Single quality-control gate (the AI module no longer runs its own pass).
  let qc = runQualityChecks(answer, query);

  if (qc.action === 'regenerate' && generation.ai_status === 'ok') {
    try {
      answer = await deps.aiFallback!(query, kb, grounding || undefined);
      qc = runQualityChecks(answer, query);
    } catch (err) {
      const c = classifyAIError(err);
      log.error('ai-fallback', 'AI regeneration retry failed', { code: c.code, detail: c.detail });
    }
  }

  if (qc.action === 'regenerate') {
    setConfidence(answer, Math.min(answer.confidence, 0.30), 'Quality control regeneration cap (0.30)');
    answer.uncertainties.push(...qc.failures.map(f => `QC: ${f.message}`));
  } else if (qc.action === 'downgrade') {
    const errors = qc.failures.filter(f => f.severity === 'error');
    const next = qc.recommended_confidence !== null
      ? Math.min(answer.confidence, qc.recommended_confidence)
      : Math.max(0, answer.confidence - errors.length * 0.15);
    setConfidence(answer, next, 'Quality control downgrade');
    answer.uncertainties.push(...qc.failures.map(f => `QC: ${f.message}`));
  }

  // Content guarantee: a low score never means an empty report.
  const contentBefore = answer.hypotheses.length > 0 || answer.likely_causes.length > 0;
  const merged = mergeGenericProcedure(answer, query);
  answer = merged.answer;
  if (merged.added && !isAIAnswer(answer)) {
    generation.content_source = contentBefore ? 'knowledge_base+generic' : 'generic_procedure';
  }

  // Cite the retrieved vendor documentation, ordered by evidence tier.
  const withDocs = mergeDocumentEvidence(answer, hits);
  answer = withDocs.answer;
  generation.documents_used = withDocs.added;

  generation.notice = buildNotice(generation, hadKBContent);
  answer.generation = generation;
  if (generation.notice) {
    answer.uncertainties = [generation.notice, ...answer.uncertainties];
    answer.remaining_uncertainty = [generation.notice, ...answer.remaining_uncertainty];
  }

  return { answer: sanitizeAnswerV2(answer), generation };
}

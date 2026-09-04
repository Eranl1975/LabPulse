/**
 * Server-side text sanitizer for AI-generated content.
 * Strips HTML tags, script injections, event handlers, and encodes entities
 * to prevent XSS when rendering AI output in the browser.
 */

import type { RankedAnswer, RankedAnswerV2 } from './types';

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_RE = /\bon\w+\s*=\s*["'][^"']*["']/gi;
const DATA_URI_RE = /data:\s*[^;]+;\s*base64/gi;
const JAVASCRIPT_URI_RE = /javascript\s*:/gi;

export function sanitizeText(text: string): string {
  return text
    .replace(SCRIPT_RE, '')
    .replace(EVENT_HANDLER_RE, '')
    .replace(JAVASCRIPT_URI_RE, '')
    .replace(DATA_URI_RE, '')
    .replace(HTML_TAG_RE, '');
}

/** HTML entity encoding for safe embedding in HTML contexts */
export function encodeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeStringArray(arr: string[]): string[] {
  return arr.map(sanitizeText);
}

/** Sanitize all string fields in a RankedAnswer to prevent XSS */
export function sanitizeAnswer(answer: RankedAnswer): RankedAnswer {
  return {
    ...answer,
    problem_summary: sanitizeText(answer.problem_summary),
    likely_causes: sanitizeStringArray(answer.likely_causes),
    checks: sanitizeStringArray(answer.checks),
    corrective_actions: sanitizeStringArray(answer.corrective_actions),
    stop_conditions: sanitizeStringArray(answer.stop_conditions),
    uncertainties: sanitizeStringArray(answer.uncertainties),
    evidence_summary: answer.evidence_summary.map(e => ({
      ...e,
      excerpt: sanitizeText(e.excerpt),
    })),
  };
}

/** Sanitize all V2/V3 fields including hypotheses, safety, verification, actions */
export function sanitizeAnswerV2(answer: RankedAnswerV2): RankedAnswerV2 {
  const base = sanitizeAnswer(answer) as RankedAnswerV2;

  return {
    ...base,
    // V2 structured fields
    hypotheses: (answer.hypotheses ?? []).map(h => ({
      ...h,
      cause: sanitizeText(h.cause),
      supporting_evidence: sanitizeStringArray(h.supporting_evidence),
      contradicting_evidence: sanitizeStringArray(h.contradicting_evidence),
      diagnostic_test: sanitizeText(h.diagnostic_test),
      expected_result: sanitizeText(h.expected_result),
    })),
    immediate_checks: sanitizeStringArray(answer.immediate_checks ?? []),
    verification_steps: sanitizeStringArray(answer.verification_steps ?? []),
    escalation_criteria: sanitizeStringArray(answer.escalation_criteria ?? []),
    method_dependent_flags: sanitizeStringArray(answer.method_dependent_flags ?? []),
    printable_checklist: sanitizeStringArray(answer.printable_checklist ?? []),
    reported_observations: sanitizeStringArray(answer.reported_observations ?? []),
    confirmed_evidence: sanitizeStringArray(answer.confirmed_evidence ?? []),
    remaining_uncertainty: sanitizeStringArray(answer.remaining_uncertainty ?? []),
    // V3 comprehensive troubleshooting fields
    safety_warnings: sanitizeStringArray(answer.safety_warnings ?? []),
    verification_criteria: (answer.verification_criteria ?? []).map(vc => ({
      ...vc,
      parameter: sanitizeText(vc.parameter),
      expected_value: sanitizeText(vc.expected_value),
      tolerance: sanitizeText(vc.tolerance),
      method: sanitizeText(vc.method),
    })),
    action_details: (answer.action_details ?? []).map(ad => ({
      ...ad,
      action: sanitizeText(ad.action),
      condition: sanitizeText(ad.condition),
      materials: sanitizeStringArray(ad.materials),
      evidence_source: sanitizeText(ad.evidence_source),
      rollback: sanitizeText(ad.rollback),
    })),
  };
}

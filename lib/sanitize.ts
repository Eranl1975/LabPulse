/**
 * Server-side text sanitizer for AI-generated content.
 * Strips HTML tags, script injections, and event handlers
 * to prevent XSS when rendering AI output in the browser.
 */

import type { RankedAnswer } from './types';

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

import Anthropic from '@anthropic-ai/sdk';
import type { AIErrorCode } from './types';

// Turns an Anthropic SDK error into a code, HTTP status and a user-safe reason
// so the pipeline can report AI failures instead of hiding them.
// Kept separate from ai-fallback.ts so it can be imported without constructing a client.

export interface ClassifiedAIError {
  code: AIErrorCode;
  http_status: number | null;
  reason: string;          // safe to show to end users
  detail: string;          // for server logs only
}

export function classifyAIError(err: unknown): ClassifiedAIError {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);

  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { code: 'timeout', http_status: null, reason: 'The AI service did not respond in time.', detail };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { code: 'network', http_status: null, reason: 'The AI service could not be reached.', detail };
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === 'number' ? err.status : null;
    const msg = (err.message ?? '').toLowerCase();
    if (status === 400 && msg.includes('credit balance')) {
      return { code: 'billing', http_status: status, reason: 'The AI service credit balance is exhausted (Anthropic API billing).', detail };
    }
    if (status === 401 || status === 403) {
      return { code: 'auth', http_status: status, reason: 'The AI service rejected the API key.', detail };
    }
    if (status === 404) {
      return { code: 'model_unavailable', http_status: status, reason: 'The configured AI model is not available.', detail };
    }
    if (status === 429) {
      return { code: 'rate_limit', http_status: status, reason: 'The AI service rate limit was reached; try again shortly.', detail };
    }
    if (status === 400) {
      return { code: 'bad_request', http_status: status, reason: 'The AI service rejected the request.', detail };
    }
    if (status !== null && status >= 500) {
      return { code: 'server', http_status: status, reason: 'The AI service is temporarily unavailable.', detail };
    }
    return { code: 'unknown', http_status: status, reason: 'The AI service returned an unexpected error.', detail };
  }
  return { code: 'unknown', http_status: null, reason: 'AI analysis failed unexpectedly.', detail };
}

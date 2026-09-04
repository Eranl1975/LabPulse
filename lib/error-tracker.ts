/**
 * Best-effort error persistence to Supabase error_logs table.
 * Falls back to structured console logging if Supabase unavailable.
 */

import { createLogger } from './logger';

const log = createLogger('error-tracker');

export interface TrackedError {
  module: string;
  message: string;
  stack?: string;
  userId?: string;
  requestContext?: Record<string, unknown>;
}

export async function trackError(error: TrackedError): Promise<void> {
  log.error('track', error.message, {
    stack: error.stack,
    userId: error.userId,
    module: error.module,
  });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    await fetch(`${url}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        level: 'error',
        module: error.module,
        message: error.message,
        stack: error.stack ?? null,
        user_id: error.userId ?? null,
        request_context: error.requestContext ?? null,
      }),
    });
  } catch {
    // Best-effort — already logged to console above
  }
}

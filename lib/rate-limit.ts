/**
 * Persistent-compatible rate limiter.
 * Tries Supabase RPC first, falls back to in-memory Map.
 */

import { createLogger } from './logger';

const log = createLogger('rate-limit');

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const memStore = new Map<string, RateLimitEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Supabase-backed check ───────────────────────────────────────────

async function supabaseCheck(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;

    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_key: key,
        p_limit: limit,
        p_window_ms: windowMs,
      }),
    });

    if (!res.ok) return null;
    const result = await res.json();
    return result?.allowed ?? null;
  } catch {
    return null; // fallback to memory
  }
}

// ── In-memory fallback ──────────────────────────────────────────────

function memCheck(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Public API ──────────────────────────────────────────────────────

/** Async daily query rate limit — tries Supabase first. */
export async function checkQueryRateLimitAsync(userId: string, dailyLimit: number): Promise<boolean> {
  const key = `query:${userId}`;
  const result = await supabaseCheck(key, dailyLimit, DAY_MS);
  if (result !== null) return result;
  log.warn('fallback', 'Supabase unavailable, using in-memory rate limiter');
  return memCheck(key, dailyLimit, DAY_MS);
}

/** Synchronous daily query rate limit (backward-compatible). */
export function checkQueryRateLimit(userId: string, dailyLimit: number): boolean {
  return memCheck(`query:${userId}`, dailyLimit, DAY_MS);
}

/** General-purpose rate limiter (for middleware/API routes). */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  return memCheck(key, limit, windowMs);
}

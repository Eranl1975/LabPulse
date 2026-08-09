/**
 * Persistent-compatible rate limiter.
 * Uses in-memory store with daily window for query rate limiting.
 * In production, swap to Supabase/Redis-backed store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns true if under limit, false if rate-limited. */
export function checkQueryRateLimit(userId: string, dailyLimit: number): boolean {
  const now = Date.now();
  const key = `query:${userId}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + DAY_MS });
    return true;
  }

  if (entry.count >= dailyLimit) return false;
  entry.count++;
  return true;
}

/** General-purpose rate limiter (for middleware/API routes). */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

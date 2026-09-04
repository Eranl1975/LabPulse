/**
 * CSRF token generation and validation using HMAC.
 * Tokens are stateless — no server-side storage needed.
 */

import { randomBytes, createHmac } from 'crypto';

const SECRET = process.env.CSRF_SECRET || process.env.AUTH_SECRET || 'labpulse-csrf-dev-key';

/** Generate a CSRF token (nonce.signature) */
export function generateCsrfToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const sig = createHmac('sha256', SECRET).update(nonce).digest('hex').slice(0, 16);
  return `${nonce}.${sig}`;
}

/** Validate a CSRF token */
export function validateCsrfToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  if (!nonce || !sig) return false;
  const expected = createHmac('sha256', SECRET).update(nonce).digest('hex').slice(0, 16);
  // Timing-safe comparison
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

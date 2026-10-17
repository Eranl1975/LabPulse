import { describe, it, expect } from 'vitest';
import config from '@/next.config';

async function headerMap(): Promise<Record<string, string>> {
  const rules = await config.headers!();
  const all = rules.find(r => r.source === '/(.*)');
  return Object.fromEntries((all?.headers ?? []).map(h => [h.key, h.value]));
}

function directives(csp: string): Record<string, string> {
  return Object.fromEntries(csp.split(';').map(d => d.trim()).filter(Boolean).map(d => {
    const [name, ...rest] = d.split(/\s+/);
    return [name, rest.join(' ')];
  }));
}

describe('CSP and Permissions-Policy for Visual Troubleshooting', () => {
  it('allows the camera for this origin only and keeps the microphone and geolocation off', async () => {
    const h = await headerMap();
    expect(h['Permissions-Policy']).toBe('camera=(self), microphone=(), geolocation=()');
  });

  it('lets blob: camera/recording previews play', async () => {
    const d = directives((await headerMap())['Content-Security-Policy']);
    expect(d['media-src']).toBe("'self' blob:");
  });

  it('keeps Supabase (incl. Storage uploads) reachable', async () => {
    const d = directives((await headerMap())['Content-Security-Policy']);
    expect(d['connect-src']).toContain('https://*.supabase.co');
  });

  it('leaves every other directive unchanged', async () => {
    const d = directives((await headerMap())['Content-Security-Policy']);
    expect(d).toEqual({
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
      'font-src': "'self' https://fonts.gstatic.com",
      'img-src': "'self' data: blob:",
      'media-src': "'self' blob:",
      'connect-src': "'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com",
      'frame-src': 'https://js.stripe.com https://hooks.stripe.com',
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
    });
  });

  it('keeps the other security headers', async () => {
    const h = await headerMap();
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
  });
});

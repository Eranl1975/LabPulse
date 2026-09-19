import { describe, it, expect } from 'vitest';
import { VendorWebAdapter, type KnownDocument } from '@/agents/acquisition/adapters/vendor-web';
import { PoliteFetcher, sha256 } from '@/agents/acquisition/discovery/fetcher';
import { isAllowedUrl, type VendorSite } from '@/agents/acquisition/config/vendor-sites';
import {
  ROBOTS_ALLOW_ALL, ROBOTS_DENY_SUPPORT,
  SUPPORT_INDEX_HTML, TROUBLESHOOTING_HTML, MARKETING_HTML,
} from './fixtures/vendor-pages';

const SITE: VendorSite = {
  source_id: 'agilent-test',
  vendor: 'Agilent',
  domains: ['agilent.com'],
  seeds: ['https://www.agilent.com/en/support/liquid-chromatography'],
  sitemaps: [],
  techniques: ['HPLC'],
  access: 'reachable',
};

interface RouteResponse {
  body: string;
  contentType?: string;
  status?: number;
  etag?: string;
}

/** Builds an offline fetch that serves the fixtures and records every request. */
function makeFetch(routes: Record<string, RouteResponse>, log: string[] = []) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    log.push(url);
    const route = routes[url];

    if (!route) {
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }

    const headers = new Headers({ 'content-type': route.contentType ?? 'text/html' });
    if (route.etag) headers.set('etag', route.etag);

    // Honour conditional requests so change detection can be tested.
    const inm = new Headers(init?.headers as HeadersInit | undefined).get('if-none-match');
    if (route.etag && inm === route.etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(route.body, { status: route.status ?? 200, headers });
  };
}

const ROUTES: Record<string, RouteResponse> = {
  'https://www.agilent.com/robots.txt': { body: ROBOTS_ALLOW_ALL, contentType: 'text/plain' },
  'https://www.agilent.com/en/support/liquid-chromatography': { body: SUPPORT_INDEX_HTML },
  'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf': {
    body: TROUBLESHOOTING_HTML, contentType: 'text/html', etag: '"v1"',
  },
  'https://www.agilent.com/en/support/hplc-maintenance-guide': { body: MARKETING_HTML },
};

function newAdapter(
  routes: Record<string, RouteResponse> = ROUTES,
  known?: Map<string, KnownDocument>,
  log: string[] = [],
) {
  const fetcher = new PoliteFetcher({
    fetchImpl: makeFetch(routes, log),
    sleep: async () => {},
    delayMs: 0,
  });
  return { adapter: new VendorWebAdapter(SITE, { fetcher, known }), log };
}

const QUERY = { techniques: ['HPLC' as const], issue_categories: [], since: null };

describe('isAllowedUrl', () => {
  it('accepts the vendor domain and its subdomains', () => {
    expect(isAllowedUrl('https://www.agilent.com/x', SITE)).toBe(true);
    expect(isAllowedUrl('https://agilent.com/x', SITE)).toBe(true);
  });

  it('rejects look-alike and unrelated domains', () => {
    expect(isAllowedUrl('https://agilent.com.evil.net/x', SITE)).toBe(false);
    expect(isAllowedUrl('https://not-agilent.example.com/x', SITE)).toBe(false);
  });

  it('rejects non-http schemes and malformed URLs', () => {
    expect(isAllowedUrl('ftp://agilent.com/x', SITE)).toBe(false);
    expect(isAllowedUrl('not a url', SITE)).toBe(false);
  });
});

describe('VendorWebAdapter discovery', () => {
  it('never requests a host outside the allowlist', async () => {
    const { adapter, log } = newAdapter();
    await adapter.fetch(QUERY);
    expect(log.every(u => new URL(u).hostname.endsWith('agilent.com'))).toBe(true);
    expect(log.some(u => u.includes('not-agilent'))).toBe(false);
  });

  it('stores a document for the troubleshooting page and classifies it', async () => {
    const { adapter } = newAdapter();
    await adapter.fetch(QUERY);

    const docs = adapter.getDocuments();
    const guide = docs.find(d => d.url.includes('D0133020'));
    expect(guide).toBeDefined();
    expect(guide!.doc_type).toBe('troubleshooting_guide');
    expect(guide!.vendor).toBe('Agilent');
    expect(guide!.techniques).toContain('HPLC');
    expect(guide!.document_number).toBe('D0133020');
  });

  it('extracts symptom, cause and action triples the pipeline can consume', async () => {
    const { adapter } = newAdapter();
    const raw = await adapter.fetch(QUERY);
    expect(raw.length).toBeGreaterThan(0);

    const parsed = raw.map(r => JSON.parse(r.raw_content) as Record<string, unknown>);
    const pressure = parsed.find(p => String(p.symptom).toLowerCase().includes('pressure'));

    expect(pressure).toBeDefined();
    expect(pressure!.issue_category).toBe('high backpressure');
    expect(pressure!.likely_causes as string[]).toContain('Blocked inlet frit or guard column');
    expect((pressure!.corrective_actions as string[]).length).toBeGreaterThan(0);
    expect((pressure!.escalation_conditions as string[]).join(' ')).toMatch(/service engineer/i);
  });

  it('produces chunks that carry their section heading', async () => {
    const { adapter } = newAdapter();
    await adapter.fetch(QUERY);

    const chunks = adapter.getChunks();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.document_id.length > 0)).toBe(true);
    expect(chunks.some(c => (c.heading ?? '').includes('High backpressure'))).toBe(true);
  });

  it('yields no knowledge items from a page with no troubleshooting structure', async () => {
    const routes = {
      'https://www.agilent.com/robots.txt': ROUTES['https://www.agilent.com/robots.txt'],
      'https://www.agilent.com/en/support/liquid-chromatography': {
        body: `<html><head><title>Support</title></head><body>
          <a href="/en/support/hplc-maintenance-guide">Maintenance</a></body></html>`,
      },
      'https://www.agilent.com/en/support/hplc-maintenance-guide': { body: MARKETING_HTML },
    };
    const { adapter } = newAdapter(routes);
    const raw = await adapter.fetch(QUERY);
    expect(raw).toEqual([]);
  });
});

describe('VendorWebAdapter change detection', () => {
  it('skips a document when the server answers 304', async () => {
    const known = new Map<string, KnownDocument>([[
      'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf',
      { url: '', content_hash: null, http_etag: '"v1"', http_last_modified: null },
    ]]);

    const { adapter } = newAdapter(ROUTES, known);
    await adapter.fetch(QUERY);

    expect(adapter.stat.documents_unchanged).toBe(1);
    expect(adapter.getDocuments().some(d => d.url.includes('D0133020'))).toBe(false);
  });

  it('skips a document whose content hash is unchanged without an ETag', async () => {
    const routesNoEtag = {
      ...ROUTES,
      'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf': {
        body: TROUBLESHOOTING_HTML, contentType: 'text/html',
      },
    };
    const known = new Map<string, KnownDocument>([[
      'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf',
      { url: '', content_hash: sha256(Buffer.from(TROUBLESHOOTING_HTML)), http_etag: null, http_last_modified: null },
    ]]);

    const { adapter } = newAdapter(routesNoEtag, known);
    await adapter.fetch(QUERY);
    expect(adapter.stat.documents_unchanged).toBe(1);
  });

  it('re-ingests a document whose content changed', async () => {
    const changed = {
      ...ROUTES,
      'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf': {
        body: TROUBLESHOOTING_HTML, contentType: 'text/html', etag: '"v2"',
      },
    };
    const known = new Map<string, KnownDocument>([[
      'https://www.agilent.com/library/usermanuals/public/D0133020_troubleshooting-guide.pdf',
      { url: '', content_hash: 'stale-hash', http_etag: '"v1"', http_last_modified: null },
    ]]);

    const { adapter } = newAdapter(changed, known);
    await adapter.fetch(QUERY);
    expect(adapter.stat.documents_unchanged).toBe(0);
    expect(adapter.stat.documents_found).toBeGreaterThan(0);
  });
});

describe('VendorWebAdapter robots enforcement', () => {
  it('fetches nothing when robots.txt disallows the seed path', async () => {
    const denied = {
      ...ROUTES,
      'https://www.agilent.com/robots.txt': { body: 'User-agent: *\nDisallow: /\n', contentType: 'text/plain' },
    };
    const { adapter } = newAdapter(denied);
    const raw = await adapter.fetch(QUERY);

    expect(raw).toEqual([]);
    expect(adapter.getDocuments()).toEqual([]);
    expect(await adapter.hasUpdates(null)).toBe(false);
  });

  it('treats an unreadable robots.txt as disallowed', async () => {
    const broken = {
      ...ROUTES,
      'https://www.agilent.com/robots.txt': { body: 'error', contentType: 'text/plain', status: 500 },
    };
    const { adapter } = newAdapter(broken);
    expect(await adapter.hasUpdates(null)).toBe(false);
  });

  it('honours a disallowed subtree while still crawling permitted paths', async () => {
    const mixed = {
      ...ROUTES,
      'https://www.agilent.com/robots.txt': { body: ROBOTS_DENY_SUPPORT, contentType: 'text/plain' },
    };
    const { adapter, log } = newAdapter(mixed);
    await adapter.fetch(QUERY);

    // The seed lives under /en/support/, which is not blocked by "/support/".
    expect(log.some(u => u.includes('/en/support/liquid-chromatography'))).toBe(true);
  });
});

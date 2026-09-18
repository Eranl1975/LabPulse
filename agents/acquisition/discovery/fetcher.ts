// Polite HTTP client for vendor documentation.
// Enforces robots.txt, per-host delay, size and timeout caps, and conditional
// requests (ETag / Last-Modified) so unchanged documents are never re-downloaded.

import { createHash } from 'crypto';
import {
  USER_AGENT, REQUEST_DELAY_MS, REQUEST_TIMEOUT_MS, MAX_DOCUMENT_BYTES,
} from '../config/vendor-sites';
import { parseRobots, isPathAllowed, DENY_ALL, type RobotsRules } from './robots';

/** Injected so tests never touch the network. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface FetchedResource {
  url: string;
  status: number;
  /** 'ok' = body present; 'not_modified' = server confirmed no change; 'skipped' = policy. */
  outcome: 'ok' | 'not_modified' | 'skipped' | 'error';
  contentType: string | null;
  body: Buffer | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string | null;
  reason: string | null;
}

export interface ConditionalHeaders {
  etag?: string | null;
  lastModified?: string | null;
}

export interface FetcherOptions {
  fetchImpl?: FetchLike;
  /** Wait between requests to the same host. Tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  delayMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

export class PoliteFetcher {
  private readonly fetchImpl: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly delayMs: number;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  private readonly robotsCache = new Map<string, RobotsRules>();
  private readonly lastRequestAt = new Map<string, number>();

  constructor(opts: FetcherOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? ((u, i) => fetch(u, i));
    this.sleep = opts.sleep ?? defaultSleep;
    this.delayMs = opts.delayMs ?? REQUEST_DELAY_MS;
    this.timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.maxBytes = opts.maxBytes ?? MAX_DOCUMENT_BYTES;
  }

  /**
   * Load and cache robots.txt for a host.
   * An unreadable robots.txt yields DENY_ALL: we do not crawl on assumption.
   */
  async getRobots(origin: string): Promise<RobotsRules> {
    const cached = this.robotsCache.get(origin);
    if (cached) return cached;

    let rules: RobotsRules;
    try {
      const res = await this.rawFetch(`${origin}/robots.txt`, {});
      if (res.status === 404) {
        // No robots.txt published: the standard reading is "no restrictions".
        rules = { disallow: [], allow: [], crawlDelayMs: null };
      } else if (res.ok) {
        rules = parseRobots(await res.text(), USER_AGENT);
      } else {
        rules = DENY_ALL;
      }
    } catch {
      rules = DENY_ALL;
    }

    this.robotsCache.set(origin, rules);
    return rules;
  }

  async isAllowed(url: string): Promise<boolean> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    const rules = await this.getRobots(parsed.origin);
    return isPathAllowed(parsed.pathname, rules);
  }

  /**
   * Fetch a URL if robots permits. Sends conditional headers when `prev` is given;
   * a 304 returns outcome 'not_modified' with no body.
   */
  async get(url: string, prev: ConditionalHeaders = {}): Promise<FetchedResource> {
    const base: FetchedResource = {
      url, status: 0, outcome: 'error', contentType: null, body: null,
      etag: null, lastModified: null, contentHash: null, reason: null,
    };

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ...base, outcome: 'skipped', reason: 'invalid URL' };
    }

    const rules = await this.getRobots(parsed.origin);
    if (!isPathAllowed(parsed.pathname, rules)) {
      return { ...base, outcome: 'skipped', reason: 'disallowed by robots.txt' };
    }

    await this.throttle(parsed.host, rules.crawlDelayMs);

    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/pdf;q=0.9,*/*;q=0.5',
    };
    if (prev.etag) headers['If-None-Match'] = prev.etag;
    if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified;

    let res: Response;
    try {
      res = await this.rawFetch(url, { headers });
    } catch (err) {
      return { ...base, outcome: 'error', reason: `fetch failed: ${String(err)}` };
    }

    const etag = res.headers.get('etag');
    const lastModified = res.headers.get('last-modified');
    const contentType = res.headers.get('content-type');

    if (res.status === 304) {
      return { ...base, status: 304, outcome: 'not_modified', etag, lastModified, contentType };
    }
    if (!res.ok) {
      return { ...base, status: res.status, outcome: 'error', reason: `HTTP ${res.status}`, contentType };
    }

    const declared = Number(res.headers.get('content-length') ?? '0');
    if (declared > this.maxBytes) {
      return {
        ...base, status: res.status, outcome: 'skipped', contentType,
        reason: `document too large (${declared} bytes)`,
      };
    }

    const body = Buffer.from(await res.arrayBuffer());
    if (body.byteLength > this.maxBytes) {
      return {
        ...base, status: res.status, outcome: 'skipped', contentType,
        reason: `document too large (${body.byteLength} bytes)`,
      };
    }

    return {
      url, status: res.status, outcome: 'ok', contentType, body,
      etag, lastModified, contentHash: sha256(body), reason: null,
    };
  }

  private async throttle(host: string, crawlDelayMs: number | null): Promise<void> {
    const wait = Math.max(this.delayMs, crawlDelayMs ?? 0);
    const last = this.lastRequestAt.get(host);
    if (last !== undefined) {
      const elapsed = Date.now() - last;
      if (elapsed < wait) await this.sleep(wait - elapsed);
    }
    this.lastRequestAt.set(host, Date.now());
  }

  private async rawFetch(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        ...init,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

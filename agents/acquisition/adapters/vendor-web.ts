// VendorWebAdapter — real discovery over a vendor's allowlisted domains.
//
// Implements the existing SourceAdapter contract unchanged: fetch() returns
// RawFetchedItem[] whose raw_content is the JSON the existing extractor parses.
// Discovered documents and their chunks are collected alongside and read by the
// caller via getDocuments()/getChunks() for the documents/document_chunks tables.

import type { SourceAdapter } from './interface';
import type { AdapterFetchQuery, RawFetchedItem } from '../types';
import type { DocumentRecord, DocumentChunk } from '@/lib/document-types';
import type { EvidenceTier, Technique } from '@/lib/types';
import {
  type VendorSite, isAllowedUrl,
  MAX_PAGES_PER_VENDOR, MAX_DOCUMENTS_PER_VENDOR,
} from '../config/vendor-sites';
import { PoliteFetcher, type FetchedResource } from '../discovery/fetcher';
import { detectDocType, detectTechniques, detectDocumentNumber } from '../discovery/doc-type';
import { parseHtml, parseHtmlSections } from '../extract/html-text';
import { extractPdfText } from '../extract/pdf-text';
import { chunkHtmlSections, chunkPdfPages } from '../extract/chunk';
import { extractTroubleshootingItems } from '../extract/troubleshooting';

/** Change-detection state the caller loads from `documents` before a run. */
export interface KnownDocument {
  url: string;
  content_hash: string | null;
  http_etag: string | null;
  http_last_modified: string | null;
}

export interface VendorWebAdapterOptions {
  fetcher: PoliteFetcher;
  /** Previously stored documents, keyed by URL, for conditional requests. */
  known?: Map<string, KnownDocument>;
  maxPages?: number;
  maxDocuments?: number;
  /**
   * Epoch milliseconds after which this adapter stops starting new requests.
   * Serverless functions have a hard wall-clock limit and a polite crawl is
   * slow by design, so the crawl must be time-bounded, not only page-bounded.
   */
  deadlineAt?: number;
}

export interface VendorRunStat {
  pages_visited: number;
  documents_found: number;
  documents_unchanged: number;
  documents_skipped: number;
  /** True when the crawl stopped on the clock with work left to do. */
  hit_deadline: boolean;
  errors: string[];
}

export class VendorWebAdapter implements SourceAdapter {
  readonly source_id: string;
  readonly source_type = 'vendor' as const;
  readonly display_name: string;

  private readonly site: VendorSite;
  private readonly fetcher: PoliteFetcher;
  private readonly known: Map<string, KnownDocument>;
  private readonly maxPages: number;
  private readonly maxDocuments: number;
  private readonly deadlineAt: number;

  private readonly documents: DocumentRecord[] = [];
  private readonly chunks: DocumentChunk[] = [];
  readonly stat: VendorRunStat = {
    pages_visited: 0, documents_found: 0, documents_unchanged: 0,
    documents_skipped: 0, hit_deadline: false, errors: [],
  };

  constructor(site: VendorSite, opts: VendorWebAdapterOptions) {
    this.site = site;
    this.source_id = site.source_id;
    this.display_name = `${site.vendor} documentation`;
    this.fetcher = opts.fetcher;
    this.known = opts.known ?? new Map();
    this.maxPages = opts.maxPages ?? MAX_PAGES_PER_VENDOR;
    this.maxDocuments = opts.maxDocuments ?? MAX_DOCUMENTS_PER_VENDOR;
    this.deadlineAt = opts.deadlineAt ?? Number.POSITIVE_INFINITY;
  }

  /** True once the time budget is spent; the caller re-queues this vendor. */
  private outOfTime(): boolean {
    if (Date.now() < this.deadlineAt) return false;
    this.stat.hit_deadline = true;
    return true;
  }

  /** Documents discovered during the last fetch(). */
  getDocuments(): DocumentRecord[] {
    return this.documents;
  }

  /** Chunks for the documents discovered during the last fetch(). */
  getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  /**
   * Cheap liveness probe: at least one seed must be reachable and crawlable.
   * A full change check happens per document via ETag/Last-Modified/hash.
   */
  async hasUpdates(_since: string | null): Promise<boolean> {
    for (const seed of this.site.seeds) {
      if (await this.fetcher.isAllowed(seed)) return true;
    }
    return false;
  }

  async fetch(query: AdapterFetchQuery): Promise<RawFetchedItem[]> {
    const wanted = new Set<Technique>(query.techniques);
    const relevant = this.site.techniques.some(t => wanted.has(t));
    if (!relevant) return [];

    const candidates = await this.discover();
    const raw: RawFetchedItem[] = [];

    for (const url of candidates) {
      if (this.documents.length >= this.maxDocuments) break;
      if (this.outOfTime()) break;

      const items = await this.ingest(url, wanted);
      raw.push(...items);
    }

    return raw;
  }

  /** Walk the seed pages and collect links that look like documentation. */
  private async discover(): Promise<string[]> {
    const found = new Set<string>();

    for (const seed of this.site.seeds) {
      if (this.stat.pages_visited >= this.maxPages) break;
      if (this.outOfTime()) break;

      const res = await this.fetcher.get(seed);
      this.stat.pages_visited++;

      if (res.outcome !== 'ok' || !res.body) {
        if (res.outcome === 'error') this.stat.errors.push(`${seed}: ${res.reason ?? 'fetch failed'}`);
        else this.stat.documents_skipped++;
        continue;
      }

      const html = res.body.toString('utf-8');
      const { links } = parseHtml(html, seed);

      for (const link of links) {
        if (found.size >= this.maxDocuments * 3) break;
        if (!isAllowedUrl(link, this.site)) continue;
        if (!looksLikeDocument(link)) continue;
        found.add(stripFragment(link));
      }
    }

    return [...found];
  }

  /** Fetch one candidate, classify it, chunk it and extract troubleshooting items. */
  private async ingest(url: string, wanted: Set<Technique>): Promise<RawFetchedItem[]> {
    const prev = this.known.get(url);
    const res = await this.fetcher.get(url, {
      etag: prev?.http_etag ?? null,
      lastModified: prev?.http_last_modified ?? null,
    });
    this.stat.pages_visited++;

    if (res.outcome === 'not_modified') {
      this.stat.documents_unchanged++;
      return [];
    }
    if (res.outcome !== 'ok' || !res.body) {
      if (res.outcome === 'error') this.stat.errors.push(`${url}: ${res.reason ?? 'fetch failed'}`);
      else this.stat.documents_skipped++;
      return [];
    }
    // Server did not support conditional requests, but the bytes are identical.
    if (prev?.content_hash && prev.content_hash === res.contentHash) {
      this.stat.documents_unchanged++;
      return [];
    }

    const parsed = await this.parseResource(res);
    if (!parsed) {
      this.stat.documents_skipped++;
      return [];
    }

    const { title, headings, chunks: rawChunks, pageCount } = parsed;
    const docType = detectDocType(url, title, headings);
    if (!docType) {
      this.stat.documents_skipped++;
      return [];
    }

    const techniques = detectTechniques(url, title, headings)
      .filter(t => wanted.size === 0 || wanted.has(t));
    if (techniques.length === 0) {
      this.stat.documents_skipped++;
      return [];
    }

    const now = new Date().toISOString();
    const id = buildDocumentId(this.site.vendor, docType, url);
    const model = detectModel(title, headings);

    const document: DocumentRecord = {
      id,
      source_id: this.source_id,
      vendor: this.site.vendor,
      techniques,
      instrument_family: detectFamily(title, headings),
      model,
      doc_type: docType,
      title: title || url,
      document_number: detectDocumentNumber(url, title),
      url,
      language: 'en',
      publication_date: null,
      content_hash: res.contentHash,
      http_etag: res.etag,
      http_last_modified: res.lastModified,
      page_count: pageCount,
      storage_path: null,
      authority_tier: defaultTier(docType, model),
      status: 'active',
      discovered_by: 'crawler',
      first_seen_at: now,
      last_checked_at: now,
      last_changed_at: now,
      ingested_at: null,
    };

    this.documents.push(document);
    this.stat.documents_found++;

    const chunks = rawChunks.map(c => ({ ...c, document_id: id }));
    this.chunks.push(...chunks);

    // Feed the existing knowledge pipeline through the unchanged contract.
    const extracted = extractTroubleshootingItems(chunks, {
      source_id: this.source_id,
      source_type: 'vendor',
      source_title: document.title,
      source_url: url,
      publication_date: null,
      fetched_at: now,
      vendor: this.site.vendor,
      instrument_family: document.instrument_family,
      model,
      techniques,
      doc_type: docType,
    });

    return extracted.map(item => ({
      source_id: this.source_id,
      source_type: 'vendor' as const,
      source_title: document.title,
      source_url: item.source_url,
      publication_date: null,
      fetched_at: now,
      raw_content: JSON.stringify(item),
    }));
  }

  private async parseResource(res: FetchedResource): Promise<{
    title: string;
    headings: string[];
    chunks: DocumentChunk[];
    pageCount: number | null;
  } | null> {
    const body = res.body;
    if (!body) return null;

    const isPdf = (res.contentType ?? '').includes('pdf')
      || body.subarray(0, 5).toString('latin1') === '%PDF-';

    if (isPdf) {
      const pdf = await extractPdfText(body);
      if (!pdf.ok) {
        this.stat.errors.push(`${res.url}: ${pdf.reason ?? 'PDF extraction failed'}`);
        return null;
      }
      const title = pdf.title ?? titleFromUrl(res.url);
      const headings = pdf.pages[0]?.text.split('\n').slice(0, 6) ?? [];
      return {
        title,
        headings,
        chunks: chunkPdfPages('', pdf.pages),
        pageCount: pdf.pageCount,
      };
    }

    const contentType = res.contentType ?? '';
    if (contentType && !contentType.includes('html') && !contentType.includes('text')) return null;

    const html = body.toString('utf-8');
    const { title, headings } = parseHtml(html, res.url);
    const sections = parseHtmlSections(html);
    const chunks = chunkHtmlSections('', sections);
    if (chunks.length === 0) return null;

    return { title: title || titleFromUrl(res.url), headings, chunks, pageCount: null };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

const DOC_LINK_HINTS = /(troubleshoot|manual|guide|application[-_]?note|app[-_]?note|tech(nical)?[-_]?note|service|maintenance|quick[-_]?reference|faq|support|library|literature|\.pdf($|\?))/i;

function looksLikeDocument(url: string): boolean {
  try {
    const u = new URL(url);
    // Skip obvious non-documents.
    if (/\.(jpg|jpeg|png|gif|svg|css|js|zip|exe|mp4|woff2?)($|\?)/i.test(u.pathname)) return false;
    return DOC_LINK_HINTS.test(`${u.pathname}${u.search}`);
  } catch {
    return false;
  }
}

function stripFragment(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

/** Stable, collision-resistant slug: vendor--doctype--path-tail. */
function buildDocumentId(vendor: string, docType: string, url: string): string {
  const slug = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  let tail = url;
  try {
    const u = new URL(url);
    tail = `${u.hostname}${u.pathname}`;
  } catch {
    // Use the raw string when the URL will not parse.
  }
  return `${slug(vendor)}--${slug(docType)}--${slug(tail)}`;
}

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() ?? u.hostname;
    return decodeURIComponent(last).replace(/[-_]+/g, ' ').replace(/\.\w+$/, '').trim();
  } catch {
    return url;
  }
}

/** Tier 1 needs an exact model; family docs are tier 2; notes are tier 5. */
function defaultTier(docType: string, model: string | null): EvidenceTier {
  if (docType === 'application_note' || docType === 'tech_note' || docType === 'article') return 5;
  return model ? 1 : 2;
}

const MODEL_PATTERN = /\b([A-Z]{1,2}\d{4}[A-Z]?|\d{4}\s?(?:Infinity(?:\s?II)?|series)?)\b/;

function detectModel(title: string, headings: string[]): string | null {
  const m = `${title} ${headings.slice(0, 4).join(' ')}`.match(MODEL_PATTERN);
  return m ? m[1].trim() : null;
}

const FAMILY_PATTERNS: Array<[string, RegExp]> = [
  ['Agilent 1200/1260/1290', /\b1[12][0-9]0\b|infinity/i],
  ['Agilent 6100 Series',    /\b61\d{2}\b/],
  ['Waters ACQUITY',         /\bacquity\b/i],
  ['Waters Xevo',            /\bxevo\b/i],
  ['Thermo Vanquish',        /\bvanquish\b/i],
  ['Thermo TSQ',             /\btsq\b/i],
  ['Shimadzu Nexera',        /\bnexera\b/i],
  ['Shimadzu LCMS',          /\blcms-\d{4}\b/i],
  ['Sciex Triple Quad',      /\bqtrap\b|\btriple quad\b/i],
];

function detectFamily(title: string, headings: string[]): string | null {
  const haystack = `${title} ${headings.slice(0, 6).join(' ')}`;
  for (const [family, pattern] of FAMILY_PATTERNS) {
    if (pattern.test(haystack)) return family;
  }
  return null;
}

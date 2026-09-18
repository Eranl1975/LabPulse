// Full-text search over document_chunks, using the same PostgREST pattern as
// readItemsFromSupabase in lib/store.ts. Returns null (not []) when Supabase is
// unavailable, so callers can tell "no backend" from "no matches".

import type { DocumentHit, DocType } from './document-types';
import type { Technique, EvidenceTier } from './types';
import { createLogger } from './logger';

const log = createLogger('document-search');

export interface DocumentSearchQuery {
  text: string;
  technique: Technique;
  vendor: string | null;
  model: string | null;
  limit?: number;
}

export const DEFAULT_SEARCH_LIMIT = 6;
const MAX_EXCERPT_CHARS = 700;

interface ChunkRow {
  document_id: string;
  heading: string | null;
  page_number: number | null;
  text: string;
  documents: {
    title: string;
    vendor: string;
    doc_type: DocType;
    document_number: string | null;
    url: string;
    publication_date: string | null;
    model: string | null;
    techniques: string[];
    authority_tier: number;
    status: string;
  } | null;
}

/**
 * Build the PostgREST query string for a document search.
 * Exported separately so it can be tested without a network call.
 */
export function buildSearchEndpoint(baseUrl: string, q: DocumentSearchQuery): string {
  const terms = toTsQuery(q.text);
  const limit = Math.max(1, Math.min(q.limit ?? DEFAULT_SEARCH_LIMIT, 25));

  const select =
    'document_id,heading,page_number,text,' +
    'documents!inner(title,vendor,doc_type,document_number,url,publication_date,model,techniques,authority_tier,status)';

  const params = [
    `select=${encodeURIComponent(select)}`,
    'documents.status=eq.active',
    `documents.techniques=cs.${encodeURIComponent(`{${q.technique}}`)}`,
    `limit=${limit}`,
  ];

  if (terms) params.push(`tsv=fts.${encodeURIComponent(terms)}`);

  // Vendor isolation: never return one vendor's manual for another's instrument.
  if (q.vendor) params.push(`documents.vendor=ilike.${encodeURIComponent(`%${q.vendor}%`)}`);

  return `${baseUrl.replace(/\/$/, '')}/rest/v1/document_chunks?${params.join('&')}`;
}

/**
 * Search stored vendor documents. Returns null when Supabase is not configured
 * or the query fails, so the caller reports 'unavailable' rather than 'no matches'.
 *
 * The service-role key is required, not optional: `documents` and `document_chunks`
 * have RLS enabled with no anon policy, so an anon key would return an empty list
 * and a misconfiguration would look exactly like a document with no matches.
 */
export async function searchDocuments(q: DocumentSearchQuery): Promise<DocumentHit[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    log.warn('search', 'document search unavailable: SUPABASE_SERVICE_ROLE_KEY is not set');
    return null;
  }

  if (!toTsQuery(q.text)) return [];

  let rows: ChunkRow[];
  try {
    const res = await fetch(buildSearchEndpoint(url, q), {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      log.warn('search', `document search failed: HTTP ${res.status}`);
      return null;
    }
    rows = (await res.json()) as ChunkRow[];
  } catch (err) {
    log.warn('search', `document search error: ${String(err)}`);
    return null;
  }

  return rankHits(rows, q);
}

/** Convert rows to hits, assign per-query tiers and order by authority. */
export function rankHits(rows: ChunkRow[], q: DocumentSearchQuery): DocumentHit[] {
  const hits: DocumentHit[] = [];

  for (const row of rows) {
    const doc = row.documents;
    if (!doc) continue;
    // Defence in depth: the query already filters, but never cite across vendors.
    if (q.vendor && !vendorMatches(doc.vendor, q.vendor)) continue;

    hits.push({
      document_id: row.document_id,
      title: doc.title,
      vendor: doc.vendor,
      doc_type: doc.doc_type,
      document_number: doc.document_number,
      url: doc.url,
      publication_date: doc.publication_date,
      heading: row.heading,
      page_number: row.page_number,
      excerpt: excerpt(row.text),
      tier: resolveTier(doc.authority_tier, doc.model, q.model),
    });
  }

  return hits.sort((a, b) => a.tier - b.tier || a.title.localeCompare(b.title));
}

/**
 * A stored tier is a default. Tier 1 requires the document to match the queried
 * model; otherwise vendor documentation is instrument-family evidence (tier 2).
 */
function resolveTier(stored: number, docModel: string | null, queryModel: string | null): EvidenceTier {
  const base = clampTier(stored);
  if (base > 2) return base;
  if (queryModel && docModel && modelMatches(docModel, queryModel)) return 1;
  return 2;
}

function clampTier(n: number): EvidenceTier {
  const v = Math.round(n);
  return (v >= 1 && v <= 7 ? v : 6) as EvidenceTier;
}

function modelMatches(a: string, b: string): boolean {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

function vendorMatches(docVendor: string, queryVendor: string): boolean {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const d = norm(docVendor);
  const v = norm(queryVendor);
  if (!d || !v) return false;
  return d.includes(v) || v.includes(d);
}

/** Build a websearch-style tsquery: drop noise words and join the rest with AND. */
export function toTsQuery(text: string): string {
  const STOP = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were',
    'has', 'have', 'been', 'but', 'not', 'when', 'what', 'why', 'how', 'our',
    'its', 'into', 'over', 'very', 'any', 'all', 'can', 'get', 'got', 'see',
  ]);

  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP.has(t))
    .slice(0, 8);

  return [...new Set(terms)].join(' & ');
}

function excerpt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= MAX_EXCERPT_CHARS ? clean : `${clean.slice(0, MAX_EXCERPT_CHARS).trimEnd()}…`;
}

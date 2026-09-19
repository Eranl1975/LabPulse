// How many searchable passages each document has.
//
// A document row with no chunks looks identical to a fully searchable one in the
// admin table, and answers silently cannot cite it. These helpers make that
// difference visible.
//
// Counts come from the document_chunk_counts view (migration 022). PostgREST
// aggregate functions are disabled on this project, so counting in the query is
// not an option and the view does it in the database instead.

import { createLogger } from './logger';

const log = createLogger('document-chunk-counts');

export type SearchableState = 'searchable' | 'metadata_only';

export interface DocumentSearchability {
  document_id: string;
  chunk_count: number;
  state: SearchableState;
}

export interface SearchabilitySummary {
  byDocument: Map<string, DocumentSearchability>;
  total: number;
  searchable: number;
  metadataOnly: number;
  /** One line for the admin banner, or null when every document is searchable. */
  banner: string | null;
}

/**
 * Classify each document. A missing entry in `counts` means zero chunks, which
 * is the case this exists to surface, so it is never treated as "unknown".
 */
export function summarizeSearchability(
  documentIds: string[],
  counts: Map<string, number>,
): SearchabilitySummary {
  const byDocument = new Map<string, DocumentSearchability>();
  let searchable = 0;

  for (const id of documentIds) {
    const chunk_count = counts.get(id) ?? 0;
    const state: SearchableState = chunk_count > 0 ? 'searchable' : 'metadata_only';
    if (state === 'searchable') searchable++;
    byDocument.set(id, { document_id: id, chunk_count, state });
  }

  const total = documentIds.length;
  const metadataOnly = total - searchable;

  return {
    byDocument,
    total,
    searchable,
    metadataOnly,
    banner: metadataOnly === 0
      ? null
      : `${metadataOnly} of ${total} document${total === 1 ? '' : 's'} ${metadataOnly === 1 ? 'is' : 'are'} metadata only and cannot be cited yet.`,
  };
}

interface CountRow {
  document_id: string;
  chunk_count: number;
}

/**
 * Read chunk counts from Supabase. Returns null when Supabase is not configured
 * or the view is missing (migration 022 not applied), so the caller can say
 * "counts unavailable" rather than showing every document as metadata only.
 */
export async function fetchChunkCounts(): Promise<Map<string, number> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/document_chunk_counts?select=document_id,chunk_count&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!res.ok) {
      log.warn('counts', `chunk count query failed: HTTP ${res.status} (is migration 022 applied?)`);
      return null;
    }
    const rows = (await res.json()) as CountRow[];
    return new Map(rows.map(r => [r.document_id, Number(r.chunk_count) || 0]));
  } catch (err) {
    log.warn('counts', `chunk count query error: ${String(err)}`);
    return null;
  }
}

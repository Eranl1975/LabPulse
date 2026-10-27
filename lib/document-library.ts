// The manuals LabPulse holds, with how many searchable passages each has.
//
// Supabase is the source of truth: it holds the curated catalogue plus every
// manual an admin added (lib/manual-registration.ts). The on-disk catalogue is
// the fallback when Supabase is not configured, in which case passage counts are
// unknown (null) rather than zero.

import { loadSeedDocuments } from './document-seed';
import { fetchChunkCounts } from './document-chunk-counts';
import type { DocumentRecord } from './document-types';
import { createLogger } from './logger';

const log = createLogger('document-library');

/** Kept short: the visual route shares a 60 s budget with the AI calls. */
const LIBRARY_TIMEOUT_MS = 5_000;

export interface DocumentLibrary {
  documents: DocumentRecord[];
  /** Passages per document id; null when they could not be counted. */
  chunkCounts: Map<string, number> | null;
}

export async function loadDocumentLibrary(): Promise<DocumentLibrary> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { documents: loadSeedDocuments(), chunkCounts: null };

  try {
    const [res, chunkCounts] = await Promise.all([
      fetch(`${url.replace(/\/$/, '')}/rest/v1/documents?status=eq.active&limit=5000`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(LIBRARY_TIMEOUT_MS),
      }),
      fetchChunkCounts(),
    ]);
    if (!res.ok) {
      log.warn('library', `documents query failed: HTTP ${res.status}`);
      return { documents: loadSeedDocuments(), chunkCounts: null };
    }
    return { documents: (await res.json()) as DocumentRecord[], chunkCounts };
  } catch (err) {
    log.warn('library', `documents query error: ${String(err)}`);
    return { documents: loadSeedDocuments(), chunkCounts: null };
  }
}

// GET /api/documents — admin listing of stored vendor documentation.
//
// Query params: page, limit, vendor, technique, doc_type, q (title substring).
// Falls back to the curated catalogue (data/instrument-docs.json) when Supabase
// is not configured, so the admin view is never blank without explanation.
//
// Each item carries `chunk_count` and `searchable`: a document with metadata but
// no passages cannot be cited by an answer, and used to be indistinguishable
// here from a fully searchable one.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { paginate } from '@/lib/pagination';
import { loadSeedDocuments } from '@/lib/document-seed';
import { fetchChunkCounts, summarizeSearchability } from '@/lib/document-chunk-counts';
import { isDocType, type DocumentRecord } from '@/lib/document-types';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api/documents');

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get('page') ?? '1') || 1;
  const limit = Number(sp.get('limit') ?? '25') || 25;
  const vendor = sp.get('vendor')?.trim() || null;
  const technique = sp.get('technique')?.trim() || null;
  const docTypeRaw = sp.get('doc_type')?.trim() || null;
  const q = sp.get('q')?.trim().toLowerCase() || null;

  const docType = docTypeRaw && isDocType(docTypeRaw) ? docTypeRaw : null;
  if (docTypeRaw && !docType) {
    return NextResponse.json({ error: `Unknown doc_type: ${docTypeRaw}` }, { status: 400 });
  }

  const remote = await fetchFromSupabase();
  const source = remote ?? loadSeedDocuments();

  const filtered = source.filter(d =>
    (!vendor    || d.vendor.toLowerCase().includes(vendor.toLowerCase())) &&
    (!technique || d.techniques.some(t => t.toLowerCase() === technique.toLowerCase())) &&
    (!docType   || d.doc_type === docType) &&
    (!q         || d.title.toLowerCase().includes(q)),
  );

  const pageResult = paginate(filtered, page, limit);

  // null means the counts could not be read (no Supabase, or migration 022 not
  // applied). Reported as unknown rather than as "every document is empty".
  const counts = remote ? await fetchChunkCounts() : null;
  const summary = counts ? summarizeSearchability(source.map(d => d.id), counts) : null;

  const items = pageResult.items.map(d => ({
    ...d,
    chunk_count: counts ? counts.get(d.id) ?? 0 : null,
    searchable: counts ? (counts.get(d.id) ?? 0) > 0 : null,
  }));

  return NextResponse.json({
    ...pageResult,
    items,
    source: remote ? 'supabase' : 'seed_catalogue',
    vendors: [...new Set(source.map(d => d.vendor))].sort(),
    searchability: summary
      ? {
          total: summary.total,
          searchable: summary.searchable,
          metadata_only: summary.metadataOnly,
          banner: summary.banner,
        }
      : null,
  });
}

/** Returns null when Supabase is unavailable so the caller can fall back. */
async function fetchFromSupabase(): Promise<DocumentRecord[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/documents?status=eq.active&order=last_changed_at.desc.nullslast&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!res.ok) {
      log.warn('list', `documents query failed: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as DocumentRecord[];
  } catch (err) {
    log.warn('list', `documents query error: ${String(err)}`);
    return null;
  }
}

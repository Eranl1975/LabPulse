// POST /api/documents/ingest — attach passages to a document from a PDF the
// operator already holds. Admin only.
//
// The PDF is NOT uploaded. The browser extracts per-page text with pdf.js and
// posts that text as JSON, for two reasons:
//   - Vercel Hobby caps a serverless request body at about 4.5 MB and a function
//     at 60 s; instrument manuals routinely exceed the body limit as PDFs, while
//     their extracted text does not.
//   - LabPulse stores only the passages needed to search and cite a document,
//     never a redistributable copy of the vendor's file (docs/source-policy.md).
//
// Chunking and persistence are shared with scripts/ingest-pdfs.ts via
// lib/document-ingest.ts; this route adds only transport and validation.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { ingestExtractedPages, validateExtraction } from '@/lib/document-ingest';
import { SupabaseDocumentStore, hasDocumentStoreCredentials } from '@/agents/acquisition/pipeline/document-persist';
import type { PdfPage } from '@/agents/acquisition/extract/pdf-text';
import type { DocumentRecord } from '@/lib/document-types';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
/** The Hobby plan's ceiling; a large manual chunks and writes in well under this. */
export const maxDuration = 60;

const log = createLogger('api/documents/ingest');

/** Keep the body clear of the platform's ~4.5 MB request limit. */
const MAX_TEXT_CHARS = 3_500_000;
const MAX_PAGES = 5_000;

interface IngestBody {
  document_id?: unknown;
  page_count?: unknown;
  pages?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!hasDocumentStoreCredentials()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so documents cannot be written.' },
      { status: 503 },
    );
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const documentId = typeof body.document_id === 'string' ? body.document_id.trim() : '';
  if (!documentId) {
    return NextResponse.json({ error: 'document_id is required.' }, { status: 400 });
  }

  const pages = parsePages(body.pages);
  if (!pages) {
    return NextResponse.json(
      { error: 'pages must be an array of { page: number, text: string }.' },
      { status: 400 },
    );
  }
  if (pages.length > MAX_PAGES) {
    return NextResponse.json({ error: `Too many pages (limit ${MAX_PAGES}).` }, { status: 413 });
  }

  const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
  if (totalChars > MAX_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: `Extracted text is ${Math.round(totalChars / 1000)}k characters, above the ` +
          `${Math.round(MAX_TEXT_CHARS / 1000)}k limit for a single request. ` +
          'Ingest this manual with `npm run ingest:pdfs` instead.',
      },
      { status: 413 },
    );
  }

  const pageCount = Number(body.page_count);
  const extracted = {
    pages,
    pageCount: Number.isFinite(pageCount) && pageCount > 0 ? Math.round(pageCount) : pages.length,
  };

  const invalid = validateExtraction(extracted);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 422 });
  }

  const document = await fetchDocument(documentId);
  if (!document) {
    return NextResponse.json(
      { error: `No active document with id ${documentId}. Ingestion never creates rows.` },
      { status: 404 },
    );
  }

  try {
    const outcome = await ingestExtractedPages(document, extracted, new SupabaseDocumentStore());
    log.info('ingest', `ingested ${outcome.chunks_written} chunk(s) for ${documentId}`);
    return NextResponse.json({ ok: true, ...outcome, title: document.title });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('ingest', `ingest failed for ${documentId}: ${message}`);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

/** Returns null when the payload is not a usable page array. */
function parsePages(raw: unknown): PdfPage[] | null {
  if (!Array.isArray(raw)) return null;

  const pages: PdfPage[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { page, text } = entry as { page?: unknown; text?: unknown };
    if (typeof page !== 'number' || !Number.isFinite(page) || page < 1) return null;
    if (typeof text !== 'string') return null;
    if (text.trim().length === 0) continue;   // blank pages are normal in a manual
    pages.push({ page: Math.round(page), text });
  }
  return pages;
}

async function fetchDocument(id: string): Promise<DocumentRecord | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${url}/rest/v1/documents?id=eq.${encodeURIComponent(id)}&status=eq.active&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`document lookup failed: HTTP ${res.status}`);

  const rows = (await res.json()) as DocumentRecord[];
  return rows[0] ?? null;
}

// Shared ingestion of operator-supplied PDF text.
//
// Both entry points use this: scripts/ingest-pdfs.ts (reads local files) and
// POST /api/documents/ingest (receives text extracted in the browser). Neither
// stores the PDF itself — only the passages needed for search and citation,
// with the vendor URL left in place, per docs/source-policy.md.

import { chunkPdfPages } from '@/agents/acquisition/extract/chunk';
import { sha256 } from '@/agents/acquisition/discovery/fetcher';
import type { PdfPage } from '@/agents/acquisition/extract/pdf-text';
import type { DocumentStore } from '@/agents/acquisition/pipeline/document-persist';
import type { DocumentRecord } from './document-types';

/** Page text plus the PDF's own page total, which may exceed pages.length. */
export interface ExtractedDocument {
  pages: PdfPage[];
  pageCount: number;
}

export interface IngestOutcome {
  document_id: string;
  chunks_written: number;
  page_count: number;
  content_hash: string;
  ingested_at: string;
}

export const NO_TEXT_REASON = 'no extractable text (scanned or image-only PDF)';
export const NO_CHUNKS_REASON = 'text extracted but no passage met the minimum chunk size';

/**
 * Reject input that would silently produce an unsearchable document.
 * Returns a reason string, or null when the pages are usable.
 */
export function validateExtraction(extracted: ExtractedDocument): string | null {
  const withText = extracted.pages.filter(p => p.text.trim().length > 0);
  if (withText.length === 0) return NO_TEXT_REASON;
  return null;
}

/** Stable hash of the extracted text, so a later crawl can tell the content apart. */
export function contentHashOf(pages: PdfPage[]): string {
  return sha256(pages.map(p => `${p.page}:${p.text}`).join('\n\n'));
}

/**
 * Chunk the extracted pages, replace the document's existing chunks, and update
 * the parent row. `discovered_by` is deliberately left as it was: ingesting a
 * PDF by hand does not change how the document was discovered.
 *
 * Throws when the input has no usable text, so neither caller can report success
 * for a document that is still unsearchable.
 */
export async function ingestExtractedPages(
  document: DocumentRecord,
  extracted: ExtractedDocument,
  store: DocumentStore,
  now: string = new Date().toISOString(),
): Promise<IngestOutcome> {
  const invalid = validateExtraction(extracted);
  if (invalid) throw new Error(invalid);

  const pages = extracted.pages.filter(p => p.text.trim().length > 0);
  const chunks = chunkPdfPages(document.id, pages);
  if (chunks.length === 0) throw new Error(NO_CHUNKS_REASON);

  // replaceChunks deletes this document's existing chunks first, so re-ingesting
  // a corrected file replaces rather than duplicates.
  const written = await store.replaceChunks(chunks);

  const content_hash = contentHashOf(pages);
  const page_count = Math.max(extracted.pageCount, ...pages.map(p => p.page));

  await store.upsertDocuments([{
    ...document,
    page_count,
    content_hash,
    ingested_at: now,
  }]);

  return {
    document_id: document.id,
    chunks_written: written,
    page_count,
    content_hash,
    ingested_at: now,
  };
}

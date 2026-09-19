// Browser-side PDF text extraction for the admin upload control.
//
// The PDF never leaves the operator's machine: only the extracted per-page text
// is posted to /api/documents/ingest. That keeps the request far below Vercel's
// ~4.5 MB body limit for a manual that would not fit as a PDF, and avoids
// storing a redistributable copy of the vendor's file.
//
// Text is normalized with the same function the server-side extractor uses, so
// both ingestion paths produce identical chunks for the same document.

import { normalizePdfText, type PdfPage } from '@/agents/acquisition/extract/pdf-text';

export interface BrowserExtraction {
  pages: PdfPage[];
  pageCount: number;
}

/** Thrown for a PDF with no text layer, matching the server-side wording. */
export const NO_TEXT_REASON = 'no extractable text (scanned or image-only PDF)';

type TextItem = { str?: string; hasEOL?: boolean };

/**
 * Extract per-page text from a PDF in the browser.
 * `onPage` reports progress so a 400-page manual does not look frozen.
 */
export async function extractPdfTextInBrowser(
  file: File,
  onPage?: (done: number, total: number) => void,
): Promise<BrowserExtraction> {
  const pdfjs = await import('pdfjs-dist');

  // Webpack emits the worker as an asset and rewrites this URL, so it is served
  // same-origin — the app's CSP allows scripts and workers from 'self' only.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  try {
    const pages: PdfPage[] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();

      const raw = (content.items as TextItem[])
        .map(item => (item.str ?? '') + (item.hasEOL ? '\n' : ''))
        .join('');

      const text = normalizePdfText(raw);
      if (text.length > 0) pages.push({ page: n, text });

      page.cleanup();
      onPage?.(n, doc.numPages);
    }

    if (pages.length === 0) throw new Error(NO_TEXT_REASON);

    return { pages, pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
}

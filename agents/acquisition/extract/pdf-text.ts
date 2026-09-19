// PDF → per-page text via pdf-parse (pdfjs under the hood).
// The import is dynamic so that a missing or broken native dependency degrades
// to a reported failure instead of crashing the whole monthly run.

export interface PdfPage {
  page: number;
  text: string;
}

export interface PdfExtraction {
  ok: boolean;
  pages: PdfPage[];
  pageCount: number;
  title: string | null;
  /** Populated when ok === false. */
  reason: string | null;
}

export async function extractPdfText(data: Buffer): Promise<PdfExtraction> {
  const empty: PdfExtraction = { ok: false, pages: [], pageCount: 0, title: null, reason: null };

  let PDFParse: typeof import('pdf-parse').PDFParse;
  try {
    ({ PDFParse } = await import('pdf-parse'));
  } catch (err) {
    return { ...empty, reason: `pdf-parse unavailable: ${String(err)}` };
  }

  let parser: InstanceType<typeof PDFParse> | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(data) });
    const result = await parser.getText();

    const pages: PdfPage[] = result.pages
      .map(p => ({ page: p.num, text: normalizePdfText(p.text) }))
      .filter(p => p.text.length > 0);

    if (pages.length === 0) {
      return { ...empty, pageCount: result.total, reason: 'no extractable text (scanned or image-only PDF)' };
    }

    let title: string | null = null;
    try {
      const info = await parser.getInfo();
      const raw = (info as { info?: { Title?: unknown } }).info?.Title;
      if (typeof raw === 'string' && raw.trim()) title = raw.trim();
    } catch {
      // Metadata is optional; text extraction already succeeded.
    }

    return { ok: true, pages, pageCount: result.total, title, reason: null };
  } catch (err) {
    return { ...empty, reason: `PDF parse failed: ${String(err)}` };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Nothing actionable if teardown fails.
      }
    }
  }
}

/**
 * PDF text arrives with hard line breaks and hyphenation; rejoin for searchability.
 * Exported so the browser extractor in lib/pdf-text-browser.ts produces identical
 * text, and therefore identical chunks, to this server-side path.
 */
export function normalizePdfText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/-\n(?=[a-z])/g, '')     // de-hyphenate across line breaks
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

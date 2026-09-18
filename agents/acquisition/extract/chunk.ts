// Section-aware chunking. Chunks stay inside one section and carry the heading
// and page number so every answer can cite an exact location.

import type { DocumentChunk } from '@/lib/document-types';
import type { HtmlSection } from './html-text';
import type { PdfPage } from './pdf-text';

export const MIN_CHUNK_CHARS = 200;
export const TARGET_CHUNK_CHARS = 1000;
export const MAX_CHUNK_CHARS = 1400;

interface RawChunk {
  heading: string | null;
  page_number: number | null;
  text: string;
}

/** Split one block of text into target-sized pieces, breaking on paragraph then sentence. */
function splitBlock(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK_CHARS) return [clean];

  const out: string[] = [];
  let current = '';

  const flush = (): void => {
    const t = current.trim();
    if (t) out.push(t);
    current = '';
  };

  for (const para of clean.split(/\n{2,}/)) {
    const units = para.length > MAX_CHUNK_CHARS ? splitSentences(para) : [para];

    for (const unit of units) {
      if (!current) {
        current = unit;
      } else if (current.length + unit.length + 2 <= TARGET_CHUNK_CHARS) {
        current = `${current}\n\n${unit}`;
      } else {
        flush();
        current = unit;
      }

      while (current.length > MAX_CHUNK_CHARS) {
        out.push(current.slice(0, MAX_CHUNK_CHARS).trim());
        current = current.slice(MAX_CHUNK_CHARS).trim();
      }
    }
  }
  flush();

  return out.filter(Boolean);
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?:])\s+(?=[A-Z0-9])/);
  return parts.length > 1 ? parts : text.split(/\n/);
}

function toChunks(document_id: string, raw: RawChunk[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let index = 0;

  for (const r of raw) {
    for (const text of splitBlock(r.text)) {
      // Drop fragments too small to answer anything, unless they carry a heading.
      if (text.length < MIN_CHUNK_CHARS && !r.heading) continue;
      chunks.push({
        document_id,
        chunk_index: index++,
        heading: r.heading,
        page_number: r.page_number,
        text,
      });
    }
  }
  return chunks;
}

export function chunkHtmlSections(document_id: string, sections: HtmlSection[]): DocumentChunk[] {
  return toChunks(document_id, sections.map(s => ({
    heading: s.heading,
    page_number: null,
    text: s.text,
  })));
}

/**
 * Chunk PDF pages. A line that looks like a section heading (short, title-cased
 * or numbered) becomes the heading for the chunks that follow it on that page.
 */
export function chunkPdfPages(document_id: string, pages: PdfPage[]): DocumentChunk[] {
  const raw: RawChunk[] = [];

  for (const page of pages) {
    const lines = page.text.split('\n');
    let heading: string | null = null;
    let buffer: string[] = [];

    const flush = (): void => {
      const text = buffer.join('\n').trim();
      if (text) raw.push({ heading, page_number: page.page, text });
      buffer = [];
    };

    for (const line of lines) {
      if (looksLikeHeading(line)) {
        flush();
        heading = line.trim();
      } else {
        buffer.push(line);
      }
    }
    flush();
  }

  return toChunks(document_id, raw);
}

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/[.!?]$/.test(t)) return false;

  // Numbered sections: "3.2 Troubleshooting the ESI Source"
  if (/^\d+(\.\d+)*\s+\S/.test(t)) return true;
  // All-caps headings
  if (/^[A-Z][A-Z0-9 \-/&(),.]{4,}$/.test(t)) return true;
  // Title Case with few words
  const words = t.split(/\s+/);
  return words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= Math.ceil(words.length * 0.6);
}

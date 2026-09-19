/**
 * Ingest operator-supplied PDFs into document_chunks.
 *
 *   npm run ingest:pdfs -- ./manuals              # ingest a folder
 *   npm run ingest:pdfs -- ./manuals --dry-run    # report matches, write nothing
 *   npm run ingest:pdfs -- ./manuals --recursive  # descend into subfolders
 *
 * Agilent and Restek return HTTP 403 to automated clients, so their curated rows
 * can never gain chunks from a crawl. This is the supported path: a person who
 * may read those public manuals downloads them, and LabPulse ingests the local
 * files. The PDF itself is not stored — only the passages needed to search and
 * cite it, with the vendor URL left in place.
 *
 * The npm script loads .env.local; run it that way rather than calling this file
 * directly, or it will see no environment and refuse to write.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from 'fs';
import path from 'path';
import { extractPdfText } from '../agents/acquisition/extract/pdf-text';
import { chunkPdfPages } from '../agents/acquisition/extract/chunk';
import { SupabaseDocumentStore } from '../agents/acquisition/pipeline/document-persist';
import { matchFileToDocument } from '../lib/document-match';
import { ingestExtractedPages } from '../lib/document-ingest';
import { loadSeedDocuments } from '../lib/document-seed';
import type { DocumentRecord } from '../lib/document-types';

interface FileResult {
  file: string;
  document: string;
  rule: string;
  pages: number;
  chunks: number;
  status: 'ingested' | 'would ingest' | 'unmatched' | 'failed';
  detail: string;
}

function hasCredentials(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function listPdfs(dir: string, recursive: boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...listPdfs(full, true));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      out.push(full);
    }
  }
  return out.sort();
}

/** Documents to match against. Supabase is authoritative; the catalogue is a dry-run stand-in. */
async function loadDocuments(dryRun: boolean): Promise<{ docs: DocumentRecord[]; source: string }> {
  if (hasCredentials()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/rest/v1/documents?status=eq.active&limit=5000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Could not read documents: HTTP ${res.status} ${await res.text()}`);
    return { docs: (await res.json()) as DocumentRecord[], source: 'supabase' };
  }

  if (!dryRun) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to write. ' +
      'Run via `npm run ingest:pdfs` so .env.local is loaded, or add --dry-run.',
    );
  }
  return { docs: loadSeedDocuments(), source: 'curated catalogue (Supabase not configured)' };
}

function printTable(rows: FileResult[]): void {
  const headers = ['File', 'Document', 'Match', 'Pages', 'Chunks', 'Result'];
  const body = rows.map(r => [
    r.file, r.document, r.rule, String(r.pages || '—'), String(r.chunks || '—'),
    r.detail ? `${r.status}: ${r.detail}` : r.status,
  ]);

  const widths = headers.map((h, i) =>
    Math.min(60, Math.max(h.length, ...body.map(b => b[i].length))));

  const line = (cells: string[]): string =>
    cells.map((c, i) => (c.length > widths[i] ? `${c.slice(0, widths[i] - 1)}…` : c.padEnd(widths[i]))).join('  ');

  console.log(line(headers));
  console.log(widths.map(w => '-'.repeat(w)).join('  '));
  for (const b of body) console.log(line(b));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const recursive = args.includes('--recursive');
  const dir = args.find(a => !a.startsWith('--'));

  if (!dir) {
    console.error('Usage: npm run ingest:pdfs -- <folder> [--dry-run] [--recursive]');
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`Not a folder: ${dir}`);
    process.exitCode = 1;
    return;
  }

  const files = listPdfs(dir, recursive);
  if (files.length === 0) {
    console.error(`No *.pdf files in ${dir}${recursive ? ' (recursive)' : ''}.`);
    process.exitCode = 1;
    return;
  }

  const { docs, source } = await loadDocuments(dryRun);
  console.log(`Matching ${files.length} PDF(s) against ${docs.length} document row(s) from ${source}.`);
  if (dryRun) console.log('Dry run: nothing will be written.\n');
  else console.log('');

  const store = dryRun ? null : new SupabaseDocumentStore();
  const results: FileResult[] = [];

  for (const file of files) {
    const name = path.basename(file);
    const match = matchFileToDocument(file, docs);

    if (!match.matched) {
      results.push({
        file: name, document: '—', rule: '—', pages: 0, chunks: 0,
        status: 'unmatched',
        detail: match.reason === 'ambiguous'
          ? `ambiguous (${match.candidates.join(', ')})`
          : 'no document_number or url basename matched',
      });
      continue;
    }

    const doc = match.document;
    const extracted = await extractPdfText(fs.readFileSync(file));

    if (!extracted.ok) {
      results.push({
        file: name, document: doc.id, rule: match.rule, pages: extracted.pageCount, chunks: 0,
        status: 'failed', detail: extracted.reason ?? 'extraction failed',
      });
      continue;
    }

    try {
      if (dryRun) {
        // Chunk without persisting, so the preview reports the real passage count.
        const chunks = chunkPdfPages(doc.id, extracted.pages);
        if (chunks.length === 0) throw new Error('no passage met the minimum chunk size');
        results.push({
          file: name, document: doc.id, rule: match.rule,
          pages: extracted.pageCount, chunks: chunks.length,
          status: 'would ingest', detail: '',
        });
      } else {
        const outcome = await ingestExtractedPages(
          doc,
          { pages: extracted.pages, pageCount: extracted.pageCount },
          store!,
        );
        results.push({
          file: name, document: doc.id, rule: match.rule,
          pages: outcome.page_count, chunks: outcome.chunks_written,
          status: 'ingested', detail: '',
        });
      }
    } catch (err) {
      results.push({
        file: name, document: doc.id, rule: match.rule, pages: extracted.pageCount, chunks: 0,
        status: 'failed', detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  printTable(results);

  const matched = results.filter(r => r.status !== 'unmatched').length;
  const ingested = results.filter(r => r.status === 'ingested' || r.status === 'would ingest').length;
  const chunks = results.reduce((n, r) => n + r.chunks, 0);
  const unmatched = results.filter(r => r.status === 'unmatched').length;
  const failed = results.filter(r => r.status === 'failed');

  console.log(
    `\nmatched ${matched}  ${dryRun ? 'would ingest' : 'ingested'} ${ingested}  ` +
    `chunks ${dryRun ? 'planned' : 'written'} ${chunks}  unmatched ${unmatched}  failed ${failed.length}`,
  );
  for (const f of failed) console.log(`  failed: ${f.file} — ${f.detail}`);

  if (failed.length > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Ingest failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

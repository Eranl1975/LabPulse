/**
 * Download the official manuals listed in data/web-manuals.json and store their
 * text in Supabase, exactly as an admin upload would (Admin -> Documents).
 *
 *   npm run ingest:web-manuals                 # download, extract and store all
 *   npm run ingest:web-manuals -- --dry-run    # download and extract, write nothing
 *   npm run ingest:web-manuals -- --only=Metrohm   # entries whose vendor/title contains the text
 *
 * Only vendor-hosted PDFs are listed. Downloads go through PoliteFetcher, which
 * identifies itself honestly, obeys robots.txt and throttles per host; a vendor
 * that refuses automated clients is reported, never worked around. As with an
 * admin upload, only the extracted passages are stored, not the PDF.
 *
 * Re-running is safe: a manual keeps the same id, and its passages are replaced.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env.local).
 */

import fs from 'fs';
import path from 'path';
import { PoliteFetcher } from '../agents/acquisition/discovery/fetcher';
import { extractPdfText } from '../agents/acquisition/extract/pdf-text';
import { SupabaseDocumentStore, hasDocumentStoreCredentials } from '../agents/acquisition/pipeline/document-persist';
import { ingestExtractedPages } from '../lib/document-ingest';
import { buildManualRecord, type NewManualInput } from '../lib/manual-registration';

interface ManifestEntry extends NewManualInput {
  url: string;
  title: string;
  /** Size cap in MB for an unusually large manual (default MAX_MANUAL_BYTES). */
  max_mb?: number;
}

interface Row {
  title: string;
  techniques: string;
  result: 'stored' | 'ok (dry run)' | 'failed';
  pages: number;
  passages: number;
  detail: string;
}

/** Vendor manuals run to hundreds of pages; allow time and size for them. */
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_MANUAL_BYTES = 60 * 1024 * 1024;

function isPdf(body: Buffer): boolean {
  return body.subarray(0, 5).toString('latin1') === '%PDF-';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.find(a => a.startsWith('--only='))?.slice('--only='.length).toLowerCase() ?? null;

  if (!dryRun && !hasDocumentStoreCredentials()) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run via `npm run ingest:web-manuals`, or add --dry-run.');
  }

  const manifestPath = path.join(process.cwd(), 'data', 'web-manuals.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { manuals: ManifestEntry[] };
  const entries = manifest.manuals.filter(m =>
    !only || `${String(m.vendor)} ${m.title}`.toLowerCase().includes(only));

  const fetcher = new PoliteFetcher({ timeoutMs: DOWNLOAD_TIMEOUT_MS, maxBytes: MAX_MANUAL_BYTES });
  const store = dryRun ? null : new SupabaseDocumentStore();
  const rows: Row[] = [];

  for (const entry of entries) {
    const techniques = Array.isArray(entry.techniques) ? entry.techniques.join(', ') : '';
    const row: Row = { title: entry.title, techniques, result: 'failed', pages: 0, passages: 0, detail: '' };
    rows.push(row);
    process.stdout.write(`- ${entry.title} … `);

    const built = buildManualRecord(entry);
    if ('error' in built) {
      row.detail = `invalid manifest entry: ${built.error}`;
      console.log(row.detail);
      continue;
    }

    try {
      const res = entry.max_mb
        ? await new PoliteFetcher({ timeoutMs: DOWNLOAD_TIMEOUT_MS * 3, maxBytes: entry.max_mb * 1024 * 1024 }).get(entry.url)
        : await fetcher.get(entry.url);
      if (res.outcome !== 'ok' || !res.body) {
        row.detail = res.reason ?? `HTTP ${res.status}`;
        console.log(row.detail);
        continue;
      }
      if (!isPdf(res.body)) {
        row.detail = `not a PDF (${res.contentType ?? 'unknown type'}), likely a login or landing page`;
        console.log(row.detail);
        continue;
      }

      const extracted = await extractPdfText(res.body);
      const text = extracted.pages.filter(p => p.text.trim().length > 0);
      row.pages = extracted.pageCount;
      if (text.length === 0) {
        row.detail = 'no extractable text (scanned or image-only PDF)';
        console.log(row.detail);
        continue;
      }

      if (dryRun || !store) {
        row.result = 'ok (dry run)';
        row.detail = `${(res.body.byteLength / 1024 / 1024).toFixed(1)} MB, ${text.length} pages with text`;
        console.log(row.detail);
        continue;
      }

      // The document row must exist before its passages (foreign key).
      await store.upsertDocuments([built.record]);
      const outcome = await ingestExtractedPages(built.record, { pages: extracted.pages, pageCount: extracted.pageCount }, store);
      row.result = 'stored';
      row.passages = outcome.chunks_written;
      row.pages = outcome.page_count;
      row.detail = built.record.id;
      console.log(`${outcome.chunks_written} passages from ${outcome.page_count} pages`);
    } catch (err) {
      row.detail = err instanceof Error ? err.message : String(err);
      console.log(`failed: ${row.detail}`);
    }
  }

  const ok = rows.filter(r => r.result !== 'failed');
  console.log(`\n${ok.length}/${rows.length} manuals ${dryRun ? 'readable' : 'stored'}, ${ok.reduce((n, r) => n + r.passages, 0)} passages.`);
  const failed = rows.filter(r => r.result === 'failed');
  if (failed.length > 0) {
    console.log('Not stored:');
    for (const r of failed) console.log(`  ${r.title} [${r.techniques}]: ${r.detail}`);
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

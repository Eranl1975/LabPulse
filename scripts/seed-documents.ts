/**
 * Import the curated catalogue (data/instrument-docs.json) into the documents table.
 *
 *   npm run seed:documents              # writes
 *   npm run seed:documents -- --dry-run # prints what it would write
 *
 * The npm script loads .env.local; run it that way rather than calling this file
 * directly, or it will see no environment and refuse to write.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Existing rows are updated in place; the crawler's own rows are untouched.
 */

import { loadSeedDocuments } from '../lib/document-seed';
import { SupabaseDocumentStore } from '../agents/acquisition/pipeline/document-persist';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const docs = loadSeedDocuments();

  if (docs.length === 0) {
    console.error('No documents found in data/instrument-docs.json — nothing to import.');
    process.exitCode = 1;
    return;
  }

  console.log(`Parsed ${docs.length} document(s) from the curated catalogue:`);
  for (const d of docs) {
    console.log(`  [${d.vendor}] ${d.doc_type.padEnd(20)} ${d.document_number ?? '—'}  ${d.title}`);
  }

  if (dryRun) {
    console.log('\nDry run: nothing written.');
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\nNEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to write.');
    process.exitCode = 1;
    return;
  }

  const store = new SupabaseDocumentStore();
  const { inserted, updated } = await store.upsertDocuments(docs);
  console.log(`\nDone: ${inserted} inserted, ${updated} updated.`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});

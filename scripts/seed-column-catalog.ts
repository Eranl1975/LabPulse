/**
 * Load data/column-catalog.ndjson into the column_catalog table.
 *
 *   npm run seed:columns                # upserts every record
 *   npm run seed:columns -- --dry-run   # prints what it would write
 *
 * The npm script loads .env.local; run it that way rather than calling this
 * file directly, or it will see no environment and refuse to write.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — the table
 * has RLS enabled with no write policy, so only the service role can write it.
 *
 * Upserts on natural_key, so re-running after a fresh import updates rows in
 * place and never duplicates a SKU. Rows that have been removed from the
 * spreadsheet are left alone; deleting those is a deliberate, separate act.
 */

import { readFileSync } from 'node:fs';
import { getSupabaseServiceClient } from '../lib/supabase';
import type { CatalogueRecord } from '../lib/column-catalog-import';

const DATA_FILE = 'data/column-catalog.ndjson';
const BATCH = 500;

function loadRecords(): CatalogueRecord[] {
  const text = readFileSync(DATA_FILE, 'utf8');
  const records: CatalogueRecord[] = [];
  let line = 0;
  for (const raw of text.split('\n')) {
    line++;
    if (!raw.trim()) continue;
    try {
      records.push(JSON.parse(raw) as CatalogueRecord);
    } catch {
      throw new Error(`${DATA_FILE}:${line} is not valid JSON`);
    }
  }
  return records;
}

function summarise(records: CatalogueRecord[]): void {
  const tally = (pick: (r: CatalogueRecord) => string) => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[pick(r)] = (counts[pick(r)] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  };
  console.log(`${records.length} record(s) in ${DATA_FILE}`);
  console.log(`  families: ${tally(r => r.families.join('+'))}`);
  console.log(`  kinds:    ${tally(r => r.kind)}`);
  console.log(`  vendors:  ${tally(r => r.vendor)}`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const records = loadRecords();

  if (records.length === 0) {
    console.error(`No records in ${DATA_FILE} — run "npm run import:columns -- <workbook.xlsx>" first.`);
    process.exitCode = 1;
    return;
  }

  summarise(records);

  const keys = new Set(records.map(r => r.natural_key));
  if (keys.size !== records.length) {
    console.error(`Refusing to write: ${records.length - keys.size} duplicate natural_key value(s) in ${DATA_FILE}.`);
    process.exitCode = 1;
    return;
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

  const supabase = getSupabaseServiceClient();
  let written = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const { error } = await supabase
      .from('column_catalog')
      .upsert(chunk, { onConflict: 'natural_key' });

    if (error) {
      console.error(`\nFailed on rows ${i + 1}–${i + chunk.length}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    written += chunk.length;
    process.stdout.write(`\r  upserted ${written}/${records.length}`);
  }

  const { count, error: countError } = await supabase
    .from('column_catalog')
    .select('natural_key', { count: 'exact', head: true });

  console.log(`\nDone: ${written} record(s) upserted.`);
  if (countError) console.warn(`Could not read the row count back: ${countError.message}`);
  else console.log(`column_catalog now holds ${count} row(s).`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

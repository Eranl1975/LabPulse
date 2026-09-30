/**
 * Convert the operator-supplied vendor column table (.xlsx) into the newline
 * delimited catalogue the seeder loads.
 *
 *   npm run import:columns -- "D:/dowloads/chromatography_columns_table.xlsx"
 *   npm run import:columns -- <file.xlsx> --out data/column-catalog.ndjson
 *
 * Reads the workbook without an XLSX dependency: an .xlsx is a ZIP of XML, so
 * the entries are located through the central directory and inflated with zlib.
 * Both inline strings (what Excel and most exporters write for text cells) and
 * the shared string table are supported.
 *
 * The sheet's own header row decides which column is which, so re-exports that
 * reorder columns still import correctly.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import {
  buildCatalogue,
  type RawCatalogueRow,
} from '../lib/column-catalog-import';

// ── Minimal ZIP reader ─────────────────────────────────────────────────────

function readZipEntry(zip: Buffer, wanted: string): string | null {
  // End of central directory: scan back for the signature, then walk entries.
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0 && i > zip.length - 66_000; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('not a ZIP archive (no end-of-central-directory record)');

  const entries = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);

  for (let n = 0; n < entries; n++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('corrupt central directory');
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name === wanted) {
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`corrupt local header for ${name}`);
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const body = zip.subarray(start, start + compressedSize);
      if (method === 0) return body.toString('utf8');
      if (method === 8) return inflateRawSync(body).toString('utf8');
      throw new Error(`unsupported ZIP compression method ${method} for ${name}`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

// ── Sheet parsing ──────────────────────────────────────────────────────────

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

/** Text of every <t> in a fragment, joined — rich text splits across runs. */
function joinText(fragment: string): string {
  const parts = fragment.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g) ?? [];
  return parts.map(p => unescapeXml(p.replace(/<[^>]+>/g, ''))).join('');
}

function sharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const items = xml.match(/<(?:\w+:)?si\b[\s\S]*?<\/(?:\w+:)?si>/g) ?? [];
  return items.map(joinText);
}

function columnLetter(ref: string): string {
  return ref.replace(/\d+/g, '');
}

function parseRow(row: string, strings: string[]): Record<string, string> {
  const cells = row.match(/<(?:\w+:)?c\b[\s\S]*?(?:\/>|<\/(?:\w+:)?c>)/g) ?? [];
  const out: Record<string, string> = {};
  for (const cell of cells) {
    const ref = cell.match(/r="([A-Z]+\d+)"/)?.[1];
    if (!ref) continue;
    const type = cell.match(/t="(\w+)"/)?.[1];
    let value: string;
    if (type === 's') {
      const index = Number(cell.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] ?? NaN);
      value = strings[index] ?? '';
    } else if (cell.includes('<x:is>') || cell.includes('<is>')) {
      value = joinText(cell);
    } else {
      const raw = cell.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      value = raw === undefined ? joinText(cell) : unescapeXml(raw);
    }
    out[columnLetter(ref)] = value.trim();
  }
  return out;
}

// ── Header mapping ─────────────────────────────────────────────────────────
// Keyed on the Hebrew headers the operator's sheet ships with; the English
// aliases let an exported/translated sheet import unchanged.

const HEADERS: Array<[keyof RawCatalogueRow, RegExp]> = [
  ['name', /^שם הקולונה$|^column name$/i],
  ['vendor', /^יצרן$|^manufacturer$|^vendor$/i],
  ['part_number', /^מק״ט יצרן$|^מק"ט יצרן$|^part ?number$/i],
  ['length_lc_mm', /אורך LC|length.*\(mm\)/i],
  ['length_gc_m', /אורך GC|length.*\(m\)/i],
  ['id_mm', /^קוטר פנימי|inner diameter|^id /i],
  ['particle_um', /גודל חלקיקים|particle size/i],
  ['pore_a', /גודל נקבוביות|pore size/i],
  ['film_um', /עובי פילם|film thickness/i],
  ['separation_mode', /שיטת הפרדה|separation mode/i],
  ['phase', /פאזה|phase|chemistry/i],
  ['item_type', /סוג פריט|item type/i],
  ['bed_volume_ml', /נפח מצע|bed volume/i],
  ['mesh', /^mesh$/i],
  ['ph_range', /טווח pH|ph range/i],
  ['temperature', /טמפרטורה|temperature/i],
  ['max_pressure', /לחץ מרבי|max.*pressure/i],
  ['ion_capacity', /קיבולת חילוף יונים|ion.*capacity/i],
  ['mw_range', /משקל מולקולרי|molecular weight/i],
  ['ship_solvent', /ממס אריזה|shipping solvent/i],
  ['hardware', /חומר הקולונה|hardware/i],
  ['usp', /^usp$/i],
  ['pack', /אריזה לפי המקור|pack/i],
  ['notes', /^הערות$|^notes$/i],
  ['extra', /פרטים נוספים|additional details/i],
  ['source_name', /שם מקור|source name/i],
  ['source_url', /^קישור מקור$|^source url$/i],
  ['collected', /תאריך איסוף|collected/i],
];

const EMPTY_ROW: RawCatalogueRow = {
  name: '', vendor: '', part_number: '', length_lc_mm: '', length_gc_m: '', id_mm: '',
  particle_um: '', pore_a: '', film_um: '', separation_mode: '', phase: '', item_type: '',
  bed_volume_ml: '', mesh: '', ph_range: '', temperature: '', max_pressure: '', ion_capacity: '',
  mw_range: '', ship_solvent: '', hardware: '', usp: '', pack: '', notes: '', extra: '',
  source_name: '', source_url: '', collected: '',
};

function mapHeader(header: Record<string, string>): Partial<Record<keyof RawCatalogueRow, string>> {
  const mapping: Partial<Record<keyof RawCatalogueRow, string>> = {};
  for (const [letter, label] of Object.entries(header)) {
    const hit = HEADERS.find(([, pattern]) => pattern.test(label.trim()));
    if (hit && !mapping[hit[0]]) mapping[hit[0]] = letter;
  }
  return mapping;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2).filter(a => a !== '--');
  const source = args.find(a => !a.startsWith('--'));
  const outIndex = args.indexOf('--out');
  const out = (outIndex === -1 ? undefined : args[outIndex + 1]) ?? 'data/column-catalog.ndjson';

  if (!source) {
    console.error('Usage: npm run import:columns -- <workbook.xlsx> [--out data/column-catalog.ndjson]');
    process.exitCode = 1;
    return;
  }

  const zip = readFileSync(source);
  const sheet = readZipEntry(zip, 'xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('xl/worksheets/sheet1.xml not found in the workbook');
  const strings = sharedStrings(readZipEntry(zip, 'xl/sharedStrings.xml'));

  const rows = sheet.match(/<(?:\w+:)?row\b[\s\S]*?<\/(?:\w+:)?row>/g) ?? [];
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || dataRows.length === 0) throw new Error('the sheet has no data rows');

  const mapping = mapHeader(parseRow(headerRow, strings));
  const missing = (['name', 'vendor', 'separation_mode'] as const).filter(k => !mapping[k]);
  if (missing.length) throw new Error(`header row is missing: ${missing.join(', ')}`);

  const raw: RawCatalogueRow[] = dataRows.map(row => {
    const cells = parseRow(row, strings);
    const record = { ...EMPTY_ROW };
    for (const [field, letter] of Object.entries(mapping)) {
      record[field as keyof RawCatalogueRow] = cells[letter!] ?? '';
    }
    return record;
  });

  const { records, skipped, duplicates } = buildCatalogue(raw);

  writeFileSync(out, records.map(r => JSON.stringify(r)).join('\n') + '\n');

  const tally = (pick: (r: typeof records[number]) => string) => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[pick(r)] = (counts[pick(r)] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  };

  console.log(`Read ${raw.length} sheet rows from ${source}`);
  console.log(`Wrote ${records.length} catalogue records to ${out}`);
  console.log(`  families: ${tally(r => r.families.join('+'))}`);
  console.log(`  kinds:    ${tally(r => r.kind)}`);
  console.log(`  vendors:  ${tally(r => r.vendor)}`);
  if (duplicates) console.log(`  collapsed ${duplicates} duplicate row(s) by natural key`);
  const dropped = Object.entries(skipped).map(([k, v]) => `${k} ${v}`).join(', ');
  if (dropped) console.log(`  skipped (not a column): ${dropped}`);
}

main();

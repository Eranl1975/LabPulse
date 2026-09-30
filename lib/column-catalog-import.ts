// ── Column catalogue import ─────────────────────────────────────────────────
// Normalises the operator-supplied vendor column table (one row per catalogue
// SKU) into the records stored in `column_catalog`, and decides two things the
// spreadsheet does not state outright:
//
//   * which technique family (or families) a row belongs to, so the picker can
//     offer a GC column to a GC user and never to an IC user;
//   * whether the row is a column at all — the vendor tables also list
//     connectors, spacers, collets, empty self-pack hardware and screening
//     kits, which must not show up as stationary phases.
//
// A row can legitimately belong to two families: Daicel's chiral columns are
// sold for HPLC *and* SFC, and a GPC/SEC column is run on an LC stack. Such a
// row is stored once and tagged with both families, which is what keeps the
// catalogue free of duplicates while still appearing "in the right place".

import type { ColumnFamily } from './column-catalog';

export type CatalogueKind =
  | 'analytical'
  | 'prep'
  | 'guard'
  | 'cartridge'
  | 'family'      // a product line listed without a specific SKU
  | 'kit'         // method development / validation kit, several columns in a box
  | 'accessory'   // connector, spacer, collet, O-ring …
  | 'hardware'    // empty column for self-packing
  | 'other';

/** The kinds that represent a column an operator actually runs. */
export const IMPORTABLE_KINDS: readonly CatalogueKind[] = ['analytical', 'prep', 'guard', 'cartridge', 'family'];

/** Raw row as read from the spreadsheet: every cell is a trimmed string. */
export interface RawCatalogueRow {
  name: string;
  vendor: string;
  part_number: string;
  length_lc_mm: string;
  length_gc_m: string;
  id_mm: string;
  particle_um: string;
  pore_a: string;
  film_um: string;
  separation_mode: string;
  phase: string;
  item_type: string;
  bed_volume_ml: string;
  mesh: string;
  ph_range: string;
  temperature: string;
  max_pressure: string;
  ion_capacity: string;
  mw_range: string;
  ship_solvent: string;
  hardware: string;
  usp: string;
  pack: string;
  notes: string;
  extra: string;
  source_name: string;
  source_url: string;
  collected: string;
}

export interface CatalogueRecord {
  /** Deterministic identity: vendor + name + part number + dimensions. */
  natural_key: string;
  name: string;
  vendor: string;
  part_number: string | null;
  /** Vendor product line ("AdvanceBio SEC"), null when the source row has none. */
  product_line: string | null;
  families: ColumnFamily[];
  kind: CatalogueKind;
  /** Column length in mm (LC, IC, SFC, SEC). GC lengths live in length_m. */
  length_mm: number | null;
  length_m: number | null;
  id_mm: number | null;
  particle_um: number | null;
  pore_a: number | null;
  film_um: number | null;
  bed_volume_ml: number | null;
  separation_mode: string | null;
  phase: string | null;
  item_type: string | null;
  mesh: string | null;
  ph_range: string | null;
  temperature: string | null;
  max_pressure: string | null;
  ion_capacity: string | null;
  mw_range: string | null;
  ship_solvent: string | null;
  hardware: string | null;
  usp: string | null;
  pack: string | null;
  notes: string | null;
  /** Everything the source row carried that has no column of its own. */
  attributes: Record<string, string>;
  /** The unstructured remainder of the source row, kept verbatim. */
  source_row: string | null;
  source_name: string | null;
  source_url: string | null;
  collected: string | null;
}

// ── Kind ───────────────────────────────────────────────────────────────────

const ACCESSORY = /connector|spacer|hardware kit|collet|coupler|fitting|holder|ferrule|\bnut\b|union|adapt(?:er|or)|tubing|\bplug\b|wrench|tool ?kit|o-ring|quick connect|assembly/i;
const SELF_PACK = /empty (?:hplc |gc |)column|self[- ]pack/i;

export function classifyKind(row: RawCatalogueRow): CatalogueKind {
  const type = row.item_type.toLowerCase();
  const name = row.name.toLowerCase();

  if (ACCESSORY.test(name)) return 'accessory';
  if (SELF_PACK.test(name) || /media self packing/i.test(row.separation_mode)) return 'hardware';
  if (/kit|ערכה/.test(type)) return 'kit';
  if (/משפחת קולונות/.test(type)) return 'family';
  if (/guard|trap|הגנה|מלכודת/.test(type)) return 'guard';
  if (/prep/.test(type)) return 'prep';
  if (/cartridge/.test(type)) return 'cartridge';
  if (/analytical|capillary|קולונה/.test(type)) return 'analytical';
  return 'other';
}

// ── Family ─────────────────────────────────────────────────────────────────

const IC_MODE = /\bic\b|ion exclusion|(?:an|cat)ion exchange ic/;
const SEC_MODE = /\bsec\b|gpc/;
const FPLC_MODE = /affinity|\bhic\b|hydrophobic interaction|\biex\b|ion exchange|\brpc\b|desalting/;
const LC_MODE =
  /hplc|reversed|normal phase|hilic|chiral|mixed-?mode|oligonucleotide|peptide|protein|glycan|amino acid|carbohydrate|organic acid|surfactant|\bpah\b|pfas|fatty acid|monoclonal|\blc\b|ip-rp|media/;

/**
 * The families a row may be selected under. GC is exclusive — a capillary
 * column is never an LC column — while chiral LC/SFC phases and GPC/SEC
 * packings legitimately belong to two.
 */
export function classifyFamilies(row: RawCatalogueRow): ColumnFamily[] {
  const mode = row.separation_mode.toLowerCase();
  const families = new Set<ColumnFamily>();

  // GC is decided by the sheet's own GC-only columns as well as the mode.
  if (mode === 'gc' || row.length_gc_m || row.film_um) {
    families.add('gc');
    return [...families];
  }

  if (IC_MODE.test(mode)) families.add('ic');
  if (/sfc/.test(mode)) families.add('sfc');
  if (SEC_MODE.test(mode)) { families.add('sec'); families.add('lc'); }
  // Cytiva-style prepacked resins are bed-volume rated, not particle rated:
  // those belong to the FPLC picker, not to HPLC.
  if (FPLC_MODE.test(mode) && row.bed_volume_ml) families.add('sec');
  if (LC_MODE.test(mode)) families.add('lc');

  if (families.size === 0) {
    if (FPLC_MODE.test(mode)) families.add('sec');
    else families.add('lc');
  }
  return [...families].sort();
}

// ── Normalisation ──────────────────────────────────────────────────────────

/** A plain decimal, or null — ranges such as "60–160" are kept as attributes. */
function num(value: string): number | null {
  const text = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function text(value: string): string | null {
  const t = value.trim();
  return t === '' ? null : t;
}

// Restating a value that already has its own column only inflates the file and
// invites the two copies to disagree.
const REDUNDANT_ATTRIBUTES = new Set([
  'Manufacturer', 'Brand', 'Column Length', 'Column ID', 'Length', 'ID', 'Particle Size',
  'Pore Size', 'Package Size', 'qty.', 'Hardware Type', 'Hardware Material', 'Application',
  'USP Code', 'Temperature Range', 'Temp. Limits', 'pH Range', 'df', 'Separation Mode',
]);

// A plausible attribute label: a few words, not a sentence and not a value that
// happens to contain a colon.
const LABEL = /^([A-Za-z][A-Za-z0-9 .#%()/-]{0,28}):\s*(.+)$/;

// Some source lines pack several labels before a single colon ("ID df: 0.25
// 0.25"), which would otherwise become a nonsense attribute key. Only labels
// the vendor tables actually use are promoted; anything else stays verbatim.
const KNOWN_ATTRIBUTES = new Set([
  'Selectivity', 'Selectivity Manufacturer', 'Endcapping', 'Particle', 'Particle Shape',
  'Particle Type', 'Surface Area', 'Bonding Type', 'Carbon Load', 'Pore Volume', 'Accessories',
  'Description', 'Column Config', 'Material', 'Mesh', 'OD', 'Modification', 'Includes', 'Size',
  'Note', 'Similar to Part #',
]);

/**
 * The source sheet's free-text column is "Key: value; Key: value" for some
 * vendors and a raw copy of the catalogue line for others, so parse what is
 * structured and hand back the rest verbatim rather than dropping it.
 */
export function parseExtra(extra: string): { attributes: Record<string, string>; leftover: string | null } {
  const attributes: Record<string, string> = {};
  const leftover: string[] = [];

  for (const segment of extra.split(';')) {
    const part = segment.trim();
    if (!part) continue;
    const match = LABEL.exec(part);
    if (!match) { leftover.push(part); continue; }
    const [, key, value] = match;
    if (REDUNDANT_ATTRIBUTES.has(key)) continue;
    if (KNOWN_ATTRIBUTES.has(key)) attributes[key] = value.trim();
    else leftover.push(part);
  }

  return { attributes, leftover: leftover.length ? leftover.join('; ') : null };
}

/** The vendor's product line ("Brand"), which is how a catalogue is browsed. */
export function parseProductLine(extra: string): string | null {
  const brand = extra.match(/(?:^|;\s*)Brand:\s*([^;]+)/)?.[1]?.trim();
  return brand ? brand : null;
}

export function normaliseRow(row: RawCatalogueRow): CatalogueRecord {
  const { attributes, leftover } = parseExtra(row.extra);

  // Keep dimension values the sheet gives as ranges rather than dropping them.
  const keepRaw = (field: keyof RawCatalogueRow, label: string) => {
    const raw = row[field].trim();
    if (raw && num(raw) === null) attributes[label] ??= raw;
  };
  keepRaw('particle_um', 'Particle size (as published)');
  keepRaw('pore_a', 'Pore size (as published)');

  const natural_key = [
    row.vendor, row.name, row.part_number,
    row.length_lc_mm, row.length_gc_m, row.id_mm, row.particle_um, row.film_um, row.pack,
  ].map(v => v.trim().toLowerCase()).join('|');

  return {
    natural_key,
    name: row.name.trim(),
    vendor: row.vendor.trim(),
    part_number: text(row.part_number),
    product_line: parseProductLine(row.extra),
    families: classifyFamilies(row),
    kind: classifyKind(row),
    length_mm: num(row.length_lc_mm),
    length_m: num(row.length_gc_m),
    id_mm: num(row.id_mm),
    particle_um: num(row.particle_um),
    pore_a: num(row.pore_a),
    film_um: num(row.film_um),
    bed_volume_ml: num(row.bed_volume_ml),
    separation_mode: text(row.separation_mode),
    phase: text(row.phase),
    item_type: text(row.item_type),
    mesh: text(row.mesh),
    ph_range: text(row.ph_range),
    temperature: text(row.temperature),
    max_pressure: text(row.max_pressure),
    ion_capacity: text(row.ion_capacity),
    mw_range: text(row.mw_range),
    ship_solvent: text(row.ship_solvent),
    hardware: text(row.hardware),
    usp: text(row.usp),
    pack: text(row.pack),
    notes: text(row.notes),
    attributes,
    source_row: leftover,
    source_name: text(row.source_name),
    source_url: text(row.source_url),
    collected: text(row.collected),
  };
}

export interface ImportSummary {
  records: CatalogueRecord[];
  skipped: Record<string, number>;
  duplicates: number;
}

/**
 * Normalise every row, drop what is not a column, and keep one record per
 * natural key so a re-import can never double-insert the same SKU.
 */
export function buildCatalogue(rows: RawCatalogueRow[]): ImportSummary {
  const records: CatalogueRecord[] = [];
  const skipped: Record<string, number> = {};
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    if (!row.name.trim()) { skipped.unnamed = (skipped.unnamed ?? 0) + 1; continue; }
    const record = normaliseRow(row);
    if (!IMPORTABLE_KINDS.includes(record.kind)) {
      skipped[record.kind] = (skipped[record.kind] ?? 0) + 1;
      continue;
    }
    if (seen.has(record.natural_key)) { duplicates++; continue; }
    seen.add(record.natural_key);
    records.push(record);
  }

  return { records, skipped, duplicates };
}

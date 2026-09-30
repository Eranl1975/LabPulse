import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  classifyKind,
  classifyFamilies,
  parseExtra,
  parseProductLine,
  normaliseRow,
  buildCatalogue,
  IMPORTABLE_KINDS,
  type RawCatalogueRow,
  type CatalogueRecord,
} from '@/lib/column-catalog-import';
import { COLUMN_FAMILIES } from '@/lib/column-catalog';
import { partsFromHit, hitSummary, type CatalogueHit } from '@/lib/column-catalog-hits';

const BLANK: RawCatalogueRow = {
  name: '', vendor: '', part_number: '', length_lc_mm: '', length_gc_m: '', id_mm: '',
  particle_um: '', pore_a: '', film_um: '', separation_mode: '', phase: '', item_type: '',
  bed_volume_ml: '', mesh: '', ph_range: '', temperature: '', max_pressure: '', ion_capacity: '',
  mw_range: '', ship_solvent: '', hardware: '', usp: '', pack: '', notes: '', extra: '',
  source_name: '', source_url: '', collected: '',
};
const row = (over: Partial<RawCatalogueRow>): RawCatalogueRow => ({ ...BLANK, ...over });

describe('classifyKind', () => {
  it('recognises the column kinds an operator runs', () => {
    expect(classifyKind(row({ name: 'ZORBAX Eclipse Plus C18', item_type: 'Analytical Column' }))).toBe('analytical');
    expect(classifyKind(row({ name: 'Rtx-5', item_type: 'קולונה' }))).toBe('analytical');
    expect(classifyKind(row({ name: 'DB-5 guard', item_type: 'Guard Column' }))).toBe('guard');
    expect(classifyKind(row({ name: 'Rtx-5 trap', item_type: 'קולונת הגנה / מלכודת' }))).toBe('guard');
    expect(classifyKind(row({ name: 'SunFire Prep', item_type: 'Preparative Column' }))).toBe('prep');
    expect(classifyKind(row({ name: 'Poroshell cartridge', item_type: 'Cartridge Column' }))).toBe('cartridge');
    expect(classifyKind(row({ name: 'Zebron ZB-1', item_type: 'משפחת קולונות' }))).toBe('family');
  });

  it('keeps hardware and kits out of the stationary-phase list', () => {
    expect(classifyKind(row({ name: 'Agilent Column Connector (ZGC System), ea.' }))).toBe('accessory');
    expect(classifyKind(row({ name: 'Agilent Cartridge Spacer (RR System), 15mm, ea.' }))).toBe('accessory');
    expect(classifyKind(row({ name: 'InfinityLab Quick Connect Assembly, SS, 0.12 x 150mm' }))).toBe('accessory');
    expect(classifyKind(row({ name: 'Agilent PrepHT, Replacement O-ring, 21.2mm Cartridge' }))).toBe('accessory');
    expect(classifyKind(row({ name: 'Agilent Empty HPLC Column, 1µm, 4.6 x 100mm' }))).toBe('hardware');
    expect(classifyKind(row({ name: 'CHIRALPAK screening set', item_type: 'Method Validation Kit' }))).toBe('kit');
  });

  it('never marks a non-column as importable', () => {
    for (const name of ['Agilent Column Connector, ea.', 'Agilent Empty HPLC Column, 5µm']) {
      expect(IMPORTABLE_KINDS).not.toContain(classifyKind(row({ name })));
    }
  });
});

describe('classifyFamilies', () => {
  it('puts a GC column in the GC picker and nowhere else', () => {
    expect(classifyFamilies(row({ separation_mode: 'GC', length_gc_m: '30', film_um: '0.25' }))).toEqual(['gc']);
    // Film thickness alone identifies a capillary column even without the mode.
    expect(classifyFamilies(row({ film_um: '1.4' }))).toEqual(['gc']);
    expect(classifyFamilies(row({ length_gc_m: '60' }))).toEqual(['gc']);
  });

  it('offers a chiral phase sold for both HPLC and SFC under both', () => {
    expect(classifyFamilies(row({ separation_mode: 'HPLC / SFC' }))).toEqual(['lc', 'sfc']);
    expect(classifyFamilies(row({ separation_mode: 'NORMAL PHASE AND SFC' }))).toEqual(['lc', 'sfc']);
    expect(classifyFamilies(row({ separation_mode: 'SFC' }))).toEqual(['sfc']);
  });

  it('offers a GPC/SEC packing to both the LC and the SEC picker', () => {
    expect(classifyFamilies(row({ separation_mode: 'GPC/SEC' }))).toEqual(['lc', 'sec']);
    expect(classifyFamilies(row({ separation_mode: 'SEC / GPC' }))).toEqual(['lc', 'sec']);
  });

  it('sends bed-volume rated FPLC resins to the SEC/FPLC picker', () => {
    expect(classifyFamilies(row({ separation_mode: 'Affinity', bed_volume_ml: '5' }))).toEqual(['sec']);
    expect(classifyFamilies(row({ separation_mode: 'HIC', bed_volume_ml: '1' }))).toEqual(['sec']);
    // An HIC *column* rated by particle size is an LC column, not an FPLC one.
    expect(classifyFamilies(row({ separation_mode: 'Hydrophobic Interaction (HIC)', particle_um: '3.5' }))).toEqual(['sec']);
  });

  it('routes ion chromatography modes to the IC picker', () => {
    expect(classifyFamilies(row({ separation_mode: 'IC / anion exchange' }))).toEqual(['ic']);
    expect(classifyFamilies(row({ separation_mode: 'IC / Ion exclusion' }))).toEqual(['ic']);
    expect(classifyFamilies(row({ separation_mode: 'IC' }))).toEqual(['ic']);
  });

  it('defaults to LC rather than dropping a row with an unfamiliar mode', () => {
    expect(classifyFamilies(row({ separation_mode: 'Something new' }))).toEqual(['lc']);
    expect(classifyFamilies(row({ separation_mode: '' }))).toEqual(['lc']);
  });
});

describe('parseExtra', () => {
  it('parses the structured "Key: value" form', () => {
    const { attributes, leftover } = parseExtra('Endcapping: yes; Particle Type: Core-Shell');
    expect(attributes).toEqual({ Endcapping: 'yes', 'Particle Type': 'Core-Shell' });
    expect(leftover).toBeNull();
  });

  it('drops values that already have a column of their own', () => {
    const { attributes } = parseExtra('Manufacturer: Agilent; Column Length: 100 mm; Selectivity: C18');
    expect(attributes).toEqual({ Selectivity: 'C18' });
  });

  it('keeps free-text source lines verbatim instead of inventing attributes', () => {
    const line = 'COATED ANALYTICAL COLUMNS - 10 µm 4.6 mm I.D.';
    const { attributes, leftover } = parseExtra(line);
    expect(attributes).toEqual({});
    expect(leftover).toBe(line);
  });

  it('does not turn a run of labels into a nonsense key', () => {
    const { attributes, leftover } = parseExtra('ID df: 0.25 0.25');
    expect(attributes).toEqual({});
    expect(leftover).toBe('ID df: 0.25 0.25');
  });

  it('reads the vendor product line', () => {
    expect(parseProductLine('Manufacturer: Agilent; Brand: AdvanceBio SEC; Selectivity: C18')).toBe('AdvanceBio SEC');
    expect(parseProductLine('no brand here')).toBeNull();
  });
});

describe('normaliseRow', () => {
  const waters = row({
    name: 'XBridge Premier Oligonucleotide BEH C18 with VanGuard FIT',
    vendor: 'Waters', part_number: '186010760',
    length_lc_mm: '50', id_mm: '4.6', particle_um: '2.5', pore_a: '300',
    separation_mode: 'IP-RP LC', phase: 'C18', item_type: 'קולונה',
  });

  it('normalises dimensions to numbers and keeps the family and kind', () => {
    const record = normaliseRow(waters);
    expect(record.length_mm).toBe(50);
    expect(record.id_mm).toBe(4.6);
    expect(record.particle_um).toBe(2.5);
    expect(record.pore_a).toBe(300);
    expect(record.length_m).toBeNull();
    expect(record.families).toEqual(['lc']);
    expect(record.kind).toBe('analytical');
    expect(record.part_number).toBe('186010760');
  });

  it('keeps a published range instead of discarding it', () => {
    const record = normaliseRow(row({ name: 'Capto Core 400', particle_um: '60–160', pore_a: '<10' }));
    expect(record.particle_um).toBeNull();
    expect(record.attributes['Particle size (as published)']).toBe('60–160');
    expect(record.attributes['Pore size (as published)']).toBe('<10');
  });

  it('builds a natural key that is stable and dimension-aware', () => {
    const a = normaliseRow(waters);
    const b = normaliseRow({ ...waters, length_lc_mm: '150' });
    expect(a.natural_key).toBe(normaliseRow({ ...waters }).natural_key);
    expect(a.natural_key).not.toBe(b.natural_key);
    expect(a.natural_key).toContain('186010760');
  });
});

describe('buildCatalogue', () => {
  it('drops non-columns and reports what it dropped', () => {
    const { records, skipped } = buildCatalogue([
      row({ name: 'Rtx-5', item_type: 'קולונה', separation_mode: 'GC', length_gc_m: '30' }),
      row({ name: 'Agilent Column Connector, ea.' }),
      row({ name: 'Screening kit', item_type: 'Method Validation Kit' }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]!.name).toBe('Rtx-5');
    expect(skipped).toEqual({ accessory: 1, kit: 1 });
  });

  it('keeps one record per natural key so a re-import cannot duplicate a SKU', () => {
    const one = row({ name: 'Kinetex C18', vendor: 'Phenomenex', part_number: '00F-4601', length_lc_mm: '150', id_mm: '4.6', item_type: 'Analytical Column' });
    const { records, duplicates } = buildCatalogue([one, { ...one }, { ...one, length_lc_mm: '100' }]);
    expect(records).toHaveLength(2);
    expect(duplicates).toBe(1);
  });

  it('ignores rows with no column name', () => {
    const { records, skipped } = buildCatalogue([row({ name: '   ' })]);
    expect(records).toHaveLength(0);
    expect(skipped.unnamed).toBe(1);
  });
});

// ── The shipped dataset ────────────────────────────────────────────────────

const DATA_FILE = 'data/column-catalog.ndjson';

describe('data/column-catalog.ndjson', () => {
  const records: CatalogueRecord[] = existsSync(DATA_FILE)
    ? readFileSync(DATA_FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as CatalogueRecord)
    : [];

  it('ships the imported vendor catalogue', () => {
    expect(records.length).toBeGreaterThan(7000);
  });

  it('gives every record a name, a vendor, an importable kind and at least one family', () => {
    const families = Object.keys(COLUMN_FAMILIES);
    for (const record of records) {
      expect(record.name.length, record.natural_key).toBeGreaterThan(0);
      expect(record.vendor.length, record.natural_key).toBeGreaterThan(0);
      expect(IMPORTABLE_KINDS, record.name).toContain(record.kind);
      expect(record.families.length, record.name).toBeGreaterThan(0);
      for (const family of record.families) expect(families, record.name).toContain(family);
    }
  });

  it('has no duplicate natural key', () => {
    const keys = new Set(records.map(r => r.natural_key));
    expect(keys.size).toBe(records.length);
  });

  it('never mixes GC with a liquid-phase family', () => {
    for (const record of records) {
      if (record.families.includes('gc')) expect(record.families, record.name).toEqual(['gc']);
    }
  });

  it('covers every picker family', () => {
    for (const family of Object.keys(COLUMN_FAMILIES)) {
      const count = records.filter(r => r.families.includes(family as never)).length;
      expect(count, `${family} has no catalogue rows`).toBeGreaterThan(100);
    }
  });

  it('includes the reported Waters oligonucleotide SKU with its dimensions', () => {
    const hit = records.find(r => r.part_number === '186010760');
    expect(hit, 'Waters 186010760 missing from the dataset').toBeDefined();
    expect(hit!.vendor).toBe('Waters');
    expect(hit!.id_mm).toBe(4.6);
    expect(hit!.particle_um).toBe(2.5);
    expect(hit!.pore_a).toBe(300);
    expect(hit!.families).toContain('lc');
  });
});

// ── Picker mapping ─────────────────────────────────────────────────────────

describe('a catalogue hit fills the picker', () => {
  const base: CatalogueHit = {
    natural_key: 'k', name: 'Rxi-5Sil MS', vendor: 'Restek', product_line: null, part_number: '13623',
    kind: 'analytical', length_mm: null, length_m: 30, id_mm: 0.25, particle_um: null,
    pore_a: null, film_um: 0.25, phase: '5% phenyl', separation_mode: 'GC',
  };

  it('maps a GC hit onto length, inner diameter and film thickness', () => {
    expect(partsFromHit('gc', base)).toEqual({ length: '30', id: '0.25', film: '0.25', particle: '' });
  });

  it('maps an LC hit onto length, inner diameter and particle size', () => {
    const lc: CatalogueHit = { ...base, name: 'XBridge Premier Oligonucleotide BEH C18', length_m: null, length_mm: 150, particle_um: 2.5, film_um: null, pore_a: 300 };
    expect(partsFromHit('lc', lc)).toEqual({ length: '150', id: '0.25', film: '', particle: '2.5' });
  });

  it('accepts numerics that arrive as strings', () => {
    expect(partsFromHit('lc', { ...base, length_mm: '100.0', id_mm: '2.1', particle_um: '1.70', length_m: null })).toEqual(
      { length: '100', id: '2.1', film: '', particle: '1.7' },
    );
  });

  it('summarises a hit the way the column is written', () => {
    expect(hitSummary(base)).toBe('30 m × 0.25 mm, 0.25 µm film');
    expect(hitSummary({ ...base, length_m: null, length_mm: 150, id_mm: 4.6, film_um: null, particle_um: 2.5, pore_a: 300 }))
      .toBe('150 × 4.6 mm, 2.5 µm, 300 Å');
  });
});

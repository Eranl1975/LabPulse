import { describe, it, expect } from 'vitest';
import {
  COLUMN_FAMILIES,
  getColumnFamily,
  getColumnFamilySpec,
  composeColumnString,
  parseColumnString,
  columnContextKeys,
  groupPhasesByChemistry,
  EMPTY_COLUMN_PARTS,
} from '@/lib/column-catalog';
import { detectMissingInfo } from '@/lib/missing-info-detector';
import { getContextSchema } from '@/lib/context-schemas';
import { TECHNIQUE_OPTIONS } from '@/components/query-form-options';

describe('column families', () => {
  it('maps every chromatographic technique to a family', () => {
    expect(getColumnFamily('GC')).toBe('gc');
    expect(getColumnFamily('GCMS')).toBe('gc');
    expect(getColumnFamily('HPLC')).toBe('lc');
    expect(getColumnFamily('UHPLC')).toBe('lc');
    expect(getColumnFamily('LCMS')).toBe('lc');
    expect(getColumnFamily('IC')).toBe('ic');
    expect(getColumnFamily('SFC')).toBe('sfc');
    expect(getColumnFamily('FPLC')).toBe('sec');
  });

  it('returns null for techniques that have no column', () => {
    expect(getColumnFamily('XRD')).toBeNull();
    expect(getColumnFamily('SEM')).toBeNull();
    expect(getColumnFamily('DSC')).toBeNull();
  });

  it('gives every family exactly three dimensions with options', () => {
    for (const spec of Object.values(COLUMN_FAMILIES)) {
      expect(spec.dimensions).toHaveLength(3);
      for (const dim of spec.dimensions) {
        expect(dim.options.length).toBeGreaterThan(2);
        expect(dim.unit).toBeTruthy();
      }
      expect(spec.phases.length).toBeGreaterThan(10);
    }
  });

  it('gives GC length, inner diameter and film thickness', () => {
    expect(COLUMN_FAMILIES.gc.dimensions.map(d => d.key)).toEqual(['length', 'id', 'film']);
  });

  it('gives LC length, inner diameter and particle size', () => {
    expect(COLUMN_FAMILIES.lc.dimensions.map(d => d.key)).toEqual(['length', 'id', 'particle']);
  });

  it('has no duplicate phase names within a family', () => {
    for (const spec of Object.values(COLUMN_FAMILIES)) {
      const names = spec.phases.map(p => p.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('every technique whose schema has a column field resolves to a family', () => {
    for (const technique of TECHNIQUE_OPTIONS) {
      const hasColumnField = getContextSchema(technique).fields.some(f => f.key === 'column');
      if (hasColumnField) {
        expect(getColumnFamilySpec(technique), `${technique} has a column field but no catalogue family`).not.toBeNull();
      }
    }
  });
});

describe('composeColumnString', () => {
  it('composes a GC column the way a GC column is written', () => {
    expect(composeColumnString('gc', {
      ...EMPTY_COLUMN_PARTS, phase: 'DB-5ms', length: '30', id: '0.25', film: '0.25',
    })).toBe('DB-5ms 30 m × 0.25 mm × 0.25 µm');
  });

  it('composes an LC column the way an LC column is written', () => {
    expect(composeColumnString('lc', {
      ...EMPTY_COLUMN_PARTS, phase: 'Zorbax Eclipse Plus C18', length: '150', id: '4.6', particle: '3.5',
    })).toBe('Zorbax Eclipse Plus C18 150 × 4.6 mm, 3.5 µm');
  });

  it('omits the dimensions that were not chosen', () => {
    expect(composeColumnString('gc', { ...EMPTY_COLUMN_PARTS, phase: 'DB-WAX' })).toBe('DB-WAX');
    expect(composeColumnString('lc', { ...EMPTY_COLUMN_PARTS, phase: 'Kinetex C18', particle: '2.6' }))
      .toBe('Kinetex C18 2.6 µm');
  });

  it('produces an empty string when nothing was entered', () => {
    expect(composeColumnString('gc', EMPTY_COLUMN_PARTS)).toBe('');
  });
});

describe('parseColumnString', () => {
  it('round-trips a composed GC column', () => {
    const parts = { ...EMPTY_COLUMN_PARTS, phase: 'DB-5ms', length: '30', id: '0.25', film: '0.25' };
    expect(parseColumnString('gc', composeColumnString('gc', parts))).toEqual(parts);
  });

  it('round-trips a composed LC column', () => {
    const parts = { ...EMPTY_COLUMN_PARTS, phase: 'ACQUITY UPLC BEH C18', length: '100', id: '2.1', particle: '1.7' };
    expect(parseColumnString('lc', composeColumnString('lc', parts))).toEqual(parts);
  });

  it('recovers the parts from a hand-typed column', () => {
    const parsed = parseColumnString('gc', 'HP-5ms 30m x 0.25mm x 0.25um');
    expect(parsed.length).toBe('30');
    expect(parsed.id).toBe('0.25');
    expect(parsed.film).toBe('0.25');
    expect(parsed.phase).toBe('HP-5ms');
  });

  it('returns empty parts for empty input', () => {
    expect(parseColumnString('lc', '   ')).toEqual(EMPTY_COLUMN_PARTS);
  });
});

describe('columnContextKeys', () => {
  it('publishes film thickness for GC and particle size for LC', () => {
    expect(Object.keys(columnContextKeys('gc'))).toContain('column_film');
    expect(Object.keys(columnContextKeys('lc'))).toContain('column_particle');
  });
});

describe('groupPhasesByChemistry', () => {
  it('groups without losing or reordering entries', () => {
    const groups = groupPhasesByChemistry(COLUMN_FAMILIES.gc.phases);
    expect(groups.length).toBeGreaterThan(3);
    expect(groups.flatMap(g => g.phases)).toHaveLength(COLUMN_FAMILIES.gc.phases.length);
  });
});

describe('a catalogue selection satisfies the column critical-field check', () => {
  it('clears the missing-column cap for GC', () => {
    const column = composeColumnString('gc', {
      ...EMPTY_COLUMN_PARTS, phase: 'DB-5ms', length: '30', id: '0.25', film: '0.25',
    });
    const result = detectMissingInfo(
      {
        technique: 'GC', vendor: 'Agilent', model: '7890B', issue_category: null,
        symptom_description: 'ghost peaks', method_conditions: null, already_checked: [],
        column,
      },
      'GC',
    );
    expect(result.critical_missing).not.toContain('column');
  });
});

describe('catalogue coverage', () => {
  const REPORTED = 'XBridge Premier Oligonucleotide BEH C18 300Å';

  it('lists the reported Waters oligonucleotide column', () => {
    const phase = COLUMN_FAMILIES.lc.phases.find(p => p.name === REPORTED);
    expect(phase, `${REPORTED} missing from the LC catalogue`).toBeDefined();
    expect(phase!.vendor).toBe('Waters');
  });

  it('can express the reported column at its catalogue dimensions', () => {
    const { length, id, particle } = Object.fromEntries(
      COLUMN_FAMILIES.lc.dimensions.map(d => [d.key, d.options]),
    ) as Record<'length' | 'id' | 'particle', string[]>;
    expect(length).toContain('150');
    expect(id).toContain('4.6');
    expect(particle).toContain('2.5');

    const parts = { ...EMPTY_COLUMN_PARTS, phase: REPORTED, length: '150', id: '4.6', particle: '2.5' };
    const composed = composeColumnString('lc', parts);
    expect(composed).toBe(`${REPORTED} 150 × 4.6 mm, 2.5 µm`);
    expect(parseColumnString('lc', composed)).toEqual(parts);
  });

  it('keeps every family broad enough to find a real column in', () => {
    const minimum: Record<string, number> = { gc: 150, lc: 150, ic: 40, sfc: 25, sec: 50 };
    for (const [family, spec] of Object.entries(COLUMN_FAMILIES)) {
      expect(spec.phases.length, `${family} catalogue shrank`).toBeGreaterThanOrEqual(minimum[family]);
    }
  });

  it('covers the vendors a lab actually buys from, in each family', () => {
    const expected: Record<string, string[]> = {
      gc: ['Agilent J&W', 'Restek', 'Phenomenex', 'Thermo Scientific', 'Trajan (SGE)'],
      lc: ['Waters', 'Agilent', 'Thermo Scientific', 'Phenomenex', 'Shimadzu', 'Merck', 'YMC'],
      ic: ['Thermo Scientific', 'Metrohm', 'Shodex', 'Hamilton'],
      sfc: ['Waters', 'Daicel', 'Phenomenex'],
      sec: ['Cytiva', 'Tosoh', 'Agilent', 'Waters'],
    };
    for (const [family, vendors] of Object.entries(expected)) {
      const present = new Set(COLUMN_FAMILIES[family as keyof typeof COLUMN_FAMILIES].phases.map(p => p.vendor));
      for (const vendor of vendors) {
        expect(present.has(vendor), `${family} catalogue has no ${vendor} column`).toBe(true);
      }
    }
  });

  it('covers the modern LC product classes, not just small-molecule reversed phase', () => {
    const groups = groupPhasesByChemistry(COLUMN_FAMILIES.lc.phases).map(g => g.chemistry);
    for (const chemistry of [
      'Reversed phase — oligonucleotide / nucleic acid',
      'Reversed phase — peptide / protein (wide pore)',
      'Mixed-mode',
      'GPC / polymer SEC',
      'Preparative',
    ]) {
      expect(groups, `LC catalogue is missing the ${chemistry} group`).toContain(chemistry);
    }
  });

  it('offers affinity, HIC and desalting columns to FPLC users', () => {
    const groups = groupPhasesByChemistry(COLUMN_FAMILIES.sec.phases).map(g => g.chemistry);
    for (const chemistry of ['Affinity (FPLC)', 'Hydrophobic interaction (FPLC)', 'Desalting / buffer exchange']) {
      expect(groups, `SEC/FPLC catalogue is missing the ${chemistry} group`).toContain(chemistry);
    }
  });

  it('gives IC users carbohydrate and ion-exclusion columns', () => {
    const groups = groupPhasesByChemistry(COLUMN_FAMILIES.ic.phases).map(g => g.chemistry);
    expect(groups).toContain('Carbohydrate (HPAE-PAD)');
    expect(groups).toContain('Ion exclusion');
  });

  it('describes every entry well enough for the picker to be useful', () => {
    for (const spec of Object.values(COLUMN_FAMILIES)) {
      for (const phase of spec.phases) {
        expect(phase.name.trim()).toBe(phase.name);
        expect(phase.name.length).toBeGreaterThan(1);
        expect(phase.vendor.length).toBeGreaterThan(1);
        expect(phase.chemistry.length).toBeGreaterThan(1);
        expect(phase.description.length, `${phase.name} has no description`).toBeGreaterThan(8);
      }
    }
  });

  it('gives every technique with a column field a catalogue worth browsing', () => {
    for (const technique of TECHNIQUE_OPTIONS) {
      const hasColumnField = getContextSchema(technique).fields.some(f => f.key === 'column');
      if (!hasColumnField) continue;
      const spec = getColumnFamilySpec(technique);
      expect(spec, `${technique} has a column field but no catalogue family`).not.toBeNull();
      expect(spec!.phases.length, `${technique} sees only ${spec!.phases.length} phases`).toBeGreaterThanOrEqual(25);
    }
  });
});

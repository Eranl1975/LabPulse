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

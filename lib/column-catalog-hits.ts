// ── Catalogue search hits ───────────────────────────────────────────────────
// The shape /api/columns/search returns, and the pure mapping from a vendor SKU
// onto the picker's phase + dimension fields. Kept out of the component so both
// the client and the tests can use it.

import type { ColumnFamily, ColumnParts } from './column-catalog';

/** A row from the SKU-level catalogue in Supabase (column_catalog, migration 028). */
export interface CatalogueHit {
  natural_key: string;
  name: string;
  vendor: string;
  product_line: string | null;
  part_number: string | null;
  kind: string;
  length_mm: number | string | null;
  length_m: number | string | null;
  id_mm: number | string | null;
  particle_um: number | string | null;
  pore_a: number | string | null;
  film_um: number | string | null;
  phase: string | null;
  separation_mode: string | null;
}

/** Numerics arrive as JSON numbers or strings; the selects hold plain strings. */
export function dimension(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

/** The dimension parts a catalogue SKU implies, per family. */
export function partsFromHit(family: ColumnFamily, hit: CatalogueHit): Omit<ColumnParts, 'phase'> {
  return family === 'gc'
    ? {
        length: dimension(hit.length_m),
        id: dimension(hit.id_mm),
        film: dimension(hit.film_um),
        particle: '',
      }
    : {
        length: dimension(hit.length_mm),
        id: dimension(hit.id_mm),
        film: '',
        particle: dimension(hit.particle_um),
      };
}

/** "150 × 4.6 mm, 2.5 µm, 300 Å" — the one-line summary shown next to a hit. */
export function hitSummary(hit: CatalogueHit): string {
  const parts: string[] = [];
  const lengthMm = dimension(hit.length_mm);
  const lengthM = dimension(hit.length_m);
  const id = dimension(hit.id_mm);
  if (lengthM) parts.push(id ? `${lengthM} m × ${id} mm` : `${lengthM} m`);
  else if (lengthMm) parts.push(id ? `${lengthMm} × ${id} mm` : `${lengthMm} mm`);
  else if (id) parts.push(`${id} mm i.d.`);
  const particle = dimension(hit.particle_um);
  const film = dimension(hit.film_um);
  const pore = dimension(hit.pore_a);
  if (particle) parts.push(`${particle} µm`);
  if (film) parts.push(`${film} µm film`);
  if (pore) parts.push(`${pore} Å`);
  return parts.join(', ');
}

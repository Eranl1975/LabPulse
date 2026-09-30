// GET /api/columns/search?family=lc&q=xbridge%20oligo&limit=25
//
// Searches the SKU-level column catalogue (column_catalog, migration 028) that
// backs the "search all columns" box in the column picker. The in-bundle
// catalogue in lib/column-catalog.ts still covers browsing by chemistry; this
// route is what finds a specific column by name, part number or dimensions.
//
// Never fails the caller: when the table or the environment is absent the
// response is an empty result with available:false, and the picker falls back
// to the curated list and free text.

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { COLUMN_FAMILIES, type ColumnFamily } from '@/lib/column-catalog';

const FAMILIES = Object.keys(COLUMN_FAMILIES) as ColumnFamily[];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;
const MAX_TERMS = 5;

const FIELDS = [
  'natural_key', 'name', 'vendor', 'product_line', 'part_number', 'families', 'kind',
  'length_mm', 'length_m', 'id_mm', 'particle_um', 'pore_a', 'film_um', 'bed_volume_ml',
  'separation_mode', 'phase', 'item_type', 'ph_range', 'temperature', 'max_pressure',
  'mw_range', 'usp', 'hardware', 'pack', 'notes', 'source_name', 'source_url',
].join(',');

/**
 * PostgREST reads `,` `.` `(` `)` and `*` as filter syntax, so a search term is
 * reduced to the characters a column name can contain before it is interpolated.
 */
function sanitiseTerm(term: string): string {
  return term.replace(/[^\p{L}\p{N}µÅ+\-/\s]/gu, ' ').trim();
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const family = params.get('family');
  if (!family || !FAMILIES.includes(family as ColumnFamily)) {
    return NextResponse.json(
      { error: `family must be one of: ${FAMILIES.join(', ')}` },
      { status: 400 },
    );
  }

  const rawLimit = Number(params.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT) : DEFAULT_LIMIT;

  const terms = (params.get('q') ?? '')
    .split(/\s+/)
    .map(sanitiseTerm)
    .filter(Boolean)
    .slice(0, MAX_TERMS);

  try {
    let query = getSupabaseServiceClient()
      .from('column_catalog')
      .select(FIELDS, { count: 'exact' })
      .contains('families', [family]);

    // Each term must match somewhere; PostgREST ANDs successive filters, so the
    // per-term OR groups combine into "all terms present".
    for (const term of terms) {
      query = query.or(
        ['name', 'part_number', 'product_line', 'phase', 'vendor']
          .map(column => `${column}.ilike.*${term}*`)
          .join(','),
      );
    }

    // 'analytical' sorts first, which is what an operator usually wants; guards
    // and prep hardware follow.
    const { data, count, error } = await query
      .order('kind', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      // 42P01 = table missing (migration 028 not applied yet).
      const missing = error.code === '42P01';
      if (!missing) console.error('[columns/search]', error.message);
      return NextResponse.json({ available: false, columns: [], total: 0 });
    }

    return NextResponse.json({
      available: true,
      columns: data ?? [],
      total: count ?? (data?.length ?? 0),
      truncated: (count ?? 0) > (data?.length ?? 0),
    });
  } catch (err) {
    // Missing Supabase environment, network failure — degrade, do not 500.
    console.error('[columns/search]', err instanceof Error ? err.message : err);
    return NextResponse.json({ available: false, columns: [], total: 0 });
  }
}

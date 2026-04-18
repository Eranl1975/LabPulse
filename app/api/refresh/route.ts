// POST /api/refresh — triggers the monthly acquisition pipeline.
//
// Body (all optional):
//   dry_run:    boolean  — run without writing to DB (default: false)
//   since:      string   — ISO date; skip sources unchanged since this date
//   techniques: string[] — restrict to specific techniques
//   primary_only: boolean — vendor + scientific only, exclude community (default: false)
//
// Uses MockPersistenceAdapter when Supabase env vars are absent.

import { NextRequest, NextResponse } from 'next/server';
import {
  runAcquisitionPipeline,
  formatReport,
  MockPersistenceAdapter,
  SupabasePersistenceAdapter,
  getConfiguredAdapters,
  getPrimaryAdapters,
  type PersistenceAdapter,
} from '@/agents/acquisition';
import type { Technique } from '@/lib/types';

const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS']);

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dry_run      = body.dry_run      === true;
  const primary_only = body.primary_only === true;
  const since        = typeof body.since === 'string' ? body.since : null;

  let techniques: Technique[] | undefined;
  if (Array.isArray(body.techniques)) {
    techniques = (body.techniques as unknown[])
      .filter((t): t is Technique => typeof t === 'string' && VALID_TECHNIQUES.has(t as Technique));
    if (techniques.length === 0) techniques = undefined;
  }

  // Select persistence adapter: Supabase if env vars present, otherwise mock.
  let persistence: PersistenceAdapter;
  const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (hasSupabase && !dry_run) {
    try {
      persistence = new SupabasePersistenceAdapter();
    } catch {
      persistence = new MockPersistenceAdapter();
    }
  } else {
    persistence = new MockPersistenceAdapter();
  }

  const adapters = primary_only ? getPrimaryAdapters() : getConfiguredAdapters();

  let result;
  try {
    result = await runAcquisitionPipeline(adapters, persistence, {
      since,
      dry_run,
      techniques,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Pipeline failed: ${String(err)}` },
      { status: 500 },
    );
  }

  const { report, stats, next_priorities } = result;

  return NextResponse.json({
    run_date:          stats.run_date,
    dry_run,
    persistence_mode:  hasSupabase && !dry_run ? 'supabase' : 'mock',

    // What changed
    changed: {
      items_new:      stats.items_new,
      items_updated:  stats.items_updated,
      items_deprecated: stats.items_deprecated,
    },

    // What was skipped
    skipped: {
      sources_unchanged:    stats.sources_skipped_unchanged,
      items_duplicate:      stats.items_duplicate,
      items_weak_source:    stats.items_skipped_weak_source,
    },

    // Contradictions found
    contradictions: stats.contradictions_found,

    // Knowledge gaps
    knowledge_gaps: stats.knowledge_gaps,

    // Next recommended update priorities
    next_priorities,

    // Full report + formatted text
    report,
    formatted_report: formatReport(report),

    // Pipeline stats for debugging
    stats,
  });
}

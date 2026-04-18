import { NextRequest, NextResponse } from 'next/server';
import { rankItems } from '@/agents/ranking/index';
import { present }   from '@/agents/presentation/index';
import { readItems } from '@/lib/store';
import type { RankingQuery } from '@/agents/ranking/types';
import type { Technique } from '@/lib/types';

const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS']);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const technique = body.technique as Technique;
  if (!technique || !VALID_TECHNIQUES.has(technique)) {
    return NextResponse.json(
      { error: 'technique is required and must be one of: LCMS, HPLC, GC, GCMS' },
      { status: 400 },
    );
  }

  const symptom_description = typeof body.symptom_description === 'string'
    ? body.symptom_description.trim()
    : '';
  if (!symptom_description) {
    return NextResponse.json({ error: 'symptom_description is required' }, { status: 400 });
  }

  const query: RankingQuery = {
    technique,
    vendor:              typeof body.vendor === 'string' ? body.vendor.trim() || null : null,
    model:               typeof body.model === 'string'  ? body.model.trim()  || null : null,
    issue_category:      typeof body.issue_category === 'string' ? body.issue_category.trim() || null : null,
    symptom_description,
    method_conditions:   typeof body.method_conditions === 'string' ? body.method_conditions.trim() || null : null,
    already_checked:     Array.isArray(body.already_checked) ? body.already_checked.filter((s): s is string => typeof s === 'string') : [],
  };

  const ranked = rankItems(query, readItems());

  return NextResponse.json({
    ranked_answer: ranked,
    modes: {
      concise:  present(ranked, 'concise'),
      standard: present(ranked, 'standard'),
      deep:     present(ranked, 'deep'),
      manager:  present(ranked, 'manager'),
    },
  });
}

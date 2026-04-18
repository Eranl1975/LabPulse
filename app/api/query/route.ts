import { NextRequest, NextResponse } from 'next/server';
import { rankItems } from '@/agents/ranking/index';
import { present }   from '@/agents/presentation/index';
import { readItems } from '@/lib/store';
import { aiAnswerFallback } from '@/lib/ai-fallback';
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

  let ranked = rankItems(query, readItems());

  // AI fallback: when rule-based system finds no matching knowledge items,
  // ask Claude (trained on scientific literature + instrument docs) for an answer.
  if (ranked.confidence === 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      ranked = await aiAnswerFallback(query);
    } catch (err) {
      // If AI call fails, return the original empty result rather than crashing
      console.error('[ai-fallback] error:', err);
    }
  }

  return NextResponse.json({
    ranked_answer: ranked,
    ai_assisted: ranked.evidence_summary.some(e => e.source_id === 'claude-opus-4-6'),
    modes: {
      concise:  present(ranked, 'concise'),
      standard: present(ranked, 'standard'),
      deep:     present(ranked, 'deep'),
      manager:  present(ranked, 'manager'),
    },
  });
}

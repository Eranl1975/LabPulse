import { NextRequest, NextResponse } from 'next/server';
import { rankItems } from '@/agents/ranking/index';
import { present }   from '@/agents/presentation/index';
import { readItems } from '@/lib/store';
import { aiAnswerFallback } from '@/lib/ai-fallback';
import { getUser, getProfile } from '@/lib/auth';
import { hasAppAccess } from '@/lib/auth-shared';
import { checkQueryRateLimit } from '@/lib/rate-limit';
import { sanitizeAnswer } from '@/lib/sanitize';
import type { RankingQuery } from '@/agents/ranking/types';
import type { Technique } from '@/lib/types';

const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC']);

const FREE_TIER_DAILY_LIMIT = 5;

export async function POST(req: NextRequest) {
  // Require authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in to use LabPulse.' }, { status: 401 });
  }

  // Enforce subscription gating
  const profile = await getProfile();
  if (profile && !hasAppAccess(profile)) {
    if (profile.role === 'blocked_user') {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
    }
    if (profile.role === 'trial_user') {
      return NextResponse.json(
        { error: 'Your trial has expired. Please upgrade to continue.', upgrade_url: '/upgrade' },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  // Rate limit trial users
  if (profile && profile.role === 'trial_user') {
    const allowed = checkQueryRateLimit(user.id, FREE_TIER_DAILY_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: `Daily query limit (${FREE_TIER_DAILY_LIMIT}) reached. Upgrade for unlimited queries.`, upgrade_url: '/upgrade' },
        { status: 429, headers: { 'Retry-After': '86400' } },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const technique = body.technique as Technique;
  if (!technique || !VALID_TECHNIQUES.has(technique)) {
    return NextResponse.json(
      { error: 'technique is required and must be one of: LCMS, HPLC, GC, GCMS, UHPLC, IC, CE, SFC, TGA, DSC, FPLC, SPPS, XRD, DLS, Titration, KF, KFO, CD, SEM, Sputter, BET, SECMALS, TEM, Raman, ssNMR, NMR, PrepLC' },
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

  const AI_ONLY_TECHNIQUES = new Set<Technique>(['UHPLC', 'IC', 'CE', 'SFC', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC']);
  let ranked = rankItems(query, readItems());

  // AI fallback: when rule-based system has no/low confidence matches, OR when
  // the technique is outside the rule-based knowledge base (IC, CE, SFC, UHPLC),
  // ask Claude (trained on scientific literature + instrument docs) for an answer.
  const needsAI = ranked.confidence < 0.4 || AI_ONLY_TECHNIQUES.has(query.technique);
  if (needsAI && process.env.ANTHROPIC_API_KEY) {
    try {
      ranked = await aiAnswerFallback(query);
    } catch (err) {
      // If AI call fails, return the original empty result rather than crashing
      console.error('[ai-fallback] error:', err);
    }
  }

  // Sanitize AI-generated content to prevent XSS
  const sanitized = sanitizeAnswer(ranked);

  return NextResponse.json({
    ranked_answer: sanitized,
    ai_assisted: sanitized.evidence_summary.some(e => e.source_id.startsWith('claude-')),
    modes: {
      concise:  present(sanitized, 'concise'),
      standard: present(sanitized, 'standard'),
      deep:     present(sanitized, 'deep'),
      manager:  present(sanitized, 'manager'),
    },
  });
}

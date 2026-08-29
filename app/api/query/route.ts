import { NextRequest, NextResponse } from 'next/server';
import { rankItems, rankItemsV2 } from '@/agents/ranking/index';
import { present }   from '@/agents/presentation/index';
import { readItems } from '@/lib/store';
import { aiAnswerFallback, aiAnswerFallbackV2 } from '@/lib/ai-fallback';
import { getUser, getProfile } from '@/lib/auth';
import { hasAppAccess } from '@/lib/auth-shared';
import { checkQueryRateLimit } from '@/lib/rate-limit';
import { sanitizeAnswer } from '@/lib/sanitize';
import { runQualityChecks } from '@/lib/quality-control';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { Technique, RankedAnswerV2 } from '@/lib/types';

const VALID_TECHNIQUES = new Set<Technique>(['LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC', 'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC']);

const FREE_TIER_DAILY_LIMIT = 5;

function optStr(val: unknown): string | null {
  return typeof val === 'string' ? val.trim() || null : null;
}

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

  // Build V2 query with extended context fields
  const query: RankingQueryV2 = {
    technique,
    vendor:              optStr(body.vendor),
    model:               optStr(body.model),
    issue_category:      optStr(body.issue_category),
    symptom_description,
    method_conditions:   optStr(body.method_conditions),
    already_checked:     Array.isArray(body.already_checked) ? body.already_checked.filter((s): s is string => typeof s === 'string') : [],
    // Extended context fields (V2)
    analyte:             optStr(body.analyte),
    sample_matrix:       optStr(body.sample_matrix),
    column:              optStr(body.column),
    mobile_phase:        optStr(body.mobile_phase),
    flow_rate:           optStr(body.flow_rate),
    injection_volume:    optStr(body.injection_volume),
    gradient:            optStr(body.gradient),
    retention_time:      optStr(body.retention_time),
    ionization_mode:     optStr(body.ionization_mode),
    source_params:       optStr(body.source_params),
    acquisition_mode:    optStr(body.acquisition_mode),
    recent_maintenance:  optStr(body.recent_maintenance),
    qc_results:          optStr(body.qc_results),
    expected_result:     optStr(body.expected_result),
  };

  const AI_ONLY_TECHNIQUES = new Set<Technique>(['UHPLC', 'IC', 'CE', 'SFC', 'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC']);

  // V2 ranking with confidence caps and structured output
  let ranked: RankedAnswerV2 = rankItemsV2(query, readItems());

  // AI fallback: when rule-based system has no/low confidence matches, OR when
  // the technique is outside the rule-based knowledge base
  const needsAI = ranked.confidence < 0.4 || AI_ONLY_TECHNIQUES.has(query.technique);
  if (needsAI && process.env.ANTHROPIC_API_KEY) {
    try {
      ranked = await aiAnswerFallbackV2(query, ranked);
    } catch (err) {
      // If AI call fails, return the original result rather than crashing
      console.error('[ai-fallback-v2] error:', err);
    }
  }

  // Quality control gate
  let qc = runQualityChecks(ranked, query);

  if (qc.action === 'regenerate') {
    // Retry AI once with stricter guidance if available
    if (needsAI && process.env.ANTHROPIC_API_KEY) {
      try {
        ranked = await aiAnswerFallbackV2(query, ranked);
        qc = runQualityChecks(ranked, query);
      } catch (err) {
        console.error('[ai-fallback-v2] regeneration retry error:', err);
      }
    }
    // If still failing after retry (or no AI available), hard-cap confidence
    if (qc.action === 'regenerate') {
      ranked.confidence = Math.min(ranked.confidence, 0.30);
      ranked.confidence_breakdown.final_score = ranked.confidence;
      ranked.confidence_breakdown.label = 'Insufficient evidence';
      ranked.confidence_breakdown.caps_applied.push('Quality control regeneration cap (0.30)');
      ranked.uncertainties.push(...qc.failures.map(f => `QC: ${f.message}`));
    }
  }

  if (qc.action === 'downgrade') {
    // Use QC recommended confidence cap if available, otherwise penalize per error
    const errors = qc.failures.filter(f => f.severity === 'error');
    let newConfidence: number;
    if (qc.recommended_confidence !== null) {
      newConfidence = Math.min(ranked.confidence, qc.recommended_confidence);
    } else {
      newConfidence = Math.max(0, ranked.confidence - errors.length * 0.15);
    }
    ranked.confidence = newConfidence;
    ranked.confidence_breakdown.final_score = ranked.confidence;
    ranked.confidence_breakdown.label = ranked.confidence >= 0.60 ? 'Probable cause' : ranked.confidence >= 0.40 ? 'Preliminary hypothesis' : 'Insufficient evidence';
    ranked.confidence_breakdown.caps_applied.push('Quality control downgrade');
    ranked.uncertainties.push(...qc.failures.map(f => `QC: ${f.message}`));
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

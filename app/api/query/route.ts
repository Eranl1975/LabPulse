import { NextRequest, NextResponse } from 'next/server';
import { present }   from '@/agents/presentation/index';
import { aiAnswerFallbackV2 } from '@/lib/ai-fallback';
import { runTroubleshootingPipeline } from '@/lib/troubleshooting-pipeline';
import { getUser, getProfile } from '@/lib/auth';
import { hasAppAccess } from '@/lib/auth-shared';
import { checkQueryRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import type { RankingQueryV2 } from '@/agents/ranking/types';
import type { Technique, SampleMatrixType } from '@/lib/types';

const log = createLogger('api/query');

// The AI call (Sonnet, optional Opus escalation, optional QC retry) can take well
// over the default serverless timeout. Vercel Hobby allows up to 60 s.
export const maxDuration = 60;

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
    // V5 additions
    sst_plates:             typeof body.sst_plates === 'number' ? body.sst_plates : null,
    sst_tailing_factor:     typeof body.sst_tailing_factor === 'number' ? body.sst_tailing_factor : null,
    sst_resolution:         typeof body.sst_resolution === 'number' ? body.sst_resolution : null,
    sst_rsd_percent:        typeof body.sst_rsd_percent === 'number' ? body.sst_rsd_percent : null,
    sample_matrix_type:     optStr(body.sample_matrix_type) as SampleMatrixType | null,
    column_injection_count: typeof body.column_injection_count === 'number' ? body.column_injection_count : null,
    is_method_transfer:     body.is_method_transfer === true,
    source_instrument:      optStr(body.source_instrument),
    source_vendor:          optStr(body.source_vendor),
    source_model:           optStr(body.source_model),
    // V6: dynamic technique-specific context
    extra_context:          (typeof body.extra_context === 'object' && body.extra_context !== null && !Array.isArray(body.extra_context))
                              ? Object.fromEntries(
                                  Object.entries(body.extra_context as Record<string, unknown>)
                                    .filter(([, v]) => typeof v === 'string' && (v as string).trim())
                                    .map(([k, v]) => [k, (v as string).trim()])
                                ) as Record<string, string>
                              : undefined,
  };

  // Knowledge base → AI fallback → QC gate → content guarantee.
  // AI failures are never silent: they are returned as ai_status/ai_reason and
  // shown to the user as a notice inside the answer.
  const { answer, generation } = await runTroubleshootingPipeline(query, {
    hasAIKey: !!process.env.ANTHROPIC_API_KEY,
    aiFallback: aiAnswerFallbackV2,
  });

  if (generation.ai_status === 'error') {
    log.error('ai-status', 'Query answered without AI', {
      code: generation.ai_error_code, http_status: generation.ai_http_status, technique: query.technique,
    });
  }

  return NextResponse.json({
    ranked_answer: answer,
    ai_assisted: generation.ai_status === 'ok',
    ai_status: generation.ai_status,
    ai_reason: generation.ai_reason,
    content_source: generation.content_source,
    modes: {
      concise:  present(answer, 'concise'),
      standard: present(answer, 'standard'),
      deep:     present(answer, 'deep'),
      manager:  present(answer, 'manager'),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { present } from '@/agents/presentation/index';
import { aiAnswerFallbackV2 } from '@/lib/ai-fallback';
import { analyzeVisual } from '@/lib/visual-analysis';
import { runVisualTroubleshooting, type VisualStage } from '@/lib/visual-troubleshooting';
import { parseVisualPayload } from '@/lib/visual-payload';
import { isSameOriginRequest } from '@/lib/same-origin';
import { loadSeedDocuments } from '@/lib/document-seed';
import { loadDocumentLibrary } from '@/lib/document-library';
import { findCleaningProcedure } from '@/lib/cleaning-store';
import { getUser, getProfile } from '@/lib/auth';
import { hasAppAccess } from '@/lib/auth-shared';
import { checkQueryRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/troubleshooting/visual');

// Vision + pipeline + web research (lib/visual-troubleshooting.ts TIME_BUDGET
// finishes by 150 s). Vercel Hobby with Fluid compute allows up to 300 s.
export const maxDuration = 180;

const FREE_TIER_DAILY_LIMIT = 5;          // shared with /api/query: a visual run uses the same daily quota
const VISUAL_HOURLY_LIMIT = 10;           // every role: a run makes up to three paid AI calls
const HOUR_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 4_400_000;         // Vercel rejects bodies above ~4.5 MB anyway

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req.headers, req.url)) {
    return NextResponse.json({ error: 'Cross-site request rejected.' }, { status: 403 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in to use LabPulse.' }, { status: 401 });
  }

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

  // The limiter falls back to a per-instance in-memory map (no check_rate_limit
  // RPC in production), so this route is limited for every role, not only trials.
  if (!checkRateLimit(`visual:${user.id}`, VISUAL_HOURLY_LIMIT, HOUR_MS)) {
    return NextResponse.json(
      { error: `Visual troubleshooting is limited to ${VISUAL_HOURLY_LIMIT} submissions per hour.` },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }
  if (profile && profile.role === 'trial_user' && !checkQueryRateLimit(user.id, FREE_TIER_DAILY_LIMIT)) {
    return NextResponse.json(
      { error: `Daily query limit (${FREE_TIER_DAILY_LIMIT}) reached. Upgrade for unlimited queries.`, upgrade_url: '/upgrade' },
      { status: 429, headers: { 'Retry-After': '86400' } },
    );
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'The upload is too large. Remove a photo and try again.' }, { status: 413 });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'The upload is too large. Remove a photo and try again.' }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseVisualPayload(body, user.id);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const hasAIKey = !!process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  // NDJSON: one {"stage": …} line per stage, then one {"result": …} line, so the
  // browser can show real progress through the run.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      try {
        const { answer, generation } = await runVisualTroubleshooting(
          parsed.payload,
          {
            hasAIKey,
            aiFallback: aiAnswerFallbackV2,
            analyze: analyzeVisual,
            catalogue: loadSeedDocuments,
            library: loadDocumentLibrary,
            cleaning: findCleaningProcedure,
          },
          (stage: VisualStage) => send({ stage }),
        );

        if (generation.ai_status === 'error') {
          log.error('ai-status', 'Visual query answered without AI', {
            code: generation.ai_error_code, http_status: generation.ai_http_status, technique: parsed.payload.technique,
          });
        }

        send({
          result: {
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
          },
        });
      } catch (err) {
        log.error('visual-run', 'visual troubleshooting failed', { error: String(err) });
        send({ error: 'Visual troubleshooting failed unexpectedly. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

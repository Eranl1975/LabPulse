/**
 * Regression for 2026-10-27: with credit restored, every report still said "AI
 * service did not respond in time", because the AI stages were given 26 s / 40 s
 * / 50 s inside a 60 s function while real calls took ~22 s (vision), ~35 s
 * (Sonnet 5.5 refinement) and ~61 s (web research). These checks keep each
 * budget above its measured duration and inside its route's function limit.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TIME_BUDGET } from '@/lib/visual-troubleshooting';

/** Measured with real API calls on 2026-10-27. */
const MEASURED_MS = { vision: 21_600, refinement: 34_900, web: 60_700 };
/** Vercel Hobby with Fluid compute: maximum function duration. */
const VERCEL_HOBBY_MAX_S = 300;

function maxDurationOf(route: string): number {
  const src = fs.readFileSync(path.join(process.cwd(), route), 'utf-8');
  const m = /export const maxDuration = (\d+);/.exec(src);
  if (!m) throw new Error(`no maxDuration in ${route}`);
  return Number(m[1]);
}

function constantOf(file: string, name: string): number {
  const src = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
  const m = new RegExp(`const ${name} = ([\\d_]+);`).exec(src);
  if (!m) throw new Error(`no ${name} in ${file}`);
  return Number(m[1].replace(/_/g, ''));
}

describe('AI time budgets', () => {
  it('visual route: each stage has at least 1.5x its measured time and finishes before the function is killed', () => {
    const limitMs = maxDurationOf('app/api/troubleshooting/visual/route.ts') * 1000;
    expect(TIME_BUDGET.visionBy).toBeGreaterThanOrEqual(MEASURED_MS.vision * 1.5);
    // After vision, refinement and web research run in parallel until finishBy.
    expect(TIME_BUDGET.finishBy - TIME_BUDGET.visionBy).toBeGreaterThanOrEqual(MEASURED_MS.web * 1.5);
    expect(TIME_BUDGET.finishBy - TIME_BUDGET.visionBy).toBeGreaterThanOrEqual(MEASURED_MS.refinement * 1.5);
    // Leave time to build and stream the report.
    expect(limitMs - TIME_BUDGET.finishBy).toBeGreaterThanOrEqual(20_000);
    expect(limitMs).toBeLessThanOrEqual(VERCEL_HOBBY_MAX_S * 1000);
  });

  it('text route: the refinement call fits, and the shared AI deadline ends before the function', () => {
    const limitMs = maxDurationOf('app/api/query/route.ts') * 1000;
    const deadline = constantOf('app/api/query/route.ts', 'AI_DEADLINE_MS');
    const perCall = constantOf('lib/ai-fallback.ts', 'REFINEMENT_TIMEOUT_MS');
    expect(perCall).toBeGreaterThanOrEqual(MEASURED_MS.refinement * 1.5);
    expect(deadline).toBeGreaterThanOrEqual(perCall);
    expect(limitMs - deadline).toBeGreaterThanOrEqual(15_000);
    expect(limitMs).toBeLessThanOrEqual(VERCEL_HOBBY_MAX_S * 1000);
  });
});

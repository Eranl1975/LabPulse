import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { generateCleaningProcedure } from '@/lib/ai-cleaning';
import type { Technique } from '@/lib/types';
import type { CleaningProcedureResponse } from '@/lib/cleaning-types';

const VALID_TECHNIQUES = new Set<Technique>([
  'LCMS', 'HPLC', 'GC', 'GCMS', 'UHPLC', 'IC', 'CE', 'SFC',
  'TGA', 'DSC', 'FPLC', 'SPPS', 'XRD', 'DLS', 'Titration', 'KF', 'KFO',
  'CD', 'SEM', 'Sputter', 'BET', 'SECMALS', 'TEM', 'Raman', 'ssNMR', 'NMR', 'PrepLC',
]);

// Allow up to 60 seconds for Claude API call (default Vercel timeout is 10s)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Require authentication (same pattern as /api/query)
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in to use LabPulse.' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const technique = typeof body.technique === 'string' ? body.technique.trim() : '';
  if (!technique || !VALID_TECHNIQUES.has(technique as Technique)) {
    return NextResponse.json(
      { error: 'technique is required and must be a valid LabPulse technique.' },
      { status: 400 },
    );
  }

  const vendor  = typeof body.vendor === 'string' ? body.vendor.trim() || null : null;
  const model   = typeof body.model === 'string'  ? body.model.trim()  || null : null;
  const refresh = body.refresh === true;

  // ── Check Supabase cache ──────────────────────────────────────────────────
  let cached = false;
  if (!refresh) {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = await createSupabaseServerClient();

      let query = supabase
        .from('cleaning_procedures')
        .select('procedure_json, source_type, ai_model_used, created_at')
        .eq('technique', technique)
        .gt('expires_at', new Date().toISOString())
        .neq('validation_status', 'flagged')
        .limit(1);

      if (vendor) {
        query = query.eq('manufacturer', vendor);
      } else {
        query = query.is('manufacturer', null);
      }
      if (model) {
        query = query.eq('model', model);
      } else {
        query = query.is('model', null);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const row = data[0];
        const response: CleaningProcedureResponse = {
          procedure:    row.procedure_json,
          source_type:  row.source_type,
          cached:       true,
          generated_at: row.created_at,
          ai_model_used: row.ai_model_used ?? undefined,
        };
        return NextResponse.json(response);
      }
    } catch (err) {
      // Supabase not available or table doesn't exist yet — fall through to AI
      console.error('[cleaning-procedure] cache lookup error:', err);
    }
  }

  // ── Generate via AI ───────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact the administrator.' },
      { status: 503 },
    );
  }

  try {
    const { content, modelUsed } = await generateCleaningProcedure(technique, vendor, model);

    // ── Upsert to Supabase cache ──────────────────────────────────────────
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = await createSupabaseServerClient();

      // Delete existing cache entry (expression-based unique index can't be used with JS upsert)
      let deleteQuery = supabase
        .from('cleaning_procedures')
        .delete()
        .eq('technique', technique);
      if (vendor) { deleteQuery = deleteQuery.eq('manufacturer', vendor); }
      else        { deleteQuery = deleteQuery.is('manufacturer', null); }
      if (model)  { deleteQuery = deleteQuery.eq('model', model); }
      else        { deleteQuery = deleteQuery.is('model', null); }
      await deleteQuery;

      // Insert new cache entry
      await supabase.from('cleaning_procedures').insert({
        technique,
        manufacturer:       vendor,
        model:              model,
        instrument_type:    technique,
        procedure_json:     content,
        source_type:        content.source_type,
        source_url:         content.source_url,
        source_title:       content.source_title,
        what_not_to_do:     content.what_not_to_do,
        materials:          content.materials_needed.map(m => m.name),
        cleaning_frequency: content.cleaning_frequency.routine,
        ai_model_used:      modelUsed,
        ai_confidence:      content.confidence,
        retrieval_date:     new Date().toISOString(),
        validation_status:  'unverified',
        expires_at:         new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at:         new Date().toISOString(),
      });
    } catch (err) {
      // Cache upsert failure is non-fatal — return the AI result anyway
      console.error('[cleaning-procedure] cache upsert error:', err);
    }

    const response: CleaningProcedureResponse = {
      procedure:     content,
      source_type:   content.source_type,
      cached:        false,
      generated_at:  new Date().toISOString(),
      ai_model_used: modelUsed,
    };
    return NextResponse.json(response);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[cleaning-procedure] AI generation error:', errMsg);
    return NextResponse.json(
      { error: `Unable to generate cleaning procedure: ${errMsg}` },
      { status: 500 },
    );
  }
}

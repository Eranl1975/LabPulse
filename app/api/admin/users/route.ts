import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function requireAdmin(): Promise<
  | { error: 'Unauthorized' | 'Forbidden'; supabase: null; user: null }
  | { error: null; supabase: SupabaseClient; user: { id: string; email?: string } }
> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', supabase: null, user: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile as { role: string }).role !== 'admin') {
    return { error: 'Forbidden', supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

export async function GET(_request: NextRequest) {
  const result = await requireAdmin();
  if (result.error || !result.supabase) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 403 });
  }
  const { supabase } = result;
  const { data: profiles, error: dbError } = await supabase
    .from('profiles').select('*').order('created_at', { ascending: false });
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ users: profiles });
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (result.error || !result.supabase || !result.user) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 403 });
  }
  const { supabase, user } = result;

  const body = await request.json() as {
    target_user_id: string;
    role?: string;
    subscription_status?: string;
    locked_until?: string | null;
  };

  const allowedRoles = ['admin', 'paid_user', 'trial_user', 'blocked_user'];
  const allowedStatuses = ['none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'];
  const update: Record<string, unknown> = {};

  if (body.role !== undefined) {
    if (!allowedRoles.includes(body.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    update.role = body.role;
  }
  if (body.subscription_status !== undefined) {
    if (!allowedStatuses.includes(body.subscription_status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.subscription_status = body.subscription_status;
  }
  if ('locked_until' in body) update.locked_until = body.locked_until ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: targetProfile } = await supabase.from('profiles').select('email').eq('id', body.target_user_id).single();
  const { error: updateError } = await supabase.from('profiles').update(update as Partial<Profile>).eq('id', body.target_user_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email ?? null,
    action: 'update_user',
    target_user_id: body.target_user_id,
    target_email: (targetProfile as { email?: string } | null)?.email ?? null,
    details: update,
    ip_address: ip,
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (result.error || !result.supabase || !result.user) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'Unauthorized' ? 401 : 403 });
  }
  const { supabase, user } = result;

  const body = await request.json() as { email: string };
  if (!body.email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/reset-password`,
  });
  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  await supabase.from('admin_audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email ?? null,
    action: 'reset_password',
    target_user_id: null,
    target_email: body.email,
    details: {},
    ip_address: ip,
  });

  return NextResponse.json({ success: true });
}

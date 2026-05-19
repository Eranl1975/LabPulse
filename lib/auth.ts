import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './supabase-server';
import type { Profile } from './database.types';

export { isTrialActive, hasAppAccess, isAdmin, ROLE_LABELS } from './auth-shared';

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return data;
  } catch {
    return null;
  }
}

/**
 * Fast combined fetch for NavBar use.
 * Uses getSession() (cookie read, zero network) + ONE DB query.
 * Middleware already validates the JWT, so getSession() is safe here.
 * Reduces 3 sequential Supabase round-trips → 1.
 */
export async function getUserAndProfile(): Promise<{ user: User | null; profile: Profile | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    // getSession reads cookie — no network call (middleware already validated JWT)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return { user: session.user, profile: (profile as Profile | null) };
  } catch {
    return { user: null, profile: null };
  }
}

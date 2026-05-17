import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/ask';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()  { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure profile row exists — handles the case where the DB trigger
      // (011_profiles.sql) has not been run yet in the Supabase dashboard.
      const user = data.session?.user;
      if (user) {
        try {
          const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              email: user.email ?? null,
              full_name: (user.user_metadata?.full_name as string) ?? null,
              trial_ends_at: trialEndsAt,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
        } catch {
          // Profile table may not exist yet — redirect anyway, login will still work
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}

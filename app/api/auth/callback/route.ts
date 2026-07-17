import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/ask';

  if (code) {
    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = next;
    redirectTo.searchParams.delete('code');
    redirectTo.searchParams.delete('next');

    // Mutable response — setAll will attach cookies directly to it
    let response = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Update request cookies so subsequent reads within this handler see them
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            // Recreate the redirect response with cookies attached
            response = NextResponse.redirect(redirectTo);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure profile row exists (handles case where DB trigger hasn't run)
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
          // Profile table may not exist yet — redirect anyway
        }
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}

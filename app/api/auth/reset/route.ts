import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json() as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Use the standard Supabase client (NOT @supabase/ssr) with implicit flow.
  // This ensures no PKCE code_challenge is sent, so the email redirect uses
  // hash fragments (#access_token=...) instead of ?code=... — which means
  // the user can click the link on ANY device without needing a stored verifier.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const origin =
    request.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://labpulse-liart.vercel.app';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  // Always return success to prevent email enumeration
  if (error && !error.message.includes('rate')) {
    return NextResponse.json({ success: true });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }

  return NextResponse.json({ success: true });
}

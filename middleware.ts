import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const AUTH_ROUTES = new Set(['/login', '/register', '/forgot-password']);
const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);

// ── Profile cache (5-min TTL) to avoid DB query on every navigation ──
interface CachedProfile { role: string; trial_ends_at: string | null; locked_until: string | null }
const profileCache = new Map<string, { data: CachedProfile; expiresAt: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000;

async function getCachedProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<CachedProfile | null> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const { data } = await supabase
    .from('profiles')
    .select('role, trial_ends_at, locked_until')
    .eq('id', userId)
    .single();

  if (data) {
    profileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL });
  }
  return data;
}

// ── Auth audit helper (best-effort) ──
async function logAuthEvent(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  action: string,
  reason: string,
) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'profile',
      entity_id: userId,
      action,
      actor: 'system',
      old_values: { reason },
    });
  } catch { /* best-effort */ }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rate limit auth-related API endpoints
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/stripe/checkout')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';
    if (!checkRateLimit(`${ip}:${pathname}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Let API routes through — they handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Build response that will carry refreshed session cookies
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Guard: only create Supabase client if env vars are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    // Refresh session (important — keeps JWT fresh)
    const { data: { user } } = await supabase.auth.getUser();

    // ── Admin routes ──────────────────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
      const profile = await getCachedProfile(supabase, user.id);
      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/ask', request.url));
      }
      return response;
    }

    // ── Public routes ─────────────────────────────────────────────────────────
    if (PUBLIC_ROUTES.has(pathname)) {
      // Authenticated users landing on auth pages → send to app
      if (user && AUTH_ROUTES.has(pathname)) {
        return NextResponse.redirect(new URL('/ask', request.url));
      }
      return response;
    }

    // ── Protected routes ─────────────────────────────────────────────────────
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      if (pathname !== '/ask') url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Fetch profile with cache
    const profile = await getCachedProfile(supabase, user.id);

    if (profile) {
      if (profile.role === 'blocked_user') {
        await logAuthEvent(supabase, user.id, 'auth_blocked', 'blocked_user');
        return NextResponse.redirect(new URL('/login?error=blocked', request.url));
      }
      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        await logAuthEvent(supabase, user.id, 'auth_locked', 'account_locked');
        return NextResponse.redirect(new URL('/login?error=locked', request.url));
      }
      if (
        profile.role === 'trial_user' &&
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) < new Date() &&
        !pathname.startsWith('/upgrade')
      ) {
        await logAuthEvent(supabase, user.id, 'auth_trial_expired', 'trial_expired');
        return NextResponse.redirect(new URL('/upgrade?reason=trial_expired', request.url));
      }
    }

    return response;
  } catch {
    // Supabase unreachable — let public/auth pages through, block protected routes
    if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/api/')) {
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};

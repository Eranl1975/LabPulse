import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_ROUTES = new Set(['/login', '/register', '/forgot-password', '/reset-password']);
const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
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

  // Fetch profile for role/lock checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, trial_ends_at, locked_until')
    .eq('id', user.id)
    .single();

  if (profile) {
    if (profile.role === 'blocked_user') {
      return NextResponse.redirect(new URL('/login?error=blocked', request.url));
    }
    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      return NextResponse.redirect(new URL('/login?error=locked', request.url));
    }
    if (
      profile.role === 'trial_user' &&
      profile.trial_ends_at &&
      new Date(profile.trial_ends_at) < new Date() &&
      !pathname.startsWith('/upgrade')
    ) {
      return NextResponse.redirect(new URL('/upgrade?reason=trial_expired', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};

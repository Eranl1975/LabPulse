'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const CARD: React.CSSProperties = { background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const INPUT: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit' };
const BTN: React.CSSProperties = { width: '100%', padding: '0.875rem', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/ask';
  const errorParam = params.get('error');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (errorParam === 'blocked') setError('Your account has been blocked. Contact support.');
    if (errorParam === 'locked')  setError('Account temporarily locked after too many failed attempts.');
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setError(authError.message ?? 'Login failed. Check your credentials.');
      setLoading(false);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  return (
    <div style={CARD}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>Sign in</h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Access your LabPulse diagnostics</p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@lab.com" required autoComplete="email" style={INPUT} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: '#14b8a6', textDecoration: 'none' }}>Forgot?</Link>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={INPUT} />
        </div>

        <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
        No account?{' '}
        <Link href="/register" style={{ color: '#14b8a6', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#fff', borderRadius: '16px', padding: '2rem' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

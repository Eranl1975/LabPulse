'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Stage = 'verifying' | 'ready' | 'invalid' | 'expired';

const CARD: React.CSSProperties = {
  background: '#fff', borderRadius: '16px', padding: '2rem',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
  border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem',
  outline: 'none', fontFamily: 'inherit',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage]       = useState<Stage>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 1. Subscribe to auth state — fires for both PKCE (SIGNED_IN) and
    //    implicit flow (PASSWORD_RECOVERY) once Supabase processes the URL tokens.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (
          event === 'PASSWORD_RECOVERY' ||
          (event === 'SIGNED_IN' && session)
        ) {
          setStage('ready');
        }
      }
    );

    // 2. Immediate session check — handles the case where the server-side
    //    /api/auth/callback already set the session before redirecting here.
    supabase.auth.getSession().then((res: { data: { session: Session | null }; error: unknown }) => {
      if (res.data.session) setStage('ready');
    });

    // 3. Timeout — if no session within 10 s the link is expired/invalid.
    const timer = setTimeout(() => {
      setStage(prev => (prev === 'verifying' ? 'expired' : prev));
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      if (
        authError.message?.toLowerCase().includes('expired') ||
        authError.message?.toLowerCase().includes('invalid')
      ) {
        setStage('invalid');
        return;
      }
      setError(authError.message ?? 'Failed to update password. Please try again.');
      setLoading(false);
      return;
    }
    // Sign out so the user must log in with the new password
    await supabase.auth.signOut();
    router.push('/login?message=password_updated');
  }

  // ── Verifying ───────────────────────────────────────────────────────────────
  if (stage === 'verifying') {
    return (
      <div style={CARD}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid #e2e8f0', borderTopColor: '#14b8a6',
            borderRadius: '50%', margin: '0 auto 1rem',
            animation: 'spin .8s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>
            Verifying your reset link…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // ── Expired / Invalid ───────────────────────────────────────────────────────
  if (stage === 'expired' || stage === 'invalid') {
    return (
      <div style={CARD}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            color: '#0f172a', marginBottom: '0.5rem',
          }}>
            {stage === 'expired' ? 'Link expired' : 'Invalid reset link'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {stage === 'expired'
              ? 'This password reset link has expired. Reset links are valid for 1 hour.'
              : 'This password reset link is no longer valid.'}
            <br />Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            style={{
              display: 'inline-block', padding: '0.75rem 1.5rem',
              background: '#14b8a6', color: '#fff', borderRadius: '8px',
              fontWeight: 700, textDecoration: 'none',
              fontFamily: 'var(--font-display)',
            }}
          >
            Request a new link
          </Link>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/login" style={{ color: '#14b8a6', fontSize: '0.875rem', fontWeight: 600 }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready: password form ────────────────────────────────────────────────────
  return (
    <div style={CARD}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.375rem',
        fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a',
      }}>
        Create new password
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Choose a strong password for your account.
      </p>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
          padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="new-password"
            style={{
              display: 'block', fontSize: '0.8125rem', fontWeight: 700,
              color: '#475569', marginBottom: '0.375rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={INPUT}
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label
            htmlFor="confirm-password"
            style={{
              display: 'block', fontSize: '0.8125rem', fontWeight: 700,
              color: '#475569', marginBottom: '0.375rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={INPUT}
          />
        </div>

        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Minimum 8 characters · at least one uppercase letter · at least one number
        </p>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '0.875rem',
            background: '#14b8a6', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          {loading ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}

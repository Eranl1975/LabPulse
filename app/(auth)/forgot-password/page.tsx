'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const CARD: React.CSSProperties = { background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const INPUT: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit' };

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (authError) { setError(authError.message ?? 'Failed to send reset email.'); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={CARD}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Reset link sent</h2>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            If <strong>{email}</strong> has an account, a password reset link is on its way.
          </p>
          <Link href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#14b8a6', fontWeight: 600 }}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={CARD}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>Reset password</h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Enter your email and we will send a reset link.</p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@lab.com" required autoComplete="email" style={INPUT} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.875rem', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit' }}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
        <Link href="/login" style={{ color: '#14b8a6', fontWeight: 600, textDecoration: 'none' }}>Back to login</Link>
      </p>
    </div>
  );
}

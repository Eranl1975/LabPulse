'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const CARD: React.CSSProperties = { background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const INPUT: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit' };
const BTN: React.CSSProperties = { width: '100%', padding: '0.875rem', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include a number.';
  return null;
}

export default function RegisterPage() {
  const [email, setEmail]       = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || !fullName.trim()) { setError('All fields are required.'); return; }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (authError) { setError(authError.message ?? 'Registration failed.'); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div style={CARD}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Check your email</h2>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your 14-day free trial.
          </p>
          <Link href="/login" style={{ display: 'block', marginTop: '1.5rem', color: '#14b8a6', fontWeight: 600, fontSize: '0.9375rem' }}>Back to login</Link>
        </div>
      </div>
    );
  }

  const fields = [
    { label: 'Full name', type: 'text', value: fullName, set: setFullName, placeholder: 'Dr. Jane Smith', autoComplete: 'name' },
    { label: 'Work email', type: 'email', value: email, set: setEmail, placeholder: 'you@lab.com', autoComplete: 'email' },
    { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: '••••••••', autoComplete: 'new-password' },
    { label: 'Confirm password', type: 'password', value: confirm, set: setConfirm, placeholder: '••••••••', autoComplete: 'new-password' },
  ] as const;

  return (
    <div style={CARD}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>Create account</h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>14-day free trial — no credit card required</p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {fields.map(({ label, type, value, set, placeholder, autoComplete }) => (
          <div key={label} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</label>
            <input type={type} value={value} onChange={e => (set as (v: string) => void)(e.target.value)} placeholder={placeholder} required autoComplete={autoComplete} style={INPUT} />
          </div>
        ))}
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.5 }}>
          8+ characters, uppercase letter, and number required.
        </p>
        <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating account…' : 'Start free trial'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#14b8a6', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}

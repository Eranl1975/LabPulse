'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Profile } from '@/lib/database.types';
import { ROLE_LABELS } from '@/lib/auth-shared';

export default function UserMenu({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (!profile) return null;

  const initial = (profile.full_name ?? profile.email ?? '?')[0].toUpperCase();

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
      >
        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initial}
        </span>
        <span>{profile.email?.split('@')[0] ?? 'User'}</span>
        <span style={{ fontSize: '0.625rem', color: '#14b8a6', fontWeight: 600, background: 'rgba(20,184,166,0.15)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
          {ROLE_LABELS[profile.role]}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '200px', zIndex: 50, overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{profile.full_name ?? 'User'}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.email}</div>
            </div>
            {profile.role === 'admin' && (
              <a href="/admin/users" onClick={() => setOpen(false)} style={{ display: 'block', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#0f172a', textDecoration: 'none' }}>Admin panel</a>
            )}
            {profile.role === 'trial_user' && (
              <a href="/upgrade" onClick={() => setOpen(false)} style={{ display: 'block', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#14b8a6', fontWeight: 600, textDecoration: 'none' }}>Upgrade to Pro</a>
            )}
            <button onClick={handleSignOut} disabled={loading} style={{ width: '100%', padding: '0.625rem 1rem', textAlign: 'left', background: 'none', border: 'none', fontSize: '0.875rem', color: '#dc2626', cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}>
              {loading ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

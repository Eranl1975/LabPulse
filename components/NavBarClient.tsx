'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';
import UserMenu from './UserMenu';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Profile } from '@/lib/database.types';

const NAV_LINKS = [
  { href: '/ask',     label: 'Ask a Question' },
  { href: '/reports', label: 'Reports' },
];

export default function NavBarClient({ profile }: { profile: Profile | null }) {
  const pathname      = usePathname();
  const router        = useRouter();
  const [open,        setOpen]       = useState(false);
  const [scrolled,    setScrolled]   = useState(false);
  const [signingOut,  setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '64px',
        zIndex: 50,
        background: '#fff',
        borderBottom: scrolled ? '1px solid var(--color-slate-200)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 8px rgba(15,23,42,.07)' : 'none',
        transition: 'border-color .2s ease, box-shadow .2s ease',
      }}
    >
      <div className="lab-container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={34} />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden-mobile">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={`nav-link ${pathname === href ? 'nav-link-active' : ''}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hidden-mobile">
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <>
              <Link href="/login" className="lab-btn lab-btn-secondary lab-btn-sm">Log in</Link>
              <Link href="/register" className="lab-btn lab-btn-primary lab-btn-sm">Sign up free</Link>
            </>
          )}
        </div>

        <button
          className="lab-btn lab-btn-ghost"
          style={{ padding: '0.5rem', display: 'none' }}
          id="mobile-menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div
          style={{ position: 'fixed', top: '64px', left: 0, right: 0, background: '#fff', borderBottom: '1px solid var(--color-slate-200)', padding: '1rem 1.25rem 1.5rem', boxShadow: '0 8px 24px rgba(15,23,42,.1)', zIndex: 49 }}
          className="fade-in"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ display: 'block', padding: '0.75rem 0.5rem', fontSize: '1rem', fontWeight: 600, color: pathname === href ? 'var(--color-teal-600)' : 'var(--color-slate-700)', textDecoration: 'none', borderBottom: '1px solid var(--color-slate-100)' }}
            >
              {label}
            </Link>
          ))}

          {profile ? (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-slate-200)' }}>
              <div style={{ padding: '0 0.5rem 0.625rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                  {profile.full_name ?? profile.email}
                </div>
                {profile.full_name && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-400)' }}>{profile.email}</div>
                )}
              </div>
              {profile.role === 'admin' && (
                <Link href="/admin/users" style={{ display: 'block', padding: '0.625rem 0.5rem', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-slate-700)', textDecoration: 'none' }}>
                  Admin panel
                </Link>
              )}
              {profile.role === 'trial_user' && (
                <Link href="/upgrade" style={{ display: 'block', padding: '0.625rem 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-teal-600)', textDecoration: 'none' }}>
                  Upgrade to Pro
                </Link>
              )}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{ width: '100%', textAlign: 'left', padding: '0.625rem 0.5rem', fontSize: '0.9375rem', fontWeight: 500, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: signingOut ? 0.6 : 1 }}
              >
                {signingOut ? 'Signing out\u2026' : 'Sign out'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem' }}>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-slate-500)', margin: 0 }}>
                Troubleshoot your analytical instruments with evidence-ranked diagnostics.
              </p>
              <Link href="/login" className="lab-btn lab-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Log in
              </Link>
              <Link href="/register" className="lab-btn lab-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Sign up free — 14-day trial
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

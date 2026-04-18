'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const NAV_LINKS = [
  { href: '/ask',     label: 'Ask a Question' },
  { href: '/reports', label: 'Reports' },
];

export default function NavBar() {
  const pathname   = usePathname();
  const [open,      setOpen]    = useState(false);
  const [scrolled,  setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        zIndex: 50,
        background: '#fff',
        borderBottom: scrolled ? '1px solid var(--color-slate-200)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 8px rgba(15,23,42,.07)' : 'none',
        transition: 'border-color .2s ease, box-shadow .2s ease',
      }}
    >
      <div
        className="lab-container"
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo size={34} />
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden-mobile">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'nav-link-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }} className="hidden-mobile">
          <Link href="/ask" className="lab-btn lab-btn-primary lab-btn-sm">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5.5 6.5C5.5 5.12 6.62 4 8 4s2.5 1.12 2.5 2.5c0 1.5-1.5 2-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="12" r=".75" fill="currentColor"/>
            </svg>
            Troubleshoot
          </Link>
        </div>

        {/* Mobile hamburger */}
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

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            background: '#fff',
            borderBottom: '1px solid var(--color-slate-200)',
            padding: '1rem 1.25rem 1.5rem',
            boxShadow: '0 8px 24px rgba(15,23,42,.1)',
            zIndex: 49,
          }}
          className="fade-in"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '0.75rem 0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: pathname === href ? 'var(--color-teal-600)' : 'var(--color-slate-700)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--color-slate-100)',
              }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/ask"
            className="lab-btn lab-btn-primary"
            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
          >
            Troubleshoot Now
          </Link>
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

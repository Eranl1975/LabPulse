import Link from 'next/link';

export const metadata = { title: 'Welcome to LabPulse Pro!' };

export default function UpgradeSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          Welcome to LabPulse Pro!
        </h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your subscription is active. You now have full access to all diagnostic tools and analytical techniques.
        </p>
        <Link href="/ask" style={{ display: 'inline-block', padding: '0.875rem 2rem', background: '#14b8a6', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Start Diagnosing
        </Link>
      </div>
    </div>
  );
}

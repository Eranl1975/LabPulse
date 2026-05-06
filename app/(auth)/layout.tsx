import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LabPulse — Account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: '#fff' }}>
            Lab<span style={{ color: '#14b8a6' }}>Pulse</span>
          </span>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Analytical Instrument Diagnostics
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

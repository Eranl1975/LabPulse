import { redirect } from 'next/navigation';
import { getUser, getProfile } from '@/lib/auth';
import UpgradeClient from './UpgradeClient';

export const metadata = { title: 'Upgrade — LabPulse' };

export default async function UpgradePage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const profile = await getProfile();

  const trialExpired =
    profile?.role === 'trial_user' &&
    profile.trial_ends_at != null &&
    new Date(profile.trial_ends_at) < new Date();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: '#0f172a' }}>
            Lab<span style={{ color: '#14b8a6' }}>Pulse</span>
          </span>
        </div>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Upgrade to Full Access
          </h1>
          <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
            {trialExpired
              ? 'Your 14-day trial has ended. Subscribe to continue using LabPulse.'
              : 'Unlock unlimited diagnostics across all 17 analytical techniques.'}
          </p>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: '#0f172a' }}>LabPulse Professional</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: '#15803d' }}>$49/mo</span>
            </div>
            {[
              'All 17 analytical techniques (LCMS, HPLC, GC, GC-MS, XRD, DLS, Titration, KF, KFO + more)',
              'Evidence-ranked AI-assisted diagnosis',
              'Unlimited troubleshooting queries',
              'Full audit history and reports',
              'Priority support',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#15803d', marginBottom: '0.375rem' }}>
                <span>✓</span><span>{f}</span>
              </div>
            ))}
          </div>
          <UpgradeClient />
        </div>
      </div>
    </div>
  );
}

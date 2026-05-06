'use client';

import { useState } from 'react';

export default function UpgradeClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    const res  = await fetch('/api/stripe/checkout', { method: 'POST' });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? 'Failed to start checkout.');
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>
      )}
      <button onClick={handleUpgrade} disabled={loading} style={{ width: '100%', padding: '1rem', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
        {loading ? 'Redirecting to payment…' : 'Subscribe — $49/month'}
      </button>
      <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.75rem' }}>
        Secured by Stripe. Cancel anytime.
      </p>
    </>
  );
}

'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/database.types';
import { ROLE_LABELS } from '@/lib/auth-shared';

const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  paid_user: '#059669',
  trial_user: '#d97706',
  blocked_user: '#dc2626',
};

export default function UsersTable({ initialUsers }: { initialUsers: Profile[] }) {
  const [users, setUsers]     = useState<Profile[]>(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateUser(userId: string, update: Record<string, unknown>) {
    setLoading(userId);
    setMessage(null);
    const res  = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_user_id: userId, ...update }) });
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...update } as Profile : u));
      setMessage('Updated.');
    } else {
      setMessage(`Error: ${data.error ?? 'Unknown error'}`);
    }
    setLoading(null);
  }

  async function sendPasswordReset(email: string) {
    setLoading(email);
    const res  = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json() as { success?: boolean; error?: string };
    setMessage(data.success ? `Reset email sent to ${email}.` : `Error: ${data.error}`);
    setLoading(null);
  }

  return (
    <div>
      {message && (
        <div style={{ padding: '0.75rem 1rem', background: message.startsWith('Error') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${message.startsWith('Error') ? '#fca5a5' : '#86efac'}`, borderRadius: '8px', color: message.startsWith('Error') ? '#b91c1c' : '#15803d', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {message}
        </div>
      )}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Email', 'Role', 'Subscription', 'Trial ends', 'Last login', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: 500 }}>
                  {u.email ?? '—'}
                  {u.full_name && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.full_name}</div>}
                </td>
                <td style={{ padding: '1rem' }}>
                  <select
                    value={u.role}
                    disabled={loading === u.id}
                    onChange={e => updateUser(u.id, { role: e.target.value })}
                    style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', fontWeight: 600, color: ROLE_COLORS[u.role] ?? '#0f172a', background: '#fff', cursor: 'pointer' }}
                  >
                    {(['admin', 'paid_user', 'trial_user', 'blocked_user'] as const).map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{u.subscription_status}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {u.role !== 'blocked_user' ? (
                      <button onClick={() => updateUser(u.id, { role: 'blocked_user' })} disabled={loading === u.id} style={{ padding: '0.3125rem 0.625rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Block</button>
                    ) : (
                      <button onClick={() => updateUser(u.id, { role: 'trial_user' })} disabled={loading === u.id} style={{ padding: '0.3125rem 0.625rem', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Unblock</button>
                    )}
                    <button onClick={() => u.email && sendPasswordReset(u.email)} disabled={loading === u.id || !u.email} style={{ padding: '0.3125rem 0.625rem', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Reset pwd</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || profile.role !== 'admin') redirect('/ask');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0 clamp(1rem, 4vw, 2rem)', display: 'flex', alignItems: 'center', height: '56px', gap: 'clamp(0.75rem, 3vw, 2rem)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap' }}>
          Lab<span style={{ color: '#14b8a6' }}>Pulse</span>
          <span style={{ color: '#f97316', marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>ADMIN</span>
        </span>
        <Link href="/admin/users" style={{ color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>Users</Link>
        <Link href="/ask" style={{ color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500, marginLeft: 'auto', whiteSpace: 'nowrap' }}>← App</Link>
      </nav>
      <main style={{ padding: 'clamp(1rem, 4vw, 2rem)' }}>{children}</main>
    </div>
  );
}

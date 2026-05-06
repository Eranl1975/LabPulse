import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import UsersTable from './UsersTable';

export const metadata = { title: 'User Management — LabPulse Admin' };

export default async function AdminUsersPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'admin') redirect('/ask');

  const supabase = await createSupabaseServerClient();
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>User Management</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9375rem' }}>{users?.length ?? 0} registered users</p>
      </div>
      <UsersTable initialUsers={users ?? []} />
    </div>
  );
}

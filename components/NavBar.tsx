import { getUserAndProfile } from '@/lib/auth';
import NavBarClient from './NavBarClient';

export const dynamic = 'force-dynamic';

export default async function NavBar() {
  // Single Supabase call instead of 3 (getSession cookie read + 1 DB query)
  const { user, profile } = await getUserAndProfile();
  return <NavBarClient profile={profile} userEmail={user?.email ?? null} />;
}

import { getUser, getProfile } from '@/lib/auth';
import NavBarClient from './NavBarClient';

export const dynamic = 'force-dynamic';

export default async function NavBar() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;
  return <NavBarClient profile={profile} userEmail={user?.email ?? null} />;
}

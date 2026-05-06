import { getProfile } from '@/lib/auth';
import NavBarClient from './NavBarClient';

export const dynamic = 'force-dynamic';

export default async function NavBar() {
  const profile = await getProfile();
  return <NavBarClient profile={profile} />;
}

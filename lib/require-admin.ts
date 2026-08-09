import { NextResponse } from 'next/server';
import { getProfile } from './auth';

/**
 * Returns a NextResponse with 401/403 if the caller is not an admin.
 * Returns null if the caller IS an admin (proceed with the request).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }
  return null;
}

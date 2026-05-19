import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import ReportsClient from './ReportsClient';

export const metadata = {
  title: 'Reports — LabPulse',
  description: 'Analytics dashboard and history of all troubleshooting sessions.',
};

export default async function ReportsPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  return <ReportsClient />;
}

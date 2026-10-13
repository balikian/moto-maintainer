import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSignedInClient } from '@/lib/supabase/server';
import LoginCard from '../components/LoginCard';

export const metadata: Metadata = {
  title: 'Sign in · SwingArm',
};

export default async function LoginPage() {
  const { user } = await getSignedInClient();
  if (user) redirect('/');
  return <LoginCard />;
}

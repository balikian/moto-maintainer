import type { Metadata } from 'next';
import { getSignedInClient } from '@/lib/supabase/server';
import HomePage from '../components/HomePage';

export const metadata: Metadata = {
  title: 'About SwingArm',
  // The same page as the home page, so search engines list only that one.
  alternates: { canonical: '/' },
};

/** The public home page, reachable while signed in (More → About SwingArm). */
export default async function AboutPage() {
  const { user } = await getSignedInClient();
  return <HomePage signedIn={user !== null} />;
}

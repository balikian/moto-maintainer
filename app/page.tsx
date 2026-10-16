import { Suspense } from 'react';
import { getSignedInClient } from '@/lib/supabase/server';
import GarageApp from './GarageApp';
import HomePage from './components/HomePage';
import LoadingScreen from './components/LoadingScreen';

// Signed-out visitors get the public home page, rendered on the server;
// signed-in riders get their garage.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await getSignedInClient();
  // Deleting an account signs out and lands here with ?deleted.
  if (!user) return <HomePage signedIn={false} accountDeleted={(await searchParams).deleted !== undefined} />;

  // GarageApp reads the open screen from the URL (?view=), which is only known
  // in the browser, so it renders behind a Suspense boundary.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GarageApp />
    </Suspense>
  );
}

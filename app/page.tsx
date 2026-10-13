import { Suspense } from 'react';
import GarageApp from './GarageApp';
import LoadingScreen from './components/LoadingScreen';

// GarageApp reads the open screen from the URL (?view=), which is only known
// in the browser, so it renders behind a Suspense boundary.
export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GarageApp />
    </Suspense>
  );
}

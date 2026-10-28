import type { MetadataRoute } from 'next';
import { HOME_SCREEN_NAME } from '@/lib/site';

// The web app manifest: lets riders add SwingArm to their Home Screen (or
// install it on a computer), where it opens full screen with its own icon.
// Icons are rendered from public/brand/; the maskable one has extra margin so
// Android can cut it to a circle or squircle without losing the swingarm.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: HOME_SCREEN_NAME,
    short_name: HOME_SCREEN_NAME,
    description: 'Track motorcycle maintenance by mileage and time.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // The dark theme's page color (--sa-page), shown while the app opens.
    background_color: '#141619',
    theme_color: '#141619',
    categories: ['utilities', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

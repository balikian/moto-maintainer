import type { CapacitorConfig } from '@capacitor/cli';

// The phone apps (Capacitor): a native shell whose web view loads the hosted
// site, so web changes reach the apps without a store update. Only `mobile/`
// (the offline page) ships inside the app.
//
// The site defaults to production. For development, sync with
// CAPACITOR_SERVER_URL set to the PC's dev server, http://<PC's address>:3000
// (see CLAUDE.md). The test site doesn't work in the app: it sits behind
// Vercel's login, which the app sends out to the phone's browser.
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://swingarm.app';

const config: CapacitorConfig = {
  // The store id (Android package, iOS bundle id). It can't change once the
  // app is published.
  appId: 'app.swingarm',
  appName: 'SwingArm',
  webDir: 'mobile',
  // The dark theme's page color (--sa-page), shown while the site loads.
  // Android uses the light or dark one to match the phone (MainActivity).
  backgroundColor: '#141619',
  // Lets the site and its logs tell the app from a browser.
  appendUserAgent: 'SwingArmApp',
  server: {
    url: serverUrl,
    // Only the dev server is plain http.
    cleartext: serverUrl.startsWith('http://'),
    errorPath: 'offline.html',
  },
  plugins: {
    // Show notifications while the app is open too (Android only shows them on its own while it's closed).
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;

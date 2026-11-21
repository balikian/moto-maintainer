// Public facts about SwingArm used across pages.

import type { Metadata } from 'next';

export const SUPPORT_EMAIL = 'support@swingarm.app';

/** The company behind the SwingArm brand, named in the privacy policy, terms and footer. */
export const COMPANY_NAME = 'Cheese and Beer LLC';

/** The production site, for links in emails sent from production. */
export const SITE_URL = 'https://swingarm.app';

/** The Android app's Google Play listing (live since 2026-11). */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.swingarm';

/** The iPhone app's App Store listing (live since 2026-11-15; its Apple ID from App Store Connect). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6834998878';

/** Describes the link preview picture, app/opengraph-image.tsx. */
export const OG_IMAGE_ALT = 'SwingArm: know what your bike needs before it’s overdue.';

/**
 * The Open Graph fields every page shares (app/layout.tsx). A page that sets
 * its own `openGraph` replaces the layout's, picture included, so it spreads
 * this in.
 */
export const OPEN_GRAPH = {
  type: 'website',
  siteName: 'SwingArm',
  locale: 'en_US',
  images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: OG_IMAGE_ALT }],
} satisfies Metadata['openGraph'];

/** The test site, where `develop` deploys (Vercel's Preview environment). */
export const TEST_SITE_URL = 'https://test.swingarm.app';

/**
 * This deployment's own address: production, the test site, or the dev
 * server. Server-only (VERCEL_ENV isn't in the browser).
 */
export function deploymentSiteUrl(): string {
  if (process.env.VERCEL_ENV === 'production') return SITE_URL;
  if (process.env.VERCEL_ENV === 'preview') return TEST_SITE_URL;
  return 'http://localhost:3000';
}

/**
 * The phone apps' ids (capacitor.config.ts; development builds add .dev),
 * which are also their link schemes: `app.swingarm://auth/callback` opens the app.
 */
export const APP_IDS = ['app.swingarm', 'app.swingarm.dev'] as const;

export function isAppId(value: string): value is (typeof APP_IDS)[number] {
  return (APP_IDS as readonly string[]).includes(value);
}

/**
 * The name under a Home Screen icon (app/manifest.ts, the iPhone title in
 * app/layout.tsx): the test site's says Test, so a phone with both can tell
 * them apart. Server-only (VERCEL_ENV isn't in the browser).
 */
export const HOME_SCREEN_NAME = process.env.VERCEL_ENV === 'preview' ? 'SwingArm Test' : 'SwingArm';

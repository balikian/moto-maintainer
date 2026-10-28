// Public facts about SwingArm used across pages.

import type { Metadata } from 'next';

export const SUPPORT_EMAIL = 'support@swingarm.app';

/** The company behind the SwingArm brand, named in the privacy policy, terms and footer. */
export const COMPANY_NAME = 'Cheese and Beer LLC';

/** The production site, for links in emails sent from production. */
export const SITE_URL = 'https://swingarm.app';

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

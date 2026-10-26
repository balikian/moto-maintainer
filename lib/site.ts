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

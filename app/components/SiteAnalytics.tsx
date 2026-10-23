'use client';

import { Analytics } from '@vercel/analytics/next';
import { redactAnalyticsUrl } from '@/lib/analytics';

/** Vercel Web Analytics, with private parts of addresses removed before anything is sent. */
export default function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })} />;
}

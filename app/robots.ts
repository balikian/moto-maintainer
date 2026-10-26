import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// robots.txt. Only production points search engines at the sitemap; the test
// site and local dev keep themselves out of search with a noindex tag on every
// page (app/layout.tsx), which crawlers only see if they may fetch the page.
// Share links stay fetchable so they get a link preview; the share page itself
// says noindex.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', allow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/admin'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

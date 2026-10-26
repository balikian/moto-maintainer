import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// The public pages, for search engines (submitted in Google Search Console).
// /about is left out: it's the home page again, for signed-in riders, and
// names / as its canonical address. Add new public pages here.
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/help', '/privacy', '/terms'].map((path) => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }));
}

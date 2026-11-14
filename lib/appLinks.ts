import { isAppId, SITE_URL } from './site';

/** Pages a link to the app (`app.swingarm://…`) may open: Google sign-in's return. */
const APP_SCHEME_PATHS = ['/auth/callback'];

/**
 * swingarm.app pages that open in the phone app rather than the browser
 * (Android App Links: the intent filter in AndroidManifest.xml, which must
 * list the same paths, and public/.well-known/assetlinks.json; iPhone
 * universal links: public/.well-known/apple-app-site-association, which
 * lists them too): the
 * dashboard, where reminder emails go (`/?bike=…`, `/?view=garage`), and the
 * sign-in email's link. Share links stay in the browser: they're someone
 * else's bike.
 */
const WEB_APP_LINK_PATHS = ['/', '/auth/confirm'];

/**
 * The site path (with its query) for a link that opened the phone app, like
 * `app.swingarm://auth/callback?code=…` → `/auth/callback?code=…` or
 * `https://swingarm.app/?bike=…` → `/?bike=…`, or null for anything else:
 * another scheme or site, or a page app links aren't meant to open.
 */
export function appLinkPath(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.origin === SITE_URL) {
    return WEB_APP_LINK_PATHS.includes(url.pathname) ? `${url.pathname}${url.search}` : null;
  }
  if (!isAppId(url.protocol.replace(/:$/, ''))) return null;
  // In `scheme://auth/callback` the first part parses as the host.
  const path = `/${url.host}${url.pathname}`;
  return APP_SCHEME_PATHS.includes(path) ? `${path}${url.search}` : null;
}

/**
 * The page a tapped notification opens in the phone app (its `url`, see
 * lib/fcm.ts): a path on the site, or null for anything else.
 */
export function notificationPath(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  return url;
}

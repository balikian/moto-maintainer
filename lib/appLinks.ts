import { isAppId } from './site';

/** Pages an app link may open. Only Google sign-in's return for now. */
const APP_LINK_PATHS = ['/auth/callback'];

/**
 * The site path (with its query) for a link that opened the phone app, like
 * `app.swingarm://auth/callback?code=…` → `/auth/callback?code=…`, or null for
 * anything else: another scheme, or a page app links aren't meant to open.
 */
export function appLinkPath(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (!isAppId(url.protocol.replace(/:$/, ''))) return null;
  // In `scheme://auth/callback` the first part parses as the host.
  const path = `/${url.host}${url.pathname}`;
  return APP_LINK_PATHS.includes(path) ? `${path}${url.search}` : null;
}

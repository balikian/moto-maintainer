// The sign-in cookies Supabase keeps: `sb-<project ref>-auth-token`, split into
// `.0`, `.1`… when the session is too big for one cookie. Not the PKCE
// `…-auth-token-code-verifier`, which only lives during a sign-in.
//
// Safari caps cookies written by a page's script (document.cookie) at 7 days,
// in the browser and in iPhone apps, so a rider who visits weekly would be
// signed out every time. Cookies a server sends aren't capped, so the session
// is always saved from the server: proxy.ts renews it on page loads, and the
// browser hands each renewal it makes to app/api/auth/session to send back.

const AUTH_COOKIE = /^sb-[^.]+-auth-token(\.\d+)?$/;

export function isAuthCookie(name: string): boolean {
  return AUTH_COOKIE.test(name);
}

/** Where the browser sends its renewed session to be saved from the server. */
export const SESSION_COOKIE_ROUTE = '/api/auth/session';

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAuthCookie } from '@/lib/authCookies';
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE, inviteCodeFromPath, normalizeInviteCode } from '@/lib/invites';

// Renews the rider's session before a page is rendered, when the one-hour
// access token has run out, and saves the new cookies on the response.
//
// Without this, pages that check the user on the server (the dashboard at /,
// history, admin) renew the session themselves but can't save it, since
// server components can't set cookies; the browser is left with a used-up
// renewal token. Saving from the server also keeps Safari from cutting the
// cookies to 7 days (lib/authCookies.ts).
//
// It also carries invite links (lib/invites.ts): opening /join/<code> saves
// the code in a cookie, and the first request made signed in redeems it.
export async function proxy(request: NextRequest) {
  const signedIn = request.cookies.getAll().some(({ name }) => isAuthCookie(name));
  const openedInvite = inviteCodeFromPath(request.nextUrl.pathname);
  const savedInvite = normalizeInviteCode(request.cookies.get(INVITE_COOKIE)?.value);

  // Signed-out visitors (most of the public pages) skip the session…
  if (!signedIn) {
    const response = NextResponse.next();
    // …but keep an invite they've just opened until they sign up.
    if (openedInvite) saveInvite(response, openedInvite);
    return response;
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // The page being rendered reads the new cookies from the request…
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // …and the browser keeps them from the response.
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getSession renews only when the access token has expired, so most
  // requests make no network call. Its user isn't trusted here; pages still
  // check the user with getUser (and the database checks the token itself).
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const inviteCode = openedInvite ?? savedInvite;
  if (inviteCode && session) {
    const { error } = await supabase.rpc('redeem_invite', { p_code: inviteCode });
    // Redeemed, or the code has ended: either way it's done with. A failed
    // call (network, an expired token) leaves it for the next page load.
    if (!error) {
      if (request.cookies.has(INVITE_COOKIE)) response.cookies.delete(INVITE_COOKIE);
      return response;
    }
  }
  if (openedInvite) saveInvite(response, openedInvite);
  return response;
}

function saveInvite(response: NextResponse, code: string) {
  response.cookies.set(INVITE_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INVITE_COOKIE_MAX_AGE,
  });
}

export const config = {
  // Pages, server actions and API routes; not Next's own files, the service
  // worker, or files in public/ (anything with an extension).
  matcher: ['/((?!_next/static|_next/image|\\.well-known|.*\\.[a-zA-Z0-9]+$).*)'],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAuthCookie } from '@/lib/authCookies';

// Renews the rider's session before a page is rendered, when the one-hour
// access token has run out, and saves the new cookies on the response.
//
// Without this, pages that check the user on the server (the dashboard at /,
// history, admin) renew the session themselves but can't save it, since
// server components can't set cookies; the browser is left with a used-up
// renewal token. Saving from the server also keeps Safari from cutting the
// cookies to 7 days (lib/authCookies.ts).
export async function proxy(request: NextRequest) {
  // Signed-out visitors (most of the public pages) skip it.
  if (!request.cookies.getAll().some(({ name }) => isAuthCookie(name))) return NextResponse.next();

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
  // check the user with getUser.
  await supabase.auth.getSession();
  return response;
}

export const config = {
  // Pages, server actions and API routes; not Next's own files, the service
  // worker, or files in public/ (anything with an extension).
  matcher: ['/((?!_next/static|_next/image|\\.well-known|.*\\.[a-zA-Z0-9]+$).*)'],
};

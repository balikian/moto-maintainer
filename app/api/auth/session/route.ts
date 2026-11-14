import { DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAuthCookie } from '@/lib/authCookies';

// The browser calls this after it renews the session (lib/supabase/client.ts).
// It sends the rider's own sign-in cookies back unchanged, so they're saved
// from the server and Safari doesn't cut them to 7 days (lib/authCookies.ts).
export function POST(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  for (const { name, value } of request.cookies.getAll()) {
    if (isAuthCookie(name)) response.cookies.set(name, value, DEFAULT_COOKIE_OPTIONS);
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

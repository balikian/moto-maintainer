import { NextResponse } from 'next/server';
import { requestOrigin, safeRedirectPath } from '@/lib/authRedirect';
import { createClient } from '@/lib/supabase/server';

/**
 * Finishes Google sign-in, and the sign-in email's link while its template
 * still goes through Supabase's address: swaps the code for a session. Needs
 * the browser the sign-in started in (it holds the code's other half).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback on error
  return NextResponse.redirect(`${origin}/auth-error`);
}

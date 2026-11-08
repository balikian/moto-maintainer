import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requestOrigin, safeRedirectPath } from '@/lib/authRedirect';
import { createClient } from '@/lib/supabase/server';

/** The email links this route accepts: sign-in, and a new rider's first sign-in. */
const EMAIL_LINK_TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup'];

/**
 * The sign-in email's link, once Supabase's email templates point here
 * (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`).
 * Unlike /auth/callback it works in any browser, not just the one the
 * sign-in started in, and it's on swingarm.app, so on Android it opens the
 * phone app (an app link, see AndroidManifest.xml).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get('next'));

  if (tokenHash && type && EMAIL_LINK_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth-error`);
}

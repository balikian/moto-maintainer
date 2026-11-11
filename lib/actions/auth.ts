'use server';

import { headers } from 'next/headers';
import { isReviewEmail, REVIEW_EMAIL } from '../reviewAccount';
import { isAppId } from '../site';
import { createClient } from '../supabase/server';
import { redirect } from 'next/navigation';

/**
 * Where sign-in sends the rider back to: the site they're on, taken from the
 * request (localhost, a Vercel preview, or swingarm.app), so each deployment
 * works without a setting. Supabase only redirects to addresses on its
 * allow list (Authentication → URL Configuration).
 */
async function siteUrl(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');
  if (origin) return origin;
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  return host ? `${protocol}://${host}` : 'http://localhost:3000';
}

/**
 * Starts Google or Apple sign-in through their web page. In a browser it
 * redirects there. The phone app passes its id instead: Google won't sign in
 * inside an app's web view, so the app gets the address back to open in an
 * in-app browser tab, and the provider returns to `<app id>://auth/callback`,
 * which the app hands back to its web view (NativeAppLinks), where this
 * request's sign-in cookie waits. The iPhone app signs in with Apple through
 * the phone's own sheet instead (signInWithAppleToken).
 */
export async function signInWithProvider(
  provider: 'google' | 'apple',
  appId?: string
): Promise<{ error?: string; url?: string } | undefined> {
  if (appId !== undefined && !isAppId(appId)) {
    return { error: 'Sign-in isn’t set up for this app.' };
  }
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: appId ? `${appId}://auth/callback` : `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (appId) return { url: data.url };
  if (data.url) {
    redirect(data.url);
  }
}

/**
 * Finishes Sign in with Apple from the iPhone app's own sheet
 * (ios/App/App/AppleSignInPlugin.swift): trades Apple's identity token for a
 * session. `nonce` is the value whose hash went to Apple (lib/appleNonce.ts).
 * Supabase accepts the token because the app's bundle id is among the Apple
 * provider's client ids.
 */
export async function signInWithAppleToken(token: string, nonce: string): Promise<{ error?: string }> {
  if (!token || !nonce) {
    return { error: 'Apple didn’t send a sign-in token. Please try again.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce });
  if (error) {
    return { error: `Sign in with Apple didn’t work: ${error.message}` };
  }
  return {};
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();

  if (!email) {
    return { error: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Signs in with the code from the sign-in email, typed into the app. Works
 * where the email's link can't: the iPhone Home Screen app, whose sign-in is
 * kept apart from Safari's, where the link opens.
 */
export async function verifyEmailCode(email: string, code: string): Promise<{ error?: string }> {
  const token = code.replace(/\D/g, '');
  if (!email.trim() || token.length < 6) {
    return { error: 'Enter the code from the email.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
  if (error) {
    return { error: 'That code didn’t work. Check it, or send a new one. Codes expire after an hour.' };
  }
  return {};
}

/**
 * Signs in the app store reviewers' account with its password
 * (lib/reviewAccount.ts). Refuses every other email, so password sign-in
 * stays limited to that one account.
 */
export async function signInReviewAccount(email: string, password: string): Promise<{ error?: string }> {
  if (!isReviewEmail(email) || !password) {
    return { error: 'Enter the password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: REVIEW_EMAIL, password });
  if (error) {
    return { error: 'That password didn’t work.' };
  }
  return {};
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
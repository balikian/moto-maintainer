'use server';

import { headers } from 'next/headers';
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

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${await siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
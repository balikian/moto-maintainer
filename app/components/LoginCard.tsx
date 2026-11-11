'use client';

import Link from 'next/link';
import { useState, type SubmitEvent } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { sendMagicLink, signInReviewAccount, signInWithAppleToken, signInWithProvider, verifyEmailCode } from '@/lib/actions/auth';
import { randomNonce, sha256Hex } from '@/lib/appleNonce';
import { isNativeApp } from '@/lib/nativeApp';
import { isReviewEmail } from '@/lib/reviewAccount';
import BrandLogo from './BrandLogo';
import { ui } from './ui';

/** The iPhone app's own plugin (ios/App/App/AppleSignInPlugin.swift): Apple's sign-in sheet. */
const AppleSignIn = registerPlugin<{ signIn(options: { nonce: string }): Promise<{ identityToken: string }> }>('AppleSignIn');

/**
 * Sign in with Apple shows once it's set up for the site's database (Apple's
 * keys in Supabase's Apple provider): NEXT_PUBLIC_APPLE_SIGN_IN=on.
 */
const APPLE_SIGN_IN = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === 'on';

/** Apple's logo, for its sign-in button. */
function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export default function LoginCard() {
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [code, setCode] = useState('');
  // The app store reviewers' account signs in with a password (lib/reviewAccount.ts).
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  // Which provider's sign-in is under way.
  const [redirecting, setRedirecting] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderLogin = async (provider: 'google' | 'apple') => {
    setRedirecting(provider);
    setError(null);
    try {
      // The iPhone app signs in with Apple through the phone's own sheet.
      if (provider === 'apple' && Capacitor.isPluginAvailable('AppleSignIn')) {
        await signInWithAppleSheet();
        return;
      }
      // In the phone app, the provider opens in an in-app browser tab and comes
      // back through NativeAppLinks; in a browser the action redirects there.
      const appId = isNativeApp() ? (await App.getInfo()).id : undefined;
      // In a browser this redirects to the provider, so nothing after it runs.
      const result = await signInWithProvider(provider, appId);
      if (result?.url) await Browser.open({ url: result.url });
      else if (result?.error) setError(result.error);
    } finally {
      setRedirecting(null);
    }
  };

  /** Apple's sheet in the iPhone app, then its token traded for a session. */
  const signInWithAppleSheet = async () => {
    const nonce = randomNonce();
    let token: string;
    try {
      token = (await AppleSignIn.signIn({ nonce: await sha256Hex(nonce) })).identityToken;
    } catch (caught) {
      // Closing the sheet isn't an error.
      if ((caught as { code?: string }).code !== 'CANCELED') {
        setError(caught instanceof Error ? caught.message : 'Sign in with Apple didn’t work. Please try again.');
      }
      return;
    }
    const result = await signInWithAppleToken(token, nonce);
    if (result.error) {
      setError(result.error);
      return;
    }
    // A full load, so the whole app starts out signed in.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the full load is the point
    window.location.assign('/');
  };

  /** Emails a sign-in code and link: from the email form, and again from "Send a new code". */
  const sendSignInEmail = async (typedEmail = email) => {
    const normalizedEmail = typedEmail.trim();
    if (!normalizedEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    if (isReviewEmail(normalizedEmail)) {
      setAskPassword(true);
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('email', normalizedEmail);
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setLinkSent(true);
      setCode('');
    } catch {
      setError('Unable to send a sign-in email right now. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEmailSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // iPhone AutoFill can fill the field without React seeing a change, so read the field itself.
    const fieldValue = new FormData(event.currentTarget).get('email');
    const typedEmail = typeof fieldValue === 'string' && fieldValue.trim() ? fieldValue : email;
    if (typedEmail !== email) setEmail(typedEmail);
    void sendSignInEmail(typedEmail);
  };

  const handleCodeSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const result = askPassword ? await signInReviewAccount(email, password) : await verifyEmailCode(email, code);
      if (result.error) {
        setError(result.error);
        setVerifying(false);
        return;
      }
      // A full load, so the whole app starts out signed in.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the full load is the point
      window.location.assign('/');
    } catch {
      setError('Unable to check the code right now. Please try again.');
      setVerifying(false);
    }
  };

  const resetMagicLink = () => {
    setEmail('');
    setCode('');
    setLinkSent(false);
    setAskPassword(false);
    setPassword('');
    setError(null);
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${ui.page}`}>
      <div className={`w-full max-w-md p-8 shadow-xl ${ui.card}`}>
        <div className="mb-6 text-center">
          <h1 className="flex justify-center">
            <BrandLogo className="h-14" />
          </h1>
          <p className={`mt-2 text-sm ${ui.muted}`}>Sign in to unlock your digital garage.</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void handleProviderLogin('google')}
            disabled={redirecting !== null || sending}
            className={`w-full py-3 ${ui.primaryButton}`}
          >
            {redirecting === 'google' ? 'Redirecting to Google…' : 'Sign in with Google'}
          </button>

          {APPLE_SIGN_IN && (
            // Apple's rules: dark on a light page, light on a dark one, with its logo.
            <button
              type="button"
              onClick={() => void handleProviderLogin('apple')}
              disabled={redirecting !== null || sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 py-3 text-sm font-extrabold text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <AppleLogo />
              {redirecting === 'apple' ? 'Signing in with Apple…' : 'Sign in with Apple'}
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className={`text-xs font-bold ${ui.muted}`}>or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {linkSent ? (
            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <div className="rounded-2xl border border-good/30 bg-good/10 p-4">
                <p className="text-sm font-bold text-good">Check your email</p>
                <p className={`mt-1 text-sm ${ui.muted}`}>
                  We sent a sign-in code to <span className="font-medium">{email}</span>. Enter it here, or tap the
                  link in the email on this device.
                </p>
              </div>
              <label htmlFor="email-code" className={ui.label}>
                Sign-in code
              </label>
              <input
                id="email-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                // Supabase's code length is a project setting (6 by default), so up to 10 digits are accepted.
                maxLength={10}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''));
                  if (error) setError(null);
                }}
                disabled={verifying}
                className={`${ui.input} text-center text-2xl font-extrabold tracking-[0.3em] tabular-nums`}
                placeholder="000000"
                autoFocus
                required
              />
              <button type="submit" disabled={verifying || code.length < 6} className={`w-full py-3 ${ui.primaryButton}`}>
                {verifying ? 'Signing in…' : 'Sign in'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void sendSignInEmail()}
                  disabled={sending || verifying}
                  className={`flex-1 ${ui.secondaryButton}`}
                >
                  {sending ? 'Sending…' : 'Send a new code'}
                </button>
                <button type="button" onClick={resetMagicLink} disabled={verifying} className={`flex-1 ${ui.secondaryButton}`}>
                  Different email
                </button>
              </div>
            </form>
          ) : askPassword ? (
            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <p className={`text-sm ${ui.muted}`}>
                <span className="font-medium">{email.trim()}</span> signs in with a password.
              </p>
              <label htmlFor="review-password" className={ui.label}>
                Password
              </label>
              <input
                id="review-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
                disabled={verifying}
                className={ui.input}
                autoFocus
                required
              />
              <button type="submit" disabled={verifying || !password} className={`w-full py-3 ${ui.primaryButton}`}>
                {verifying ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" onClick={resetMagicLink} disabled={verifying} className={`w-full ${ui.secondaryButton}`}>
                Different email
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <label htmlFor="magic-email" className={ui.label}>
                Email address
              </label>
              <input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                disabled={sending}
                className={ui.input}
                placeholder="rider@example.com"
                required
              />
              <button type="submit" disabled={sending} className={`w-full py-3 ${ui.secondaryButton}`}>
                {sending ? 'Sending…' : 'Email me a sign-in code'}
              </button>
              <p className="mt-2 text-center text-xs text-muted">No password needed. The email also has a sign-in link.</p>
            </form>
          )}

          {error && <p className={ui.errorBox}>{error}</p>}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          By signing in, you agree to the{' '}
          <Link href="/terms" className="font-bold hover:text-fg">
            terms of use
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-bold hover:text-fg">
            privacy policy
          </Link>
          .
        </p>
      </div>
      <Link href="/" className="mt-5 text-sm font-bold text-muted hover:text-fg">
        ← What&apos;s SwingArm?
      </Link>
    </div>
  );
}

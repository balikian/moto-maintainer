'use client';

import Link from 'next/link';
import { useState, type SubmitEvent } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { sendMagicLink, signInWithGoogle, verifyEmailCode } from '@/lib/actions/auth';
import { isNativeApp } from '@/lib/nativeApp';
import BrandLogo from './BrandLogo';
import { ui } from './ui';

export default function LoginCard() {
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setRedirecting(true);
    setError(null);
    // In the phone app, Google opens in an in-app browser tab and comes back
    // through NativeAppLinks; in a browser the action redirects to Google.
    const appId = isNativeApp() ? (await App.getInfo()).id : undefined;
    const result = await signInWithGoogle(appId);
    if (result?.url) await Browser.open({ url: result.url });
    else if (result?.error) setError(result.error);
    setRedirecting(false);
  };

  /** Emails a sign-in code and link: from the email form, and again from "Send a new code". */
  const sendSignInEmail = async (typedEmail = email) => {
    const normalizedEmail = typedEmail.trim();
    if (!normalizedEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
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
      const result = await verifyEmailCode(email, code);
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
            onClick={handleGoogleLogin}
            disabled={redirecting || sending}
            className={`w-full py-3 ${ui.primaryButton}`}
          >
            {redirecting ? 'Redirecting to Google…' : 'Sign in with Google'}
          </button>

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

'use client';

import Link from 'next/link';
import { useState, type SubmitEvent } from 'react';
import { sendMagicLink, signInWithGoogle } from '@/lib/actions/auth';
import BrandLogo from './BrandLogo';
import { ui } from './ui';

export default function LoginCard() {
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setRedirecting(true);
    setError(null);
    const result = await signInWithGoogle();
    // On success the action redirects to Google, so we only get here on failure.
    if (result?.error) setError(result.error);
    setRedirecting(false);
  };

  const handleMagicLinkSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
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
    } catch {
      setError('Unable to send a magic link right now. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const resetMagicLink = () => {
    setEmail('');
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
            <div className="rounded-2xl border border-good/30 bg-good/10 p-4">
              <p className="text-sm font-bold text-good">Sign-in link sent!</p>
              <p className={`mt-1 text-sm ${ui.muted}`}>
                We sent a one-click magic link to <span className="font-medium">{email}</span>. Tap the link in your
                email to open your garage.
              </p>
              <button type="button" onClick={resetMagicLink} className={`mt-3 w-full ${ui.secondaryButton}`}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
              <label htmlFor="magic-email" className={ui.label}>
                Email address
              </label>
              <input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
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
                {sending ? 'Sending magic link…' : 'Send magic link'}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                We&apos;ll email you a secure, password-free login link (magic link).
              </p>
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

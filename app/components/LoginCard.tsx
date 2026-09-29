'use client';

import { useState, type SubmitEvent } from 'react';
import { sendMagicLink, signInWithGoogle } from '@/lib/actions/auth';
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
    <div className={`flex items-center justify-center p-4 ${ui.page}`}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
          <p className={`mt-2 text-sm ${ui.muted}`}>Sign in to unlock your digital garage.</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={redirecting || sending}
            className={`w-full rounded-2xl py-3 ${ui.secondaryButton}`}
          >
            {redirecting ? 'Redirecting to Google…' : 'Sign in with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
            <span className={`text-xs font-semibold tracking-[0.18em] ${ui.muted}`}>OR</span>
            <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
          </div>

          {linkSent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Sign-in link sent!</p>
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
                Email Address
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
              <button type="submit" disabled={sending} className={`w-full rounded-2xl py-3 ${ui.secondaryButton}`}>
                {sending ? 'Sending magic link…' : 'Send magic link'}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                We&apos;ll email you a secure, password-free login link (magic link).
              </p>
            </form>
          )}

          {error && <p className={ui.errorBox}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

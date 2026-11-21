import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { normalizeInviteCode } from '@/lib/invites';
import { OPEN_GRAPH } from '@/lib/site';
import { createClient, getSignedInClient } from '@/lib/supabase/server';
import FoundingBadge from '../../components/FoundingBadge';
import LoginCard from '../../components/LoginCard';
import { ui } from '../../components/ui';

type Props = { params: Promise<{ code: string }> };

/** What founding riders get, in the words every invite uses. */
const FOUNDING_PROMISE = 'Founding riders keep SwingArm free for good, paid features included.';

// Cached so the page and its metadata share one call.
const inviteIsOpen = cache(async (code: string | null): Promise<boolean> => {
  if (!code) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc('invite_is_open', { p_code: code });
  return data === true;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const open = await inviteIsOpen(normalizeInviteCode((await params).code));
  const title = open ? 'You’re invited to SwingArm' : 'SwingArm';
  const description = open
    ? `Track your motorcycle’s maintenance by miles and months. ${FOUNDING_PROMISE}`
    : 'Track your motorcycle’s maintenance by miles and months.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { ...OPEN_GRAPH, title, description },
  };
}

/**
 * An invite link: swingarm.app/join/<code> (lib/invites.ts). proxy.ts has
 * already saved the code, or redeemed it if the visitor is signed in, so
 * signing up here (any way) makes them a founding rider.
 */
export default async function JoinPage({ params }: Props) {
  const code = normalizeInviteCode((await params).code);
  const [open, { supabase, user }] = await Promise.all([inviteIsOpen(code), getSignedInClient()]);

  if (user) {
    const { data } = await supabase.from('founding_riders').select('user_id').eq('user_id', user.id).maybeSingle();
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${ui.page}`}>
        <div className={`w-full max-w-md space-y-4 p-8 text-center ${ui.card}`}>
          {data ? (
            <>
              <div className="flex justify-center">
                <FoundingBadge className="h-12 w-12" iconSize={24} />
              </div>
              <h1 className="text-xl font-extrabold">You’re a founding rider</h1>
              <p className={`text-sm ${ui.muted}`}>{FOUNDING_PROMISE} Thanks for riding with SwingArm from the start.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold">This invite link has ended</h1>
              <p className={`text-sm ${ui.muted}`}>You’re signed in, and SwingArm is free during early access.</p>
            </>
          )}
          <Link href="/" className={`${ui.primaryButton} w-full py-3`}>
            Open your garage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LoginCard
      intro={
        open ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-lg font-extrabold">You’re invited</p>
            <p className={`text-sm ${ui.muted}`}>
              Sign up to join as a founding rider. {FOUNDING_PROMISE}
            </p>
          </div>
        ) : (
          <p className={`mt-2 text-sm ${ui.muted}`}>
            This invite link has ended, but you can still sign up: SwingArm is free during early access.
          </p>
        )
      }
    />
  );
}

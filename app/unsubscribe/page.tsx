import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unsubscribeAction } from '@/lib/actions/unsubscribe';
import { getSignedInClient } from '@/lib/supabase/server';
import { SITE_WRAP, SiteFooter, SiteHeader } from '../components/SiteChrome';
import { ui } from '../components/ui';

export const metadata: Metadata = {
  title: 'Email settings · SwingArm',
  robots: { index: false },
};

// Where "Turn off these emails" in a reminder email leads. It asks before
// changing anything, since mail scanners open links on their own; mail apps'
// one-click unsubscribe uses /api/unsubscribe instead.

const WHAT: Record<string, string> = {
  daily: 'task and odometer reminder emails',
  monthly: 'the monthly summary email',
  all: 'all reminder emails',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '');

export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = single(params.token);
  const type = single(params.type);
  const done = params.done !== undefined;
  const error = single(params.error);
  const what = WHAT[type];
  const { user } = await getSignedInClient();

  async function turnOff() {
    'use server';
    const result = await unsubscribeAction(token, type);
    const next = new URLSearchParams({ type });
    if (result.error) {
      next.set('token', token);
      next.set('error', result.error);
    } else {
      next.set('done', '1');
    }
    redirect(`/unsubscribe?${next}`);
  }

  return (
    <div className={`${ui.page} flex flex-col`}>
      <SiteHeader signedIn={user !== null} />
      <main className={`${SITE_WRAP} flex flex-1 justify-center py-12 sm:py-16`}>
        <div className={`${ui.card} w-full max-w-md space-y-4 self-start p-6`}>
          {done ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Done</h1>
              <p>You won’t get {what ?? 'these emails'} any more.</p>
              <p className={ui.muted}>
                Changed your mind? Turn them back on in <Ui>More</Ui> in the app.
              </p>
              <Link href="/" className={ui.secondaryButton}>
                Open SwingArm
              </Link>
            </>
          ) : what && token ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Turn off emails?</h1>
              <p>You’ll stop getting {what} from SwingArm.</p>
              {error && <p className={ui.errorBox}>{error}</p>}
              <form action={turnOff}>
                <button type="submit" className={ui.primaryButton}>
                  Turn off
                </button>
              </form>
              <p className={`text-sm ${ui.muted}`}>You can turn them back on any time in More, in the app.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">This link isn’t complete</h1>
              <p className={ui.muted}>
                Use the link from the email again, or turn emails off in <Ui>More</Ui> in the app.
              </p>
              <Link href="/" className={ui.secondaryButton}>
                Open SwingArm
              </Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Ui({ children }: { children: string }) {
  return <strong className="font-bold">{children}</strong>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { reviewManualAction } from '@/lib/actions/modelData';
import { isHttpUrl } from '@/lib/modelData';
import { getSignedInClient } from '@/lib/supabase/server';
import type { BikeManual } from '@/lib/types';
import { ui } from '../components/ui';

export const metadata: Metadata = {
  title: 'Review Submissions · MOTO_MAINTAIN',
  robots: { index: false, follow: false },
};

const smallInput =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

/** Admin-only: approve or reject manual links riders have submitted. */
export default async function AdminPage() {
  const { supabase, user } = await getSignedInClient();
  if (!user) redirect('/');

  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  if (!isAdmin) notFound();

  const { data, error } = await supabase
    .from('bike_manuals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const pending = (data ?? []) as BikeManual[];

  return (
    <div className={`p-4 md:p-8 ${ui.page}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-amber-500">Review Submissions</h1>
            <p className={`text-sm ${ui.muted}`}>Manual links from riders. Approved links are shared with everyone who has that bike.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-amber-600">
            ← Back to garage
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className={ui.sectionTitle}>Manual links waiting for review ({pending.length})</h2>

          {pending.length === 0 ? (
            <div className={ui.emptyState}>Nothing to review right now.</div>
          ) : (
            pending.map((manual) => (
              <form key={manual.id} action={reviewManualAction} className={`${ui.card} space-y-3 p-4`}>
                <input type="hidden" name="id" value={manual.id} />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold">{manual.make}</span>
                  <input name="model" defaultValue={manual.model} aria-label="Model" className={`${smallInput} min-w-40`} />
                  <span className={`text-sm ${ui.muted}`}>years</span>
                  <input name="year_from" type="number" defaultValue={manual.year_from} aria-label="From year" className={`${smallInput} w-20`} />
                  <span className={ui.muted}>–</span>
                  <input name="year_to" type="number" defaultValue={manual.year_to} aria-label="To year" className={`${smallInput} w-20`} />
                </div>

                {isHttpUrl(manual.url) ? (
                  <a href={manual.url} target="_blank" rel="noreferrer noopener" className="block break-all font-mono text-xs text-amber-600 hover:underline dark:text-amber-400">
                    {manual.url}
                  </a>
                ) : (
                  <p className="break-all font-mono text-xs text-rose-600">{manual.url} (not a web link)</p>
                )}
                <p className="text-xs text-slate-500">
                  Check that it opens the right manual, ideally on the manufacturer&apos;s site. Widen the years if the
                  manual covers several model years.
                </p>

                <div className="flex gap-2">
                  <button type="submit" name="decision" value="approve" className={ui.primaryButton}>
                    Approve
                  </button>
                  <button type="submit" name="decision" value="reject" className={ui.secondaryButton}>
                    Reject
                  </button>
                </div>
              </form>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

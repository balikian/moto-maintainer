import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { reviewCustomModelAction, reviewManualAction } from '@/lib/actions/modelData';
import { manualsWithoutSchedule } from '@/lib/bikeCatalog';
import { isHttpUrl } from '@/lib/modelData';
import { getSignedInClient } from '@/lib/supabase/server';
import type { BikeManual, ModelEntry } from '@/lib/types';
import { ui } from '../components/ui';
import ImportScheduleButton from './ImportScheduleButton';

type PendingCustomModel = { id: string; make: string; model: string; created_at: string };

const yearsLabel = (entry: Pick<ModelEntry, 'year_from' | 'year_to'>) =>
  entry.year_from === entry.year_to ? String(entry.year_from) : `${entry.year_from}–${entry.year_to}`;

export const metadata: Metadata = {
  title: 'Review Submissions · MOTO_MAINTAIN',
  robots: { index: false, follow: false },
};

const smallInput =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

/** Admin-only: import missing schedules, and approve or reject what riders submitted. */
export default async function AdminPage() {
  const { supabase, user } = await getSignedInClient();
  if (!user) redirect('/');

  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  if (!isAdmin) notFound();

  const [manualsResult, schedulesResult, customModelsResult] = await Promise.all([
    supabase.from('bike_manuals').select('*').neq('status', 'rejected').order('created_at', { ascending: true }),
    supabase.from('model_schedules').select('id,make,model,year_from,year_to,status,submitted_by,created_at'),
    supabase.from('custom_models').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
  ]);
  if (manualsResult.error) throw new Error(manualsResult.error.message);
  if (schedulesResult.error) throw new Error(schedulesResult.error.message);

  const manuals = (manualsResult.data ?? []) as BikeManual[];
  const pending = manuals.filter((manual) => manual.status === 'pending');
  const needSchedule = manualsWithoutSchedule(manuals, (schedulesResult.data ?? []) as ModelEntry[]);
  // Before the custom_models migration has been run, this section just stays empty.
  const pendingModels = (customModelsResult.data ?? []) as PendingCustomModel[];

  return (
    <div className={`p-4 md:p-8 ${ui.page}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-amber-500">Review Submissions</h1>
            <p className={`text-sm ${ui.muted}`}>Manuals, schedules, and bike names from riders. Approved entries are shared with everyone.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-amber-600">
            ← Back to garage
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className={ui.sectionTitle}>Bikes with a manual but no schedule ({needSchedule.length})</h2>
          {needSchedule.length === 0 ? (
            <div className={ui.emptyState}>Every approved manual has a schedule.</div>
          ) : (
            needSchedule.map((manual) => (
              <div key={manual.id} className={`${ui.card} flex flex-wrap items-center gap-3 p-4`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {manual.make} {manual.model} <span className={`font-normal ${ui.muted}`}>· {yearsLabel(manual)}</span>
                  </p>
                  {isHttpUrl(manual.url) && (
                    <a href={manual.url} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400">
                      Open the manual to download the PDF
                    </a>
                  )}
                </div>
                <ImportScheduleButton make={manual.make} model={manual.model} yearFrom={manual.year_from} yearTo={manual.year_to} />
              </div>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className={ui.sectionTitle}>New makes and models ({pendingModels.length})</h2>
          {pendingModels.length === 0 ? (
            <div className={ui.emptyState}>No new bike names to review.</div>
          ) : (
            pendingModels.map((entry) => (
              <form key={entry.id} action={reviewCustomModelAction} className={`${ui.card} flex flex-wrap items-center gap-2 p-4`}>
                <input type="hidden" name="id" value={entry.id} />
                <input name="make" defaultValue={entry.make} aria-label="Make" className={`${smallInput} w-36`} />
                <input name="model" defaultValue={entry.model} aria-label="Model" className={`${smallInput} min-w-40 flex-1`} />
                <button type="submit" name="decision" value="approve" className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
                  Approve
                </button>
                <button type="submit" name="decision" value="reject" className={`${ui.secondaryButton} px-3 py-1.5 text-xs`}>
                  Reject
                </button>
              </form>
            ))
          )}
          <p className="text-xs text-slate-500">
            Riders typed these in because they weren&apos;t in the list. Fix the spelling if needed; approved names appear in
            everyone&apos;s make and model dropdowns.
          </p>
        </section>

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

import type { Metadata } from 'next';
import { todayIsoDate } from '@/lib/dates';
import type { ReportBike, ReportLog } from '@/lib/historyExport';
import { createClient } from '@/lib/supabase/server';
import HistoryReport from '../../components/HistoryReport';
import PrintButton from '../../components/PrintButton';

export const metadata: Metadata = {
  title: 'Shared Service History · MOTO_MAINTAIN',
  // Share links are private-by-obscurity; keep them out of search engines.
  robots: { index: false, follow: false },
};

type SharedHistory = {
  bike: ReportBike;
  unit_system: string;
  logs: ReportLog[];
};

/** Public, read-only view of one bike's service history, for anyone with the link. */
export default async function SharedHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // get_shared_history only returns data for an active share token (see supabase/migrations).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_shared_history', { share_token: token });
  const shared = (error ? null : data) as SharedHistory | null;

  if (!shared) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-4 text-slate-900">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-xs font-black tracking-tight text-amber-600">MOTO_MAINTAIN</p>
          <h1 className="mt-3 text-lg font-bold">This link isn&apos;t available</h1>
          <p className="mt-2 text-sm text-slate-600">
            The owner may have turned off sharing for this service history, or the link was copied incorrectly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4 print:hidden">
        <p className="text-sm text-slate-600">Shared with you from MOTO_MAINTAIN</p>
        <PrintButton />
      </div>
      <div className="pb-10 print:pb-0">
        <HistoryReport
          bike={shared.bike}
          logs={shared.logs}
          unitSystem={shared.unit_system === 'metric' ? 'metric' : 'imperial'}
          generatedOn={todayIsoDate()}
        />
      </div>
    </div>
  );
}

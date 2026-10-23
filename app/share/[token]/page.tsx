import type { Metadata } from 'next';
import { todayIsoDate } from '@/lib/dates';
import type { ReportBike, ReportLog } from '@/lib/historyExport';
import { createClient } from '@/lib/supabase/server';
import HistoryReport from '../../components/HistoryReport';
import NoticeCard from '../../components/NoticeCard';
import PrintButton from '../../components/PrintButton';

export const metadata: Metadata = {
  title: 'Shared Service History · SwingArm',
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
      <NoticeCard title={"This link isn't available"}>
        <p>The owner may have turned off sharing for this service history, or the link was copied incorrectly.</p>
      </NoticeCard>
    );
  }

  return (
    <div className="theme-light min-h-screen w-full bg-page text-fg print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4 print:hidden">
        <p className="text-sm text-muted">Shared with you from SwingArm</p>
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

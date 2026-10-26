import type { Metadata } from 'next';
import { cache } from 'react';
import { todayIsoDate } from '@/lib/dates';
import { bikeTitle, type ReportBike, type ReportLog } from '@/lib/historyExport';
import { OPEN_GRAPH } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import HistoryReport from '../../components/HistoryReport';
import NoticeCard from '../../components/NoticeCard';
import PrintButton from '../../components/PrintButton';

type SharedHistory = {
  bike: ReportBike;
  unit_system: string;
  logs: ReportLog[];
};

type Props = { params: Promise<{ token: string }> };

// get_shared_history only returns data for an active share token (see
// supabase/migrations). Cached so the page and its metadata share one call.
const loadSharedHistory = cache(async (token: string): Promise<SharedHistory | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_shared_history', { share_token: token });
  return (error ? null : data) as SharedHistory | null;
});

// The link preview names the bike, since the link is usually sent to a buyer
// or a shop.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shared = await loadSharedHistory((await params).token);
  const title = shared ? `${bikeTitle(shared.bike)} service history · SwingArm` : 'Shared service history · SwingArm';
  const count = shared?.logs.length ?? 0;
  const description = shared
    ? `${count} service ${count === 1 ? 'record' : 'records'}, shared from SwingArm.`
    : 'A motorcycle’s service history, shared from SwingArm.';
  return {
    title,
    description,
    openGraph: { ...OPEN_GRAPH, title, description },
    // Share links are private-by-obscurity; keep them out of search engines.
    robots: { index: false, follow: false },
  };
}

/** Public, read-only view of one bike's service history, for anyone with the link. */
export default async function SharedHistoryPage({ params }: Props) {
  const shared = await loadSharedHistory((await params).token);

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

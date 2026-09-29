import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { todayIsoDate } from '@/lib/dates';
import { getSignedInClient } from '@/lib/supabase/server';
import type { Motorcycle, ServiceLog } from '@/lib/types';
import HistoryReport from '../../components/HistoryReport';
import PrintButton from '../../components/PrintButton';

export const metadata: Metadata = {
  title: 'Service History · MOTO_MAINTAIN',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The owner's printable service history for one bike. */
export default async function PrintHistoryPage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;
  if (!UUID_PATTERN.test(bikeId)) notFound();

  const { supabase, user } = await getSignedInClient();
  if (!user) redirect('/');

  // Row-level security limits these to the signed-in user's own rows.
  const [bikeResult, logsResult, profileResult] = await Promise.all([
    supabase.from('motorcycles').select('*').eq('id', bikeId).maybeSingle(),
    supabase
      .from('service_logs')
      .select('*')
      .eq('motorcycle_id', bikeId)
      .order('performed_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('unit_system').eq('id', user.id).maybeSingle(),
  ]);

  if (bikeResult.error || logsResult.error) {
    throw new Error(bikeResult.error?.message ?? logsResult.error?.message);
  }
  if (!bikeResult.data) notFound();

  return (
    <div className="min-h-screen w-full bg-slate-100 print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4 print:hidden">
        <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Back to garage
        </Link>
        <PrintButton />
      </div>
      <div className="pb-10 print:pb-0">
        <HistoryReport
          bike={bikeResult.data as Motorcycle}
          logs={(logsResult.data ?? []) as ServiceLog[]}
          unitSystem={profileResult.data?.unit_system === 'metric' ? 'metric' : 'imperial'}
          generatedOn={todayIsoDate()}
        />
      </div>
    </div>
  );
}

import { formatDisplayDate } from '@/lib/dates';
import { bikeTitle, serviceType, totalCost, type ReportBike, type ReportLog } from '@/lib/historyExport';
import type { UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';

// A printable, read-only service history. Used by the print page and the
// public share page, so it always uses light "paper" colors and no app chrome.

type HistoryReportProps = {
  bike: ReportBike;
  logs: ReportLog[];
  unitSystem: UnitSystem;
  generatedOn: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function HistoryReport({ bike, logs, unitSystem, generatedOn }: HistoryReportProps) {
  const spend = totalCost(logs);

  return (
    <article className="mx-auto w-full max-w-3xl bg-white p-6 text-slate-900 sm:p-10 print:max-w-none print:p-0">
      <header className="border-b-2 border-amber-500 pb-4">
        <p className="text-xs font-black tracking-tight text-amber-600">MOTO_MAINTAIN · SERVICE HISTORY</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{bikeTitle(bike)}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Odometer</dt>
            <dd className="font-semibold text-slate-900">{formatDistance(bike.current_mileage, unitSystem)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Services</dt>
            <dd className="font-semibold text-slate-900">{logs.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Recorded spend</dt>
            <dd className="font-semibold text-slate-900">{currencyFormatter.format(spend)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">As of</dt>
            <dd className="font-semibold text-slate-900">{formatDisplayDate(generatedOn)}</dd>
          </div>
        </dl>
      </header>

      {logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No service records have been logged for this bike yet.</p>
      ) : (
        <ol className="divide-y divide-slate-200">
          {logs.map((log) => (
            <li key={log.id} className="grid gap-1 py-4 [break-inside:avoid] sm:grid-cols-[8rem_1fr_auto] sm:gap-4">
              <div className="text-sm font-semibold text-slate-700">{formatDisplayDate(log.performed_at)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{log.task_name}</span>
                  <span className="rounded border border-slate-300 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {serviceType(log)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">at {formatDistance(Number(log.odometer_at_service ?? 0), unitSystem)}</p>
                {log.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{log.notes}</p>}
              </div>
              <div className="text-sm font-semibold text-slate-900 sm:text-right">
                {log.cost !== null && Number.isFinite(Number(log.cost)) ? currencyFormatter.format(Number(log.cost)) : ''}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

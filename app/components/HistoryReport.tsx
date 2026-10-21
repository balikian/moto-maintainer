import { formatDisplayDate } from '@/lib/dates';
import { bikeTitle, serviceType, totalCost, type ReportBike, type ReportLog } from '@/lib/historyExport';
import type { UnitSystem } from '@/lib/types';
import { formatDistance, formatOdometer } from '@/lib/units';
import BrandLogo from './BrandLogo';

// A printable, read-only service history. Used by the print page and the
// public share page, so it always uses the light "paper" palette and no app chrome.

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
    <article className="theme-light mx-auto w-full max-w-3xl bg-white p-6 text-fg sm:p-10 print:max-w-none print:p-0">
      <header className="border-b-2 border-brand pb-4">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo className="h-10" lightOnly />
          <p className="text-xs font-extrabold tracking-wide text-muted">SERVICE HISTORY</p>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{bikeTitle(bike)}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold text-muted">Odometer</dt>
            <dd className="font-bold">{formatOdometer(bike.current_mileage, unitSystem)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Services</dt>
            <dd className="font-bold">{logs.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Recorded spend</dt>
            <dd className="font-bold">{currencyFormatter.format(spend)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">As of</dt>
            <dd className="font-bold">{formatDisplayDate(generatedOn)}</dd>
          </div>
        </dl>
      </header>

      {logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No service records have been logged for this bike yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {logs.map((log) => (
            <li key={log.id} className="grid gap-1 py-4 [break-inside:avoid] sm:grid-cols-[8rem_1fr_auto] sm:gap-4">
              <div className="text-sm font-bold">{formatDisplayDate(log.performed_at)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{log.task_name}</span>
                  <span className="rounded border border-line-strong px-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {serviceType(log)}
                  </span>
                </div>
                {log.odometer_at_service !== null && (
                  <p className="text-sm text-muted">at {formatDistance(Number(log.odometer_at_service), unitSystem)}</p>
                )}
                {log.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{log.notes}</p>}
              </div>
              <div className="text-sm font-bold sm:text-right">
                {log.cost !== null && Number.isFinite(Number(log.cost)) ? currencyFormatter.format(Number(log.cost)) : ''}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

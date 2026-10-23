'use client';

import { useState } from 'react';
import { Clock3, Link2, MapPin, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { groupServiceVisits } from '@/lib/serviceVisits';
import type { MaintenanceTask, Motorcycle, ServiceLog, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import ConfirmPopover from './ConfirmPopover';
import ExportMenu from './ExportMenu';
import SpendSummary from './SpendSummary';
import { ui } from './ui';

type ServiceHistoryViewProps = {
  bike: Motorcycle;
  logs: ServiceLog[];
  /** The bike's tasks, to put each service's cost in a category. */
  tasks: MaintenanceTask[];
  loading: boolean;
  unitSystem: UnitSystem;
  onAddLog: () => void;
  /** Resolves to an error message, or null on success. */
  onDeleteLog: (log: ServiceLog) => Promise<string | null>;
  onShare: () => void;
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ServiceHistoryView({ bike, logs, tasks, loading, unitSystem, onAddLog, onDeleteLog, onShare }: ServiceHistoryViewProps) {
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (log: ServiceLog) => {
    setDeletingLogId(log.id);
    setError(null);
    const deleteError = await onDeleteLog(log);
    setDeletingLogId(null);
    if (deleteError) setError(deleteError);
  };

  return (
    <section aria-label="Service history">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold">
            {bike.year} {bike.make} {bike.model}
          </div>
          {!loading && (
            <div className="text-sm font-semibold text-muted">
              {logs.length === 1 ? '1 service record' : `${logs.length} service records`}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onShare} className={ui.chipButton}>
            <Link2 size={15} />
            Share
          </button>
          <ExportMenu bike={bike} logs={logs} unitSystem={unitSystem} />
        </div>
      </div>

      <div>
        {!loading && logs.length > 0 && <SpendSummary logs={logs} tasks={tasks} />}
        {loading ? (
          <div className={ui.emptyState}>Loading service history…</div>
        ) : logs.length === 0 ? (
          <div className={ui.emptyState}>
            No service logged for this bike yet.{' '}
            <button type="button" onClick={onAddLog} className="font-bold text-accent hover:underline">
              Log a service
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupServiceVisits(logs).map((visit) => (
              <article key={visit.key} className={`${ui.card} space-y-3 p-4`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-raised px-2 py-1 text-xs font-bold">
                    <Clock3 size={13} aria-hidden="true" />
                    {formatDisplayDate(visit.performedAt)}
                  </span>
                  {visit.odometer !== null && <span className="font-semibold">{formatDistance(visit.odometer, unitSystem)}</span>}
                  {visit.shop && (
                    <span className="inline-flex min-w-0 items-center gap-1 font-semibold">
                      <MapPin size={13} aria-hidden="true" />
                      <span className="truncate">{visit.shop}</span>
                    </span>
                  )}
                </div>

                <ul className="space-y-1.5">
                  {visit.logs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-base font-bold leading-snug">{log.task_name}</span>
                        {/* Logs tied to a checklist task are routine; everything else is a one-off job. */}
                        {log.task_id ? (
                          <span className={`${ui.tag} bg-info/10 text-info`}>Routine</span>
                        ) : (
                          <span className={`${ui.tag} bg-raised text-muted`}>One-off</span>
                        )}
                      </span>
                      <ConfirmPopover
                        message={`Delete the "${log.task_name}" service record?`}
                        confirmLabel="Delete record"
                        onConfirm={() => void handleDelete(log)}
                      >
                        {(open, popoverProps) => (
                          <button
                            type="button"
                            onClick={open}
                            {...popoverProps}
                            disabled={deletingLogId === log.id}
                            title="Delete record"
                            aria-label={`Delete the ${log.task_name} record`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </ConfirmPopover>
                    </li>
                  ))}
                </ul>

                {visit.cost !== null && (
                  <p className="text-sm font-bold text-good">
                    Cost: {currencyFormatter.format(visit.cost)}
                  </p>
                )}
                {visit.notes.map((note) => (
                  <p key={note} className="whitespace-pre-wrap text-sm">{note}</p>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>

      {error && <div className={`mt-3 ${ui.errorBox}`}>{error}</div>}
    </section>
  );
}

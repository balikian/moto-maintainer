'use client';

import { useState } from 'react';
import { Clock3, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
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
        <ExportMenu bike={bike} logs={logs} unitSystem={unitSystem} onShare={onShare} />
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
            {logs.map((log) => (
              <article key={log.id} className={`${ui.card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-raised px-2 py-1 text-xs font-bold text-muted">
                        <Clock3 size={13} aria-hidden="true" />
                        {formatDisplayDate(log.performed_at)}
                      </div>
                      {/* Logs tied to a checklist task are routine; everything else is a one-off job. */}
                      {log.task_id ? (
                        <span className={`${ui.tag} bg-info/10 text-info`}>
                          Routine
                        </span>
                      ) : (
                        <span className={`${ui.tag} bg-raised text-muted`}>
                          One-off
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold">{log.task_name}</h3>
                    <p className={`text-sm ${ui.muted}`}>
                      Odometer: {formatDistance(Number(log.odometer_at_service ?? 0), unitSystem)}
                    </p>
                    {log.cost !== null && Number.isFinite(Number(log.cost)) && (
                      <p className="text-sm font-bold text-good">
                        Cost: {currencyFormatter.format(Number(log.cost))}
                      </p>
                    )}
                    {log.notes && <p className="whitespace-pre-wrap text-sm">{log.notes}</p>}
                  </div>

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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={12} />
                        {deletingLogId === log.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </ConfirmPopover>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {error && <div className={`mt-3 ${ui.errorBox}`}>{error}</div>}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { ChevronDown, Clock3, Plus, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import type { Motorcycle, ServiceLog, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import { useStoredToggle } from '../hooks/useStoredToggle';
import ExportMenu from './ExportMenu';
import { ui } from './ui';

type ServiceHistoryViewProps = {
  bike: Motorcycle;
  logs: ServiceLog[];
  loading: boolean;
  unitSystem: UnitSystem;
  onAddLog: () => void;
  /** Resolves to an error message, or null on success (or if the user cancelled). */
  onDeleteLog: (log: ServiceLog) => Promise<string | null>;
  onShare: () => void;
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ServiceHistoryView({ bike, logs, loading, unitSystem, onAddLog, onDeleteLog, onShare }: ServiceHistoryViewProps) {
  const [collapsed, toggleCollapsed] = useStoredToggle('moto-maintain:history-collapsed', false);
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
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="service-history-list"
            className={`inline-flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 ${ui.sectionTitle}`}
          >
            <ChevronDown size={14} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            Service History
            {!loading && (
              <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {logs.length}
              </span>
            )}
          </button>
        </h2>
        <div className="flex items-center gap-2">
          <ExportMenu bike={bike} logs={logs} unitSystem={unitSystem} onShare={onShare} />
          <button type="button" onClick={onAddLog} className={ui.chipButton}>
            <Plus size={14} className="text-amber-500" />
            Log Service
          </button>
        </div>
      </div>

      <div id="service-history-list" hidden={collapsed}>
        {loading ? (
          <div className={ui.emptyState}>Loading service history…</div>
        ) : logs.length === 0 ? (
          <div className={ui.emptyState}>No service records logged yet for this bike.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <article key={log.id} className={`${ui.card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Clock3 size={13} className="text-amber-500" />
                        {formatDisplayDate(log.performed_at)}
                      </div>
                      {/* Logs tied to a checklist task are routine; everything else is a one-off job. */}
                      {log.task_id ? (
                        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                          Routine
                        </span>
                      ) : (
                        <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                          One-off
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold">{log.task_name}</h3>
                    <p className={`text-sm ${ui.muted}`}>
                      Odometer: {formatDistance(Number(log.odometer_at_service ?? 0), unitSystem)}
                    </p>
                    {log.cost !== null && Number.isFinite(Number(log.cost)) && (
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                        Cost: {currencyFormatter.format(Number(log.cost))}
                      </p>
                    )}
                    {log.notes && <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{log.notes}</p>}
                  </div>
  
                  <button
                    type="button"
                    onClick={() => void handleDelete(log)}
                    disabled={deletingLogId === log.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-500/50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-rose-300"
                  >
                    <Trash2 size={12} />
                    {deletingLogId === log.id ? 'Deleting…' : 'Delete'}
                  </button>
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

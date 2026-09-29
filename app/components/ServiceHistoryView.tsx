'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deleteServiceLogAction } from '@/lib/actions/tasks';

type ServiceLog = {
  id: string;
  motorcycle_id: string;
  task_id: string | null;
  task_name: string;
  performed_at: string;
  odometer_at_service: number;
  cost: number | null;
  notes: string | null;
  created_at?: string;
};

type ServiceHistoryViewProps = {
  motorcycleId: string | null;
  refreshKey?: number;
  onAddLog?: () => void;
  canAddLog?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default function ServiceHistoryView({
  motorcycleId,
  refreshKey = 0,
  onAddLog,
  canAddLog = true,
}: ServiceHistoryViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadServiceHistory = async () => {
      if (!motorcycleId) {
        if (mounted) {
          setLogs([]);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('service_logs')
        .select('id,motorcycle_id,task_id,task_name,performed_at,odometer_at_service,cost,notes,created_at')
        .eq('motorcycle_id', motorcycleId)
        .order('performed_at', { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setLogs([]);
        setError('Unable to load service history right now.');
        setLoading(false);
        return;
      }

      setLogs((data ?? []) as ServiceLog[]);
      setLoading(false);
    };

    void loadServiceHistory();

    return () => {
      mounted = false;
    };
  }, [motorcycleId, refreshKey, supabase]);

  const handleDeleteLog = async (logId: string) => {
    setDeletingLogId(logId);
    setError(null);

    try {
      const result = await deleteServiceLogAction(logId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setLogs((prev) => prev.filter((entry) => entry.id !== logId));
    } finally {
      setDeletingLogId(null);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Service History</h2>
        <button
          type="button"
          onClick={onAddLog}
          disabled={!canAddLog}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-amber-500/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={14} className="text-amber-500" />
          Log Service
        </button>
      </div>

      <div className="rounded-xl border border-zinc-900 bg-slate-900/40 p-4">
        {loading ? (
          <div className="text-sm text-zinc-400">Loading service history...</div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
            No service records logged yet for this bike.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((entry) => {
              const performedDate = new Date(entry.performed_at);
              const formattedDate = Number.isNaN(performedDate.getTime())
                ? entry.performed_at
                : dateFormatter.format(performedDate);

              return (
                <article key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-300">
                        <Clock3 size={13} className="text-amber-500" />
                        {formattedDate}
                      </div>
                      <h3 className="text-base font-semibold text-zinc-100">{entry.task_name}</h3>
                      <p className="text-sm text-zinc-400">Odometer: {Number(entry.odometer_at_service ?? 0).toLocaleString()} mi</p>
                      {typeof entry.cost === 'number' && Number.isFinite(entry.cost) && (
                        <p className="text-sm font-medium text-emerald-300">Cost: ${entry.cost.toFixed(2)}</p>
                      )}
                      {entry.notes && (
                        <p className="whitespace-pre-wrap text-sm text-zinc-300">{entry.notes}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteLog(entry.id)}
                      disabled={deletingLogId === entry.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-rose-500/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

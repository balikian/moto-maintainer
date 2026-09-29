'use client';

import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle, Clock, Pencil, RotateCcw, Trash2, Wrench } from 'lucide-react';
import type { TaskDueState } from '@/lib/maintenance';
import type { MaintenanceTask, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, formatDistance, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import { ui } from './ui';

type TaskCardProps = {
  task: MaintenanceTask;
  dueState: TaskDueState;
  unitSystem: UnitSystem;
  onLog: () => void;
  /** Receives the interval in miles; resolves to an error message, or null on success. */
  onSaveIntervals: (intervals: { intervalMileage: number; intervalMonths: number }) => Promise<string | null>;
  onReset: () => void;
  onDelete: () => void;
};

const STATUS_STYLES = {
  Overdue: { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: 'bg-rose-500/10 text-rose-500', bar: 'bg-rose-500', Icon: AlertTriangle },
  Urgent: { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: 'bg-rose-500/10 text-rose-500', bar: 'bg-rose-500', Icon: AlertTriangle },
  Soon: { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: 'bg-amber-500/10 text-amber-500', bar: 'bg-amber-500', Icon: Clock },
  Healthy: { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: 'bg-emerald-500/10 text-emerald-500', bar: 'bg-emerald-500', Icon: CheckCircle },
} as const;

const smallInputClass =
  'rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const iconButtonClass = 'rounded p-1 transition-colors';

function badgeText({ trigger, milesRemaining, daysRemaining }: TaskDueState, unitSystem: UnitSystem): string {
  if (trigger === 'time' && daysRemaining !== null) {
    if (daysRemaining < 0) return `Overdue by ${-daysRemaining} day${daysRemaining === -1 ? '' : 's'}`;
    return daysRemaining === 0 ? 'Due today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;
  }
  if (milesRemaining !== null) {
    return milesRemaining < 0
      ? `Overdue by ${formatDistance(-milesRemaining, unitSystem)}`
      : `${formatDistance(milesRemaining, unitSystem)} left`;
  }
  return 'No interval set';
}

export default function TaskCard({ task, dueState, unitSystem, onLog, onSaveIntervals, onReset, onDelete }: TaskCardProps) {
  const [draft, setDraft] = useState<{ distance: string; months: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = STATUS_STYLES[dueState.status];
  const unitLabel = distanceUnitLabel(unitSystem);
  // How much of the interval has been used up, capped at 100% once overdue.
  const percentUsed = dueState.fractionRemaining === null
    ? null
    : Math.round(Math.min(1, Math.max(0, 1 - dueState.fractionRemaining)) * 100);

  const startEditing = () => {
    setError(null);
    setDraft({
      distance: String(toDisplayDistance(task.interval_mileage, unitSystem)),
      months: String(task.interval_months ?? 0),
    });
  };

  const saveEdit = async () => {
    if (!draft) return;
    const intervalMileage = fromDisplayDistance(draft.distance || '0', unitSystem);
    const intervalMonths = Number(draft.months || 0);
    if (Number.isNaN(intervalMileage) || intervalMileage < 0 || !Number.isFinite(intervalMonths) || intervalMonths < 0) {
      setError('Intervals must be non-negative numbers.');
      return;
    }

    setSaving(true);
    const saveError = await onSaveIntervals({ intervalMileage, intervalMonths });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setDraft(null);
  };

  return (
    <div className={`${ui.card} p-4`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${style.icon}`}>
            <style.Icon size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold md:text-base">{task.task_name}</h4>
            <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${ui.muted}`}>
              <Wrench size={12} /> {task.is_diy ? 'Self-Maintain' : 'Shop Service'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${style.badge}`}>{badgeText(dueState, unitSystem)}</span>

          <div className={`flex items-center gap-1 text-[11px] ${ui.muted}`}>
            <span>Every</span>
            {draft ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEdit();
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.distance}
                  onChange={(event) => setDraft({ ...draft, distance: event.target.value })}
                  className={`w-16 ${smallInputClass}`}
                  aria-label={`Interval in ${unitLabel}`}
                  autoFocus
                />
                <span>{unitLabel} /</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.months}
                  onChange={(event) => setDraft({ ...draft, months: event.target.value })}
                  className={`w-10 ${smallInputClass}`}
                  aria-label="Interval in months"
                />
                <span>mo</span>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${iconButtonClass} text-slate-700 hover:text-emerald-500 dark:text-slate-300 dark:hover:text-emerald-400`}
                  title="Save changes"
                  aria-label="Save interval changes"
                >
                  <Check size={14} />
                </button>
              </form>
            ) : (
              <>
                <span className="font-semibold">{toDisplayDistance(task.interval_mileage, unitSystem).toLocaleString()}</span>
                <span>{unitLabel} /</span>
                <span className="font-semibold">{task.interval_months ?? 0}</span>
                <span>mo</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onLog}
              className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-amber-500/40 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-amber-400"
            >
              Log Service
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800/70">
              <button
                type="button"
                onClick={draft ? () => setDraft(null) : startEditing}
                className={`${iconButtonClass} hover:text-amber-500`}
                title={draft ? 'Cancel editing' : 'Edit intervals'}
                aria-label={draft ? 'Cancel editing' : 'Edit intervals'}
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={onReset}
                className={`${iconButtonClass} hover:text-amber-500`}
                title="Reset to default interval"
                aria-label="Reset to default interval"
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={`${iconButtonClass} hover:text-rose-500`}
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {percentUsed !== null && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-label={`${task.task_name}: ${percentUsed}% of the ${dueState.trigger === 'time' ? 'time' : 'distance'} interval used`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentUsed}
        >
          <div className={`h-full rounded-full transition-[width] ${style.bar}`} style={{ width: `${percentUsed}%` }} />
        </div>
      )}
      {error && <p className={`mt-3 ${ui.errorBox}`}>{error}</p>}
    </div>
  );
}

'use client';

import { useId, useState } from 'react';
import { Check, Layers, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { categoryLabel, isTaskCategory, TASK_CATEGORIES, taskCategory, type TaskCategory } from '@/lib/taskCategories';
import type { TaskDueState, TaskStatus } from '@/lib/maintenance';
import { dueLabel, intervalLabel } from '@/lib/taskLabels';
import type { MaintenanceTask, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, formatDistance, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import ConfirmPopover from './ConfirmPopover';
import { ui } from './ui';

type TaskCardProps = {
  task: MaintenanceTask;
  dueState: TaskDueState;
  /** True until a service is logged for this task, so its countdown runs from new. */
  neverLogged: boolean;
  unitSystem: UnitSystem;
  /** "card" for tasks that need attention; "row" for the compact list of healthy ones. */
  variant?: 'card' | 'row';
  onLog: () => void;
  /** Receives the interval in miles; resolves to an error message, or null on success. */
  onSaveIntervals: (intervals: { intervalMileage: number; intervalMonths: number; category: TaskCategory }) => Promise<string | null>;
  /** Related tasks (same category) that are coming due, worth doing at the same time. */
  alsoComingUp: MaintenanceTask[];
  onReset: () => void;
  onDelete: () => void;
  /** For a task without a start point: count from today, or "never done" (from when the bike was new). */
  onSetStart: (start: 'today' | 'new') => void;
  /** The bike's model year, where "never done" counts from. */
  bikeYear: number;
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  Overdue: 'text-danger',
  Urgent: 'text-danger',
  Soon: 'text-warn',
  Healthy: 'text-muted',
  NoStart: 'text-muted',
};

const STATUS_FILL: Record<TaskStatus, string> = {
  Overdue: 'bg-danger',
  Urgent: 'bg-danger',
  Soon: 'bg-warn',
  Healthy: 'bg-good',
  NoStart: 'bg-track',
};

/** The progress bar is split into segments, like a rev counter. */
const SEGMENTS = 12;

function lastDoneLabel(task: MaintenanceTask, neverLogged: boolean, unitSystem: UnitSystem): string {
  if (task.last_performed_mileage === null) return 'Not set yet';
  const date = task.last_performed_date ? formatDisplayDate(task.last_performed_date) : null;
  const distance = formatDistance(task.last_performed_mileage, unitSystem);
  if (neverLogged) {
    const from = [date, task.last_performed_mileage > 0 ? `at ${distance}` : null].filter(Boolean).join(' ');
    return from ? `Not logged yet; counting from ${from}` : 'Not logged yet';
  }
  return [date, distance].filter(Boolean).join(' · ');
}

export default function TaskCard({
  task,
  dueState,
  neverLogged,
  unitSystem,
  variant = 'card',
  onLog,
  onSaveIntervals,
  alsoComingUp,
  onReset,
  onDelete,
  onSetStart,
  bikeYear,
}: TaskCardProps) {
  const noStart = dueState.status === 'NoStart';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ distance: string; months: string; category: TaskCategory } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const category = taskCategory(task);

  const unitLabel = distanceUnitLabel(unitSystem);
  const due = dueLabel(dueState, unitSystem);
  const meta = [categoryLabel(category), task.is_diy ? 'DIY' : 'Shop', neverLogged && !noStart ? 'not logged yet' : null]
    .filter(Boolean)
    .join(' · ');
  // How much of the interval has been used up, capped at 100% once overdue.
  const percentUsed = dueState.fractionRemaining === null
    ? null
    : Math.round(Math.min(1, Math.max(0, 1 - dueState.fractionRemaining)) * 100);
  const litSegments = percentUsed === null ? 0 : Math.round((percentUsed / 100) * SEGMENTS);

  const startEditing = () => {
    setError(null);
    setDraft({
      distance: String(toDisplayDistance(task.interval_mileage, unitSystem)),
      months: String(task.interval_months ?? 0),
      category,
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
    const saveError = await onSaveIntervals({ intervalMileage, intervalMonths, category: draft.category });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setDraft(null);
  };

  const toggle = () => {
    setOpen((previous) => !previous);
    setDraft(null);
    setError(null);
  };

  const details = open && (
    <div id={`${id}-details`} className={`space-y-3 border-t border-line px-4 py-3 ${variant === 'card' ? 'rounded-b-2xl bg-raised' : ''}`}>
      {draft ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveEdit();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-distance`} className={ui.label}>Every ({unitLabel})</label>
              <input
                id={`${id}-distance`}
                type="text"
                inputMode="numeric"
                value={draft.distance}
                onChange={(event) => setDraft({ ...draft, distance: event.target.value })}
                className={ui.input}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor={`${id}-months`} className={ui.label}>Or every (months)</label>
              <input
                id={`${id}-months`}
                type="text"
                inputMode="numeric"
                value={draft.months}
                onChange={(event) => setDraft({ ...draft, months: event.target.value })}
                className={ui.input}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-category`} className={ui.label}>Category</label>
            <select
              id={`${id}-category`}
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: isTaskCategory(event.target.value) ? event.target.value : 'other' })}
              className={ui.input}
            >
              {TASK_CATEGORIES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">Set a distance or months to 0 if it doesn&apos;t apply.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className={ui.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={ui.primaryButton}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1.5 text-sm">
            {variant === 'row' && (
              <>
                <dt className="font-semibold text-muted">Type</dt>
                <dd className="font-bold">{meta}</dd>
              </>
            )}
            <dt className="font-semibold text-muted">Interval</dt>
            <dd className="font-bold">{intervalLabel(task, unitSystem)}</dd>
            {!noStart && (
              <>
                <dt className="font-semibold text-muted">Last done</dt>
                <dd className="font-bold">{lastDoneLabel(task, neverLogged, unitSystem)}</dd>
              </>
            )}
            {task.notes && (
              <>
                <dt className="font-semibold text-muted">Notes</dt>
                <dd className="whitespace-pre-wrap">{task.notes}</dd>
              </>
            )}
          </dl>
          {noStart && (
            <p className="text-sm text-muted">
              When was this last done? Log it if you know. Not sure? Start counting today. Never been done? It counts
              from when the bike was new (0 {unitLabel}, January {bikeYear}).
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onLog} className={`flex-1 ${ui.primaryButton}`}>
              <Check size={16} strokeWidth={2.6} /> {noStart ? 'Log a past service' : 'Log service'}
            </button>
            <button type="button" onClick={startEditing} className={ui.iconButton} title="Edit interval" aria-label="Edit interval">
              <Pencil size={16} />
            </button>
            <button type="button" onClick={onReset} className={ui.iconButton} title="Reset to default interval" aria-label="Reset to default interval">
              <RotateCcw size={16} />
            </button>
            <ConfirmPopover
              message={`Delete "${task.task_name}"? Its past service records are kept.`}
              confirmLabel="Delete task"
              onConfirm={onDelete}
            >
              {(openConfirm, popoverProps) => (
                <button
                  type="button"
                  onClick={openConfirm}
                  {...popoverProps}
                  className={`${ui.iconButton} text-danger`}
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </ConfirmPopover>
          </div>
          {noStart && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onSetStart('today')} className={ui.secondaryButton}>
                Start today
              </button>
              <button type="button" onClick={() => onSetStart('new')} className={ui.secondaryButton}>
                Never done
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className={ui.errorBox}>{error}</p>}
    </div>
  );

  if (variant === 'row') {
    return (
      <li>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`${id}-details`}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        >
          {noStart ? (
            // No countdown to show yet, so the interval goes under the name.
            <span className="min-w-0">
              <span className="block font-semibold">{task.task_name}</span>
              <span className="block text-xs text-muted">{intervalLabel(task, unitSystem)}</span>
            </span>
          ) : (
            <>
              <span className="font-semibold">{task.task_name}</span>
              <span className="shrink-0 text-sm font-semibold text-muted tabular-nums">
                {due.value} {due.caption}
              </span>
            </>
          )}
        </button>
        {details}
      </li>
    );
  }

  return (
    <article className={ui.card}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`${id}-details`}
        className="block w-full px-4 pb-3.5 pt-4 text-left"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-base font-bold leading-snug">{task.task_name}</span>
            <span className="mt-0.5 block text-sm text-muted">{meta}</span>
          </span>
          <span className={`flex shrink-0 flex-col items-end ${STATUS_TEXT[dueState.status]}`}>
            <span className="text-2xl font-extrabold leading-none tracking-tight tabular-nums">{due.value}</span>
            <span className="mt-1 text-xs font-bold">{due.caption}</span>
          </span>
        </span>
        {percentUsed !== null && (
          <>
            <span className="mt-3 grid grid-cols-12 gap-[3px]" aria-hidden="true">
              {Array.from({ length: SEGMENTS }, (_, index) => (
                <span
                  key={index}
                  className={`h-2 -skew-x-12 rounded-[2px] ${index < litSegments ? STATUS_FILL[dueState.status] : 'bg-track'}`}
                />
              ))}
            </span>
            <span className="sr-only">
              {percentUsed}% of the {dueState.trigger === 'time' ? 'time' : 'distance'} interval used
            </span>
          </>
        )}
      </button>
      {alsoComingUp.length > 0 && (
        <p className="flex items-start gap-1.5 px-4 pb-3 text-sm text-muted">
          <Layers size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
          <span>
            Do it with: <span className="font-semibold text-fg">{alsoComingUp.map((other) => other.task_name).join(', ')}</span>
          </span>
        </p>
      )}
      {details}
    </article>
  );
}

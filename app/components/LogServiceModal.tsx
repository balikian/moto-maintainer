'use client';

import { useState, type SubmitEvent } from 'react';
import { Check } from 'lucide-react';
import { todayIsoDate } from '@/lib/dates';
import { groupTasksByUrgency, hasStartPoint, type TaskDueState } from '@/lib/maintenance';
import { SHOP_MAX_LENGTH } from '@/lib/serviceVisits';
import { specsForTasks, type ResolvedSpec } from '@/lib/specs';
import { batchCandidates } from '@/lib/taskCategories';
import { dueLabel } from '@/lib/taskLabels';
import type { MaintenanceTask, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import Modal from './Modal';
import TaskSpecs from './TaskSpecs';
import { ui } from './ui';

export type LogServiceValues = {
  /** Checklist tasks done in this visit, in the order shown. */
  taskIds: string[];
  /** A job not on the checklist. */
  oneOffName: string | null;
  performedAt: string;
  /** Null when left blank: the tasks' miles count from the bike's odometer. */
  odometer: number | null;
  cost: number | null;
  notes: string | null;
  shop: string | null;
};

type LogServiceModalProps = {
  tasks: MaintenanceTask[];
  /** The task being logged, when opened from a task card. It starts ticked. */
  task: MaintenanceTask | null;
  /** Filling in past service for tasks without a start point (from "When were these last done?"). */
  past?: boolean;
  unitSystem: UnitSystem;
  /** The bike's current odometer, in miles; null if it has no reading yet. */
  defaultOdometer: number | null;
  /** The date to start from, e.g. the last past service entered. Defaults to today. */
  initialDate?: string;
  /** Places to offer as one-tap choices for "Where". */
  shopChoices: string[];
  /** The bike's specs; the ones for the ticked tasks are shown. */
  specs: ResolvedSpec[];
  onClose: () => void;
  /** Receives the odometer in miles; resolves to an error message, or null on success. */
  onSubmit: (values: LogServiceValues) => Promise<string | null>;
};

type ChecklistEntry = { task: MaintenanceTask; dueState: TaskDueState; hint: string | null };

const DUE_TONE: Record<TaskDueState['status'], string> = {
  Overdue: 'text-danger',
  Urgent: 'text-danger',
  Soon: 'text-warn',
  Healthy: 'text-muted',
  NoStart: 'text-muted',
};

export default function LogServiceModal({
  tasks,
  task,
  past = false,
  unitSystem,
  defaultOdometer,
  initialDate,
  shopChoices,
  specs,
  onClose,
  onSubmit,
}: LogServiceModalProps) {
  // Opened for a task without a start point, or for all of them: the rider is filling in when they were last done.
  const pastService = past || (task !== null && !hasStartPoint(task));
  const [selectedIds, setSelectedIds] = useState<string[]>(task ? [task.id] : []);
  const [oneOffChecked, setOneOffChecked] = useState(tasks.length === 0);
  const [oneOffName, setOneOffName] = useState('');
  const [performedAt, setPerformedAt] = useState(() => initialDate ?? todayIsoDate());
  // A past service wasn't at today's odometer, so it starts blank.
  const [odometer, setOdometer] = useState(() =>
    defaultOdometer === null || pastService ? '' : String(toDisplayDistance(defaultOdometer, unitSystem))
  );
  const [shop, setShop] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Without a reading, a task counts its miles from the bike's odometer, so a bike without one needs it here.
  const odometerRequired = defaultOdometer === null;

  // The checklist, most useful first. The rest of the tasks wait behind "Show all".
  const [today] = useState(() => new Date());
  const groups = groupTasksByUrgency(tasks, defaultOdometer, today);
  const doItWith = task ? batchCandidates(task, [...groups.needsAttention, ...groups.healthy]).map((other) => other.id) : [];
  const ordered = pastService
    ? [...groups.noStart, ...groups.needsAttention, ...groups.healthy]
    : [...groups.needsAttention, ...groups.healthy, ...groups.noStart];
  const entries: ChecklistEntry[] = ordered.map(({ task: candidate, dueState }) => ({
    task: candidate,
    dueState,
    hint: doItWith.includes(candidate.id) ? 'Do it with this' : null,
  }));
  const isFeatured = (entry: ChecklistEntry) =>
    entry.task.id === task?.id ||
    entry.hint !== null ||
    (pastService ? entry.dueState.status === 'NoStart' : ['Overdue', 'Urgent', 'Soon'].includes(entry.dueState.status));
  // The opened task goes first, then the ones that pair with it.
  const featured = entries
    .filter(isFeatured)
    .sort((a, b) => Number(b.task.id === task?.id) - Number(a.task.id === task?.id) || Number(b.hint !== null) - Number(a.hint !== null));
  const others = entries.filter((entry) => !isFeatured(entry));
  const everythingShown = showAll || featured.length === 0;
  const visible = everythingShown ? [...featured, ...others] : [...featured, ...others.filter((entry) => selectedIds.includes(entry.task.id))];
  const hiddenCount = entries.length - visible.length;

  // Not for a past service: the work is already done.
  const tickedNames = tasks.filter((candidate) => selectedIds.includes(candidate.id)).map((candidate) => candidate.task_name);
  const specGroups = pastService ? [] : specsForTasks(tickedNames, specs);

  const itemCount = selectedIds.length + (oneOffChecked && oneOffName.trim() ? 1 : 0);

  const toggleTask = (taskId: string) =>
    setSelectedIds((previous) => (previous.includes(taskId) ? previous.filter((id) => id !== taskId) : [...previous, taskId]));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const oneOff = oneOffChecked ? oneOffName.trim() : '';
    const miles = odometer.trim() === '' ? null : fromDisplayDistance(odometer, unitSystem);
    const parsedCost = cost.trim() ? Number(cost) : null;

    if (oneOffChecked && !oneOff) {
      setError('Describe the other work, or untick it.');
      return;
    }
    if (selectedIds.length === 0 && !oneOff) {
      setError('Tick what was done.');
      return;
    }
    if (!performedAt) {
      setError('Date performed is required.');
      return;
    }
    if (miles === null ? odometerRequired : Number.isNaN(miles) || miles < 0) {
      setError(miles === null ? 'Enter the odometer reading. Your bike doesn’t have one yet.' : 'Please enter a valid odometer value.');
      return;
    }
    if (parsedCost !== null && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setError('Cost must be a valid positive number.');
      return;
    }

    setSaving(true);
    setError(null);
    // Saved in the order shown, so the cost goes with the first task.
    const shownOrder = [...featured, ...others].map((entry) => entry.task.id);
    const submitError = await onSubmit({
      taskIds: shownOrder.filter((id) => selectedIds.includes(id)),
      oneOffName: oneOff || null,
      performedAt,
      odometer: miles,
      cost: parsedCost,
      notes: notes.trim() || null,
      shop: shop.trim() || null,
    });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={pastService ? 'Log a past service' : 'Log service'}
      description={
        pastService
          ? 'Tick everything done at that visit. Each task counts from its date and odometer.'
          : 'Tick everything done at this visit. They share the date, odometer and cost.'
      }
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className={ui.label}>What was done</legend>
          <div className="divide-y divide-line rounded-xl border border-line">
            {visible.map(({ task: candidate, dueState, hint }) => {
              const due = dueLabel(dueState, unitSystem, candidate.interval_mileage);
              return (
                <label key={candidate.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candidate.id)}
                    onChange={() => toggleTask(candidate.id)}
                    className="h-5 w-5 shrink-0 accent-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">{candidate.task_name}</span>
                    {hint && <span className="block text-xs font-bold text-warn">{hint}</span>}
                  </span>
                  <span className={`shrink-0 text-right text-xs font-semibold tabular-nums ${DUE_TONE[dueState.status]}`}>
                    {dueState.status === 'NoStart' ? 'Not started' : `${due.value} ${due.caption}`.trim()}
                  </span>
                </label>
              );
            })}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="block w-full px-3 py-2.5 text-left text-sm font-bold text-accent hover:underline"
              >
                Show all tasks ({hiddenCount} more)
              </button>
            )}
            <div className="px-3 py-2">
              <label className="flex min-h-8 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={oneOffChecked}
                  onChange={(event) => setOneOffChecked(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-brand"
                />
                <span className="font-semibold">Something else (one-off job)</span>
              </label>
              {oneOffChecked && (
                <input
                  id="log-custom-name"
                  type="text"
                  aria-label="What else was done"
                  value={oneOffName}
                  onChange={(event) => setOneOffName(event.target.value)}
                  placeholder="Replaced rear tire, fork seals, 12,000 mi service"
                  maxLength={200}
                  autoFocus={tasks.length > 0}
                  className={`mt-2 ${ui.input}`}
                />
              )}
            </div>
          </div>
        </fieldset>

        <TaskSpecs groups={specGroups} unitSystem={unitSystem} title="Specs for this service" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="log-date" className={ui.label}>Date</label>
            <input
              id="log-date"
              type="date"
              value={performedAt}
              max={todayIsoDate()}
              onChange={(event) => setPerformedAt(event.target.value)}
              required
              className={ui.input}
            />
          </div>
          <div>
            <label htmlFor="log-odometer" className={ui.label}>
              Odometer ({distanceUnitLabel(unitSystem)}){' '}
              {!odometerRequired && <span className="font-normal text-muted">optional</span>}
            </label>
            <input
              id="log-odometer"
              type="number"
              min="0"
              inputMode="numeric"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              required={odometerRequired}
              className={ui.input}
            />
            {!odometerRequired && odometer.trim() === '' && selectedIds.length > 0 && (
              <p className={`mt-1 text-xs ${ui.muted}`}>Don&apos;t know? Its miles will count from your current odometer.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="log-shop" className={ui.label}>
            Where <span className="font-normal text-muted">optional</span>
          </label>
          <input
            id="log-shop"
            type="text"
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="Home, or the shop’s name"
            maxLength={SHOP_MAX_LENGTH}
            autoComplete="off"
            className={ui.input}
          />
          {shopChoices.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {shopChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setShop(choice)}
                  aria-pressed={shop.trim().toLowerCase() === choice.toLowerCase()}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    shop.trim().toLowerCase() === choice.toLowerCase()
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line text-fg hover:bg-raised'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="log-cost" className={ui.label}>
            Cost <span className="font-normal text-muted">{itemCount > 1 ? 'optional, for the whole visit' : 'optional'}</span>
          </label>
          <input
            id="log-cost"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder="e.g. 49.99"
            className={ui.input}
          />
        </div>

        <div>
          <label htmlFor="log-notes" className={ui.label}>Notes and parts used</label>
          <textarea
            id="log-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Oil type, filter brand, torque specs, observations..."
            className={ui.input}
          />
        </div>

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ui.secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={ui.primaryButton}>
            <Check size={16} />
            {saving ? 'Saving…' : itemCount > 1 ? `Save ${itemCount} services` : 'Save service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

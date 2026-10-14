'use client';

import { useState, type SubmitEvent } from 'react';
import { Check } from 'lucide-react';
import { todayIsoDate } from '@/lib/dates';
import { getTaskDueState } from '@/lib/maintenance';
import { batchCandidates, categoryLabel, taskCategory } from '@/lib/taskCategories';
import type { MaintenanceTask, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import Modal from './Modal';
import { ui } from './ui';

export type LogServiceValues = {
  taskId: string | null;
  taskName: string;
  performedAt: string;
  odometer: number;
  cost: number | null;
  notes: string | null;
  /** Related tasks done in the same visit; logged with the same date and odometer. */
  alsoTaskIds: string[];
};

type LogServiceModalProps = {
  tasks: MaintenanceTask[];
  /** The task being logged, when opened from a task card. The task picker is locked to it. */
  task: MaintenanceTask | null;
  unitSystem: UnitSystem;
  /** The bike's current odometer, in miles. */
  defaultOdometer: number;
  onClose: () => void;
  /** Receives the odometer in miles; resolves to an error message, or null on success. */
  onSubmit: (values: LogServiceValues) => Promise<string | null>;
};

const CUSTOM_ONE_OFF_VALUE = '__custom_one_off__';

export default function LogServiceModal({ tasks, task, unitSystem, defaultOdometer, onClose, onSubmit }: LogServiceModalProps) {
  const [selectedTaskId, setSelectedTaskId] = useState(task?.id ?? tasks[0]?.id ?? CUSTOM_ONE_OFF_VALUE);
  const [customTaskName, setCustomTaskName] = useState('');
  const [performedAt, setPerformedAt] = useState(todayIsoDate);
  const [odometer, setOdometer] = useState(String(toDisplayDistance(defaultOdometer, unitSystem)));
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alsoTaskIds, setAlsoTaskIds] = useState<string[]>([]);

  const selectedTask = tasks.find((candidate) => candidate.id === selectedTaskId) ?? null;
  const isCustom = selectedTask === null;

  // Same-category tasks that are coming due: worth doing while the bike is apart anyway.
  const [today] = useState(() => new Date());
  const related = selectedTask
    ? batchCandidates(
        selectedTask,
        tasks.map((candidate) => ({ task: candidate, dueState: getTaskDueState(candidate, defaultOdometer, today) }))
      )
    : [];

  const toggleAlso = (taskId: string) =>
    setAlsoTaskIds((previous) => (previous.includes(taskId) ? previous.filter((id) => id !== taskId) : [...previous, taskId]));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const taskName = (isCustom ? customTaskName : selectedTask.task_name).trim();
    const miles = fromDisplayDistance(odometer, unitSystem);
    const parsedCost = cost.trim() ? Number(cost) : null;

    if (!taskName) {
      setError('Service name or description is required.');
      return;
    }
    if (!performedAt) {
      setError('Date performed is required.');
      return;
    }
    if (odometer.trim() === '' || Number.isNaN(miles) || miles < 0) {
      setError('Please enter a valid odometer value.');
      return;
    }
    if (parsedCost !== null && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setError('Cost must be a valid positive number.');
      return;
    }

    setSaving(true);
    setError(null);
    const submitError = await onSubmit({
      taskId: selectedTask?.id ?? null,
      taskName,
      performedAt,
      odometer: miles,
      cost: parsedCost,
      notes: notes.trim() || null,
      alsoTaskIds: alsoTaskIds.filter((id) => related.some((candidate) => candidate.id === id)),
    });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title="Log service"
      description={task ? 'Record when it was done and what it cost.' : 'Record maintenance details for this bike.'}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {task ? (
          // Logging from a task card: the task is fixed, so it's plain text, not something that looks editable.
          <div>
            <span className="block text-sm font-semibold text-muted">Task</span>
            <p className="text-lg font-extrabold leading-snug">{task.task_name}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="log-task" className={ui.label}>Task</label>
            <select
              id="log-task"
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className={ui.input}
            >
              {tasks.map((option) => (
                <option key={option.id} value={option.id}>{option.task_name}</option>
              ))}
              <option value={CUSTOM_ONE_OFF_VALUE}>+ Something else (one-off job)</option>
            </select>
          </div>
        )}

        {related.length > 0 && selectedTask && (
          <fieldset className="rounded-xl border border-warn/30 bg-warn/5 px-3 py-2.5">
            <legend className="px-1 text-sm font-bold text-warn">
              While you&apos;re at it: also coming up in {categoryLabel(taskCategory(selectedTask))}
            </legend>
            <div className="space-y-1.5">
              {related.map((candidate) => (
                <label key={candidate.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={alsoTaskIds.includes(candidate.id)}
                    onChange={() => toggleAlso(candidate.id)}
                    className="h-4 w-4 accent-brand"
                  />
                  {candidate.task_name}
                </label>
              ))}
            </div>
            <p className={`mt-1.5 text-xs ${ui.muted}`}>Ticked tasks are logged too, with the same date and odometer.</p>
          </fieldset>
        )}

        {isCustom && (
          <div>
            <label htmlFor="log-custom-name" className={ui.label}>What was done</label>
            <input
              id="log-custom-name"
              type="text"
              value={customTaskName}
              onChange={(event) => setCustomTaskName(event.target.value)}
              placeholder="Replaced rear tire, fork seals, installed skid plate"
              required
              className={ui.input}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="log-date" className={ui.label}>Date</label>
            <input
              id="log-date"
              type="date"
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
              required
              className={ui.input}
            />
          </div>
          <div>
            <label htmlFor="log-odometer" className={ui.label}>Odometer ({distanceUnitLabel(unitSystem)})</label>
            <input
              id="log-odometer"
              type="number"
              min="0"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              required
              className={ui.input}
            />
          </div>
        </div>

        <div>
          <label htmlFor="log-cost" className={ui.label}>Cost (optional)</label>
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
            rows={4}
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
            {saving ? 'Saving…' : 'Save service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

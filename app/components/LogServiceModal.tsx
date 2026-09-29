'use client';

import { useState, type SubmitEvent } from 'react';
import { Check } from 'lucide-react';
import { todayIsoDate } from '@/lib/dates';
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

  const selectedTask = tasks.find((candidate) => candidate.id === selectedTaskId) ?? null;
  const isCustom = selectedTask === null;

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
    });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title="Log Service"
      description={`Record maintenance details for ${task?.task_name ?? 'this bike'}.`}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="log-task" className={ui.label}>Task</label>
          <select
            id="log-task"
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            className={ui.input}
            disabled={task !== null}
          >
            {tasks.map((option) => (
              <option key={option.id} value={option.id}>{option.task_name}</option>
            ))}
            <option value={CUSTOM_ONE_OFF_VALUE}>+ Custom / One-Off Service</option>
          </select>
        </div>

        {isCustom && (
          <div>
            <label htmlFor="log-custom-name" className={ui.label}>Service Name / Description</label>
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
            <label htmlFor="log-date" className={ui.label}>Date Performed</label>
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
          <label htmlFor="log-cost" className={ui.label}>Cost (Optional)</label>
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
          <label htmlFor="log-notes" className={ui.label}>Service Notes / Parts Used</label>
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
            {saving ? 'Saving…' : 'Save Service Log'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { useState, type SubmitEvent } from 'react';
import { Plus } from 'lucide-react';
import { todayIsoDate } from '@/lib/dates';
import type { UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import Modal from './Modal';
import { ui } from './ui';

export type NewTaskValues = {
  taskName: string;
  intervalMileage: number;
  intervalMonths: number;
  baselineOdometer: number;
  baselineDate: string;
  notes: string;
};

type AddCustomTaskModalProps = {
  unitSystem: UnitSystem;
  /** The bike's current odometer, in miles. */
  currentOdometer: number;
  onClose: () => void;
  /** Receives distances in miles; resolves to an error message, or null on success. */
  onSubmit: (values: NewTaskValues) => Promise<string | null>;
};

export default function AddCustomTaskModal({ unitSystem, currentOdometer, onClose, onSubmit }: AddCustomTaskModalProps) {
  const [taskName, setTaskName] = useState('');
  const [intervalDistance, setIntervalDistance] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');
  const [baselineOdometer, setBaselineOdometer] = useState(String(toDisplayDistance(currentOdometer, unitSystem)));
  const [baselineDate, setBaselineDate] = useState(todayIsoDate);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitLabel = distanceUnitLabel(unitSystem);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const intervalMileage = intervalDistance.trim() ? fromDisplayDistance(intervalDistance, unitSystem) : 0;
    const months = intervalMonths.trim() ? Number(intervalMonths) : 0;
    const baseline = fromDisplayDistance(baselineOdometer || '0', unitSystem);

    if (!taskName.trim()) {
      setError('Task name is required.');
      return;
    }
    if (Number.isNaN(intervalMileage) || intervalMileage < 0 || !Number.isFinite(months) || months < 0) {
      setError('Intervals must be non-negative numbers.');
      return;
    }
    if (intervalMileage === 0 && months === 0) {
      setError('Enter a distance interval, a time interval, or both.');
      return;
    }
    if (Number.isNaN(baseline) || baseline < 0) {
      setError('Please enter a valid baseline odometer.');
      return;
    }

    setSaving(true);
    setError(null);
    const submitError = await onSubmit({
      taskName,
      intervalMileage,
      intervalMonths: months,
      baselineOdometer: baseline,
      baselineDate,
      notes,
    });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal title="Add Custom Task" description="Create a maintenance item unique to this motorcycle." size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task-name" className={ui.label}>Task Name</label>
          <input
            id="task-name"
            type="text"
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Brake fluid flush"
            required
            className={ui.input}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="task-interval-distance" className={ui.label}>Interval ({unitLabel})</label>
            <input
              id="task-interval-distance"
              type="number"
              min="0"
              value={intervalDistance}
              onChange={(event) => setIntervalDistance(event.target.value)}
              placeholder={unitSystem === 'metric' ? '10000' : '6000'}
              className={ui.input}
            />
          </div>
          <div>
            <label htmlFor="task-interval-months" className={ui.label}>Interval (Months)</label>
            <input
              id="task-interval-months"
              type="number"
              min="0"
              value={intervalMonths}
              onChange={(event) => setIntervalMonths(event.target.value)}
              placeholder="12"
              className={ui.input}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="task-baseline-odometer" className={ui.label}>Last Done At ({unitLabel})</label>
            <input
              id="task-baseline-odometer"
              type="number"
              min="0"
              value={baselineOdometer}
              onChange={(event) => setBaselineOdometer(event.target.value)}
              className={ui.input}
            />
          </div>
          <div>
            <label htmlFor="task-baseline-date" className={ui.label}>Last Done On</label>
            <input
              id="task-baseline-date"
              type="date"
              value={baselineDate}
              onChange={(event) => setBaselineDate(event.target.value)}
              required
              className={ui.input}
            />
          </div>
        </div>

        <div>
          <label htmlFor="task-notes" className={ui.label}>Notes</label>
          <textarea
            id="task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="OEM pads, 5W-40, torque values..."
            className={ui.input}
          />
        </div>

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ui.secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={ui.primaryButton}>
            <Plus size={16} />
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

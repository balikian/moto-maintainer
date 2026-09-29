'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { createMaintenanceTaskAction } from '@/lib/actions/tasks';

type AddCustomTaskModalProps = {
  isOpen: boolean;
  motorcycleId: string | null;
  currentOdometer: number;
  onClose: () => void;
  onTaskCreated?: () => Promise<void> | void;
  onError?: (message: string) => void;
};

type TaskFormState = {
  taskName: string;
  intervalMileage: string;
  intervalMonths: string;
  baselineOdometer: string;
  baselineDate: string;
  notes: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AddCustomTaskModal({
  isOpen,
  motorcycleId,
  currentOdometer,
  onClose,
  onTaskCreated,
  onError,
}: AddCustomTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>({
    taskName: '',
    intervalMileage: '',
    intervalMonths: '',
    baselineOdometer: String(currentOdometer || 0),
    baselineDate: todayIsoDate(),
    notes: '',
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    setFormState((prev) => ({
      ...prev,
      baselineOdometer: String(currentOdometer || 0),
      baselineDate: todayIsoDate(),
    }));
  }, [currentOdometer, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (key: keyof TaskFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!motorcycleId) {
      const message = 'Select a bike before adding a custom task.';
      setLocalError(message);
      onError?.(message);
      return;
    }

    const taskName = formState.taskName.trim();
    const intervalMileage = Number(formState.intervalMileage);
    const intervalMonths = Number(formState.intervalMonths || 0);
    const baselineOdometer = Number(formState.baselineOdometer || 0);

    if (!taskName || Number.isNaN(intervalMileage) || intervalMileage <= 0) {
      setLocalError('Task name and interval mileage are required.');
      return;
    }

    if (!formState.baselineDate) {
      setLocalError('Baseline date is required.');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const result = await createMaintenanceTaskAction({
        motorcycleId,
        taskName,
        intervalMileage,
        intervalMonths: Number.isNaN(intervalMonths) ? 0 : intervalMonths,
        baselineOdometer: Number.isNaN(baselineOdometer) ? 0 : baselineOdometer,
        baselineDate: formState.baselineDate,
        notes: formState.notes,
      });

      if (result.error) {
        setLocalError(result.error);
        onError?.(result.error);
        return;
      }

      await onTaskCreated?.();

      setFormState({
        taskName: '',
        intervalMileage: '',
        intervalMonths: '',
        baselineOdometer: String(currentOdometer || 0),
        baselineDate: todayIsoDate(),
        notes: '',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Close add custom task modal"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-zinc-100">Add Custom Task</h3>
        <p className="mt-1 text-sm text-zinc-400">Create a maintenance item unique to this motorcycle.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Task Name</label>
            <input
              type="text"
              value={formState.taskName}
              onChange={(event) => handleChange('taskName', event.target.value)}
              placeholder="Brake fluid flush"
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Interval Mileage</label>
              <input
                type="number"
                min="1"
                value={formState.intervalMileage}
                onChange={(event) => handleChange('intervalMileage', event.target.value)}
                placeholder="6000"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Interval (Months)</label>
              <input
                type="number"
                min="0"
                value={formState.intervalMonths}
                onChange={(event) => handleChange('intervalMonths', event.target.value)}
                placeholder="12"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Baseline Odometer</label>
              <input
                type="number"
                min="0"
                value={formState.baselineOdometer}
                onChange={(event) => handleChange('baselineOdometer', event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Baseline Date</label>
              <input
                type="date"
                value={formState.baselineDate}
                onChange={(event) => handleChange('baselineDate', event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</label>
            <textarea
              value={formState.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              rows={3}
              placeholder="OEM pads, 5W-40, torque values..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
            />
          </div>

          {localError && (
            <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
              {localError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus size={16} />
              {isSubmitting ? 'Adding...' : '+ Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

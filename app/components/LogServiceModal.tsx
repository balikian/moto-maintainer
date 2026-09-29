'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

type LogServicePayload = {
  taskId: string | null;
  taskName: string;
  performedAt: string;
  odometer: number;
  cost?: number | null;
  notes?: string | null;
};

type LogServiceModalProps = {
  isOpen: boolean;
  taskName: string;
  tasks: Array<{ id: string; taskName: string }>;
  initialTaskId?: string | null;
  lockTaskSelection?: boolean;
  defaultDate: string;
  defaultOdometer: number;
  onClose: () => void;
  onSubmit: (payload: LogServicePayload) => Promise<string | null>;
};

const CUSTOM_ONE_OFF_VALUE = '__custom_one_off__';

export default function LogServiceModal({
  isOpen,
  taskName,
  tasks,
  initialTaskId = null,
  lockTaskSelection = false,
  defaultDate,
  defaultOdometer,
  onClose,
  onSubmit,
}: LogServiceModalProps) {
  const wasOpenRef = useRef(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTaskId ?? tasks[0]?.id ?? CUSTOM_ONE_OFF_VALUE
  );
  const [customTaskName, setCustomTaskName] = useState('');
  const [performedAt, setPerformedAt] = useState(defaultDate);
  const [odometer, setOdometer] = useState(String(defaultOdometer));
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen || wasOpen) return;

    setPerformedAt(defaultDate);
    setOdometer(String(defaultOdometer));
    setSelectedTaskId(initialTaskId ?? tasks[0]?.id ?? CUSTOM_ONE_OFF_VALUE);
    setCustomTaskName('');
    setCost('');
    setNotes('');
    setError(null);
  }, [defaultDate, defaultOdometer, initialTaskId, isOpen, tasks]);

  if (!isOpen) {
    return null;
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const isCustomMode = tasks.length === 0 || selectedTaskId === CUSTOM_ONE_OFF_VALUE || !selectedTask;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const resolvedTaskName = isCustomMode
      ? customTaskName.trim()
      : (selectedTask?.taskName ?? '').trim();

    const resolvedTaskId = isCustomMode ? null : selectedTask?.id ?? null;

    if (!resolvedTaskName) {
      setError('Service name or description is required.');
      return;
    }

    const parsedOdometer = Math.round(Number(odometer));
    if (!performedAt) {
      setError('Date performed is required.');
      return;
    }

    if (Number.isNaN(parsedOdometer) || parsedOdometer < 0) {
      setError('Please enter a valid odometer value.');
      return;
    }

    const trimmedCost = cost.trim();
    const parsedCost = trimmedCost.length > 0 ? Number(trimmedCost) : undefined;
    if (typeof parsedCost === 'number' && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setError('Cost must be a valid positive number.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const maybeError = await onSubmit({
        taskId: resolvedTaskId,
        taskName: resolvedTaskName,
        performedAt,
        odometer: parsedOdometer,
        cost: parsedCost,
        notes: notes.trim() || null,
      });

      if (maybeError) {
        setError(maybeError);
        return;
      }

      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : 'Unable to save the service log right now. Please try again.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Close log service modal"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-zinc-100">Log Service</h3>
        <p className="mt-1 text-sm text-zinc-400">Record maintenance details for {taskName}.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Select Task</label>
            <select
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-amber-500"
              disabled={lockTaskSelection}
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.taskName}
                </option>
              ))}
              <option value={CUSTOM_ONE_OFF_VALUE}>+ Custom / One-Off Service</option>
            </select>
          </div>

          {isCustomMode && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Service Name / Description</label>
              <input
                type="text"
                value={customTaskName}
                onChange={(event) => setCustomTaskName(event.target.value)}
                placeholder="Replaced Rear Tire, Fork Seal Replacement, Installed Skid Plate"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Date Performed</label>
              <input
                type="date"
                value={performedAt}
                onChange={(event) => setPerformedAt(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-amber-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Odometer</label>
              <input
                type="number"
                min="0"
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Cost (Optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="e.g, 49.99"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Service Notes / Parts Used</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Oil type, filter brand, torque specs, observations..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
              {error}
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
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Check size={16} />
              {isSaving ? 'Saving...' : 'Save Service Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

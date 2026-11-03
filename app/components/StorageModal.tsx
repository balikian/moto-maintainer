'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import { todayIsoDate } from '@/lib/dates';
import { groupTasksByUrgency } from '@/lib/maintenance';
import {
  BATTERY_TYPES,
  cleanBatteryType,
  cleanStorageChecklist,
  roadChecklist,
  storageChecklist,
  type BatteryType,
  type ChecklistItem,
} from '@/lib/storage';
import { dueLabel } from '@/lib/taskLabels';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import Modal from './Modal';
import { ui } from './ui';

type StorageModalProps = {
  bike: Motorcycle;
  /** 'store': the storage checklist, and putting it away (or changing the day while it's stored). 'return': back on the road. */
  mode: 'store' | 'return';
  /** The bike's tasks, for what came due while it was stored. */
  tasks: MaintenanceTask[];
  /** The battery type guessed from its battery spec, when the rider hasn't said. */
  batteryGuess: BatteryType | null;
  unitSystem: UnitSystem;
  onClose: () => void;
  /** Saves the ticks as they change; resolves to an error message, or null. */
  onChecklist: (keys: string[]) => Promise<string | null>;
  onStore: (storedOn: string, batteryType: BatteryType | null) => Promise<string | null>;
  onReturn: () => Promise<string | null>;
};

/** Not sure: the advice covers both. */
const UNKNOWN = '';

function Checklist({ items, ticked, onToggle }: { items: ChecklistItem[]; ticked: string[]; onToggle: (key: string) => void }) {
  return (
    <ul className={`divide-y divide-line ${ui.card}`}>
      {items.map((item) => (
        <li key={item.key}>
          <label className="flex cursor-pointer items-start gap-3 px-3.5 py-3">
            <input
              type="checkbox"
              checked={ticked.includes(item.key)}
              onChange={() => onToggle(item.key)}
              className="mt-1 h-4 w-4 shrink-0 accent-brand"
            />
            <span className="min-w-0 flex-1">
              <span className={`block font-semibold ${ticked.includes(item.key) ? 'text-muted line-through' : ''}`}>{item.label}</span>
              <span className="mt-0.5 block text-sm text-muted">{item.detail}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Storage mode for one bike: the checklist for putting it away (with the day
 * and battery type), or the one for getting it back on the road, with the
 * tasks that came due while it sat. Ticks save as they're made, so the rider
 * can come back to the list.
 */
export default function StorageModal({
  bike,
  mode,
  tasks,
  batteryGuess,
  unitSystem,
  onClose,
  onChecklist,
  onStore,
  onReturn,
}: StorageModalProps) {
  const stored = Boolean(bike.stored_on);
  const [ticked, setTicked] = useState(() => cleanStorageChecklist(bike.storage_checklist));
  const [battery, setBattery] = useState<BatteryType | typeof UNKNOWN>(() => cleanBatteryType(bike.battery_type) ?? batteryGuess ?? UNKNOWN);
  const [storedOn, setStoredOn] = useState(bike.stored_on ?? todayIsoDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One save at a time, in order, so a quick run of ticks ends on the last one.
  const saveQueue = useRef(Promise.resolve());

  const [today] = useState(() => new Date());
  const batteryType = battery || null;
  const items = mode === 'store' ? storageChecklist(batteryType) : roadChecklist(batteryType);
  const done = items.filter((item) => ticked.includes(item.key)).length;
  const cameDue = mode === 'return' ? groupTasksByUrgency(tasks, bike.current_mileage, today).needsAttention : [];

  const toggle = (key: string) => {
    const next = ticked.includes(key) ? ticked.filter((other) => other !== key) : [...ticked, key];
    setTicked(next);
    saveQueue.current = saveQueue.current.then(async () => {
      const saveError = await onChecklist(next);
      if (saveError) setError(`Couldn’t save that tick: ${saveError}`);
    });
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    await saveQueue.current;
    const submitError = mode === 'store' ? await onStore(storedOn, batteryType) : await onReturn();
    setSaving(false);
    if (submitError) setError(submitError);
  };

  const title = mode === 'return' ? 'Back on the road' : stored ? 'Storage checklist' : 'Put in storage';
  const description =
    mode === 'return'
      ? `Before the first ride on the ${bike.model}. Ticks are saved as you go.`
      : `Getting the ${bike.model} ready to sit. Ticks are saved as you go, so you can come back to the list.`;

  return (
    <Modal title={title} description={description} size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === 'store' && (
          <fieldset>
            <legend className={ui.label}>Battery</legend>
            <div role="radiogroup" aria-label="Battery" className="inline-flex flex-wrap rounded-xl bg-raised p-1">
              {[...BATTERY_TYPES, { value: UNKNOWN, label: 'Not sure' } as const].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={battery === option.value}
                  onClick={() => setBattery(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    battery === option.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className={`mt-1 text-xs ${ui.muted}`}>Lithium batteries need a lithium-safe charger, so the advice differs.</p>
          </fieldset>
        )}

        {cameDue.length > 0 && (
          <section aria-labelledby="storage-came-due">
            <h3 id="storage-came-due" className={ui.label}>Due now</h3>
            <ul className={`divide-y divide-line ${ui.card}`}>
              {cameDue.map(({ task, dueState }) => {
                const due = dueLabel(dueState, unitSystem, task.interval_mileage);
                return (
                  <li key={task.id} className="flex min-h-12 items-center gap-3 px-3.5 py-2">
                    <span className="min-w-0 flex-1 font-semibold">{task.task_name}</span>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${dueState.status === 'Soon' ? 'text-warn' : 'text-danger'}`}>
                      {due.value} {due.caption}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className={`mt-1 text-xs ${ui.muted}`}>Log them on Tasks once they&apos;re done.</p>
          </section>
        )}

        <fieldset>
          <legend className={ui.label}>
            {mode === 'return' ? 'Before you ride' : 'Before it sits'}{' '}
            <span className="font-normal">
              ({done} of {items.length} done)
            </span>
          </legend>
          <Checklist items={items} ticked={ticked} onToggle={toggle} />
        </fieldset>

        {mode === 'store' && (
          <div>
            <label htmlFor="storage-date" className={ui.label}>In storage since</label>
            <input
              id="storage-date"
              type="date"
              value={storedOn}
              max={todayIsoDate()}
              onChange={(event) => setStoredOn(event.target.value)}
              required
              className={`${ui.input} sm:w-56`}
            />
            <p className={`mt-1 text-xs ${ui.muted}`}>
              While it&apos;s stored, reminders ask about the battery every four weeks, and odometer check-ins pause.
            </p>
          </div>
        )}

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={`w-1/2 py-2.5 ${ui.secondaryButton}`}>
            {mode === 'return' ? 'Not yet' : 'Close'}
          </button>
          <button type="submit" disabled={saving} className={`w-1/2 py-2.5 ${ui.primaryButton}`}>
            {saving ? 'Saving…' : mode === 'return' ? 'Back on the road' : stored ? 'Save' : 'Put in storage'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

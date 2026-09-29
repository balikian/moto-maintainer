'use client';

import { useState, type SubmitEvent } from 'react';
import { Check, Gauge, X } from 'lucide-react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, formatDistance, fromDisplayDistance, toDisplayDistance } from '@/lib/units';

type OdometerControlProps = {
  bike: Motorcycle | null;
  unitSystem: UnitSystem;
  /** Receives miles; resolves to an error message, or null on success. */
  onSave: (miles: number) => Promise<string | null>;
};

export default function OdometerControl({ bike, unitSystem, onSave }: OdometerControlProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const miles = fromDisplayDistance(draft ?? '', unitSystem);
    if (Number.isNaN(miles) || miles < 0) {
      setError('Enter a valid reading.');
      return;
    }

    setSaving(true);
    const saveError = await onSave(miles);
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setDraft(null);
    setError(null);
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950">
      <Gauge size={14} className="text-amber-500" />
      <span className="font-mono font-bold">{bike ? formatDistance(bike.current_mileage, unitSystem) : '--'}</span>

      {draft === null ? (
        <button
          type="button"
          disabled={!bike}
          onClick={() => bike && setDraft(String(toDisplayDistance(bike.current_mileage, unitSystem)))}
          className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-500 dark:hover:text-amber-400"
        >
          Update
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="inline-flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            className="w-24 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder={`New ${distanceUnitLabel(unitSystem)}`}
            aria-label={`Odometer in ${distanceUnitLabel(unitSystem)}`}
            autoFocus
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-slate-950 transition-colors hover:bg-amber-600 disabled:opacity-70"
          >
            <Check size={11} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <X size={11} /> Cancel
          </button>
        </form>
      )}
      {error && <span className="text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}

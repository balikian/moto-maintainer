'use client';

import { useId, useState, type SubmitEvent } from 'react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance, toDisplayDistance } from '@/lib/units';
import { ui } from './ui';

type OdometerControlProps = {
  bike: Motorcycle;
  unitSystem: UnitSystem;
  /** Receives miles; resolves to an error message, or null on success. */
  onSave: (miles: number) => Promise<string | null>;
};

export default function OdometerControl({ bike, unitSystem, onSave }: OdometerControlProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const unitLabel = distanceUnitLabel(unitSystem);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const miles = fromDisplayDistance(draft ?? '', unitSystem);
    if (draft?.trim() === '' || Number.isNaN(miles) || miles < 0) {
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

  if (draft !== null) {
    return (
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className={ui.label}>Odometer ({unitLabel})</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            className={`${ui.input} w-36 text-lg font-bold tabular-nums`}
            autoFocus
          />
          <button type="submit" disabled={saving} className={ui.primaryButton}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
            className={ui.secondaryButton}
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </form>
    );
  }

  // Added without a reading: ask for one, since mileage intervals can't count without it.
  if (bike.current_mileage === null) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="block text-sm font-semibold text-muted">Odometer</span>
          <span className="block text-sm">No reading yet. Tasks count by time until you add one.</span>
        </div>
        <button type="button" onClick={() => setDraft('')} className={`shrink-0 ${ui.primaryButton}`}>
          Add reading
        </button>
      </div>
    );
  }
  const displayMileage = toDisplayDistance(bike.current_mileage, unitSystem);

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="block text-sm font-semibold text-muted">Odometer</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight tabular-nums">{displayMileage.toLocaleString()}</span>
          <span className="text-base font-bold text-muted">{unitLabel}</span>
        </span>
      </div>
      <button type="button" onClick={() => setDraft(String(displayMileage))} className={ui.secondaryButton}>
        Update
      </button>
    </div>
  );
}

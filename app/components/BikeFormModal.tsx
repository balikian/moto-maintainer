'use client';

import { useMemo, useState, type SubmitEvent } from 'react';
import { BASE_CATALOG, mergeCatalog, type CustomModel } from '@/lib/bikeCatalog';
import { DEFAULT_BIKE_SETUP, type BikeSetup } from '@/lib/maintenance';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance } from '@/lib/units';
import MakeModelFields, { modelYears, useMakeModel } from './MakeModelFields';
import Modal from './Modal';
import { ui } from './ui';

/** currentMileage is null when the rider leaves the odometer for later. */
export type BikeFormValues = { year: number; make: string; model: string; currentMileage: number | null; setup: BikeSetup };

/** A row of segmented buttons, for short either/or choices. */
function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-raised p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              value === option.value
                ? 'bg-surface text-fg shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type BikeFormModalProps = {
  /** The bike being edited; omit to add a new bike. */
  bike?: Motorcycle;
  /** Approved makes/models riders added, shown alongside the built-in list. */
  customModels: CustomModel[];
  unitSystem: UnitSystem;
  onClose: () => void;
  /** Receives the odometer in miles; resolves to an error message, or null on success. */
  onSubmit: (values: BikeFormValues) => Promise<string | null>;
};

export default function BikeFormModal({ bike, customModels, unitSystem, onClose, onSubmit }: BikeFormModalProps) {
  const isEditing = Boolean(bike);
  const currentYear = new Date().getFullYear();
  const catalog = useMemo(() => mergeCatalog(BASE_CATALOG, customModels), [customModels]);
  const picker = useMakeModel(catalog, bike);
  const [year, setYear] = useState(bike?.year ?? currentYear);
  const [odometer, setOdometer] = useState('');
  const [setup, setSetup] = useState<BikeSetup>(DEFAULT_BIKE_SETUP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(() => modelYears(currentYear), [currentYear]);
  const resolvedMake = picker.make;
  const resolvedModel = picker.model;

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    // When editing, the odometer isn't on this form; it has its own Update control.
    // Adding, it's optional: left blank, the bike has no reading until the rider enters one.
    const miles = bike ? bike.current_mileage : odometer.trim() === '' ? null : fromDisplayDistance(odometer, unitSystem);

    if (!resolvedMake || !resolvedModel) {
      setError('Please choose or enter a make and model.');
      return;
    }
    if (!bike && miles !== null && (Number.isNaN(miles) || miles < 0)) {
      setError('Please enter a valid odometer reading.');
      return;
    }

    setSaving(true);
    setError(null);
    const submitError = await onSubmit({ year, make: resolvedMake, model: resolvedModel, currentMileage: miles, setup });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={isEditing ? 'Edit bike' : 'Add a bike'}
      description={
        isEditing
          ? 'Your maintenance tasks and service history stay as they are.'
          : 'Park a new machine in your digital garage.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bike-year" className={ui.label}>Year</label>
          <select id="bike-year" required value={year} onChange={(event) => setYear(Number(event.target.value))} className={ui.input}>
            {years.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <MakeModelFields picker={picker} idPrefix="bike" />

        {isEditing ? (
          <p className={`text-xs ${ui.muted}`}>
            Tip: include the trim level in the model (for example &ldquo;Norden 901 Expedition&rdquo;) if it has its own
            owner&apos;s manual. Choose &ldquo;Other / Not Listed&rdquo; to type it.
          </p>
        ) : (
          <div>
            <label htmlFor="bike-odometer" className={ui.label}>
              Current odometer ({distanceUnitLabel(unitSystem)}) <span className="font-normal text-muted">optional</span>
            </label>
            <input
              id="bike-odometer"
              type="number"
              min="0"
              inputMode="numeric"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className={ui.input}
            />
            <p className={`mt-1 text-xs ${ui.muted}`}>Not with the bike? Add it later. Until then, tasks count by time only.</p>
          </div>
        )}

        {!isEditing && (
          <fieldset className="space-y-3">
            <legend className={ui.label}>Starter checklist</legend>
            <ChoiceRow
              label="Final drive"
              value={setup.finalDrive}
              options={[
                { value: 'chain', label: 'Chain' },
                { value: 'belt', label: 'Belt' },
                { value: 'shaft', label: 'Shaft' },
              ]}
              onChange={(finalDrive) => setSetup({ ...setup, finalDrive })}
            />
            <ChoiceRow
              label="Engine cooling"
              value={setup.cooling}
              options={[
                { value: 'liquid', label: 'Liquid' },
                { value: 'air', label: 'Air / oil' },
              ]}
              onChange={(cooling) => setSetup({ ...setup, cooling })}
            />
            <p className={`text-xs ${ui.muted}`}>
              Picks the right starter tasks. If we have the manufacturer&apos;s schedule for this bike, that&apos;s used instead.
            </p>
          </fieldset>
        )}

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={`w-1/2 py-2.5 ${ui.secondaryButton}`}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={`w-1/2 py-2.5 ${ui.primaryButton}`}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add to garage'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

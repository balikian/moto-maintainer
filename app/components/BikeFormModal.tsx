'use client';

import { useMemo, useState, type SubmitEvent } from 'react';
import motorcyclesData from '@/lib/data/motorcycles.json';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { distanceUnitLabel, fromDisplayDistance } from '@/lib/units';
import Modal from './Modal';
import { ui } from './ui';

export type BikeFormValues = { year: number; make: string; model: string; currentMileage: number };

type BikeFormModalProps = {
  /** The bike being edited; omit to add a new bike. */
  bike?: Motorcycle;
  unitSystem: UnitSystem;
  onClose: () => void;
  /** Receives the odometer in miles; resolves to an error message, or null on success. */
  onSubmit: (values: BikeFormValues) => Promise<string | null>;
};

// Option value for "Other / Not Listed". Can't collide with a real make or model name.
const OTHER = '__other__';

const motorcycleRegistry = motorcyclesData as Record<string, { years: number[]; models: string[] }>;
const MAKES = Object.keys(motorcycleRegistry).sort((a, b) => a.localeCompare(b));

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Maps a saved bike onto the dropdowns, using "Other" + a text box for names not in the list. */
function initialSelection(bike?: Motorcycle) {
  if (!bike) return { make: '', model: '', customMake: '', customModel: '' };

  const knownMake = MAKES.find((make) => sameName(make, bike.make));
  if (!knownMake) return { make: OTHER, model: '', customMake: bike.make, customModel: bike.model };

  const models = motorcycleRegistry[knownMake]?.models ?? [];
  const knownModel = models.find((model) => sameName(model, bike.model));
  if (knownModel) return { make: knownMake, model: knownModel, customMake: '', customModel: '' };

  return { make: knownMake, model: models.length > 0 ? OTHER : '', customMake: '', customModel: bike.model };
}

export default function BikeFormModal({ bike, unitSystem, onClose, onSubmit }: BikeFormModalProps) {
  const isEditing = Boolean(bike);
  const currentYear = new Date().getFullYear();
  const [initial] = useState(() => initialSelection(bike));
  const [year, setYear] = useState(bike?.year ?? currentYear);
  const [make, setMake] = useState(initial.make);
  const [model, setModel] = useState(initial.model);
  const [customMake, setCustomMake] = useState(initial.customMake);
  const [customModel, setCustomModel] = useState(initial.customModel);
  const [odometer, setOdometer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(
    () => Array.from({ length: currentYear + 2 - 1970 }, (_, index) => currentYear + 1 - index),
    [currentYear]
  );
  const models = make && make !== OTHER ? motorcycleRegistry[make]?.models ?? [] : [];

  // A custom model name is needed for a custom make, a make with no known
  // models, or when the user picks "Other" from the model list.
  const needsCustomMake = make === OTHER;
  const hasModelList = models.length > 0;
  const needsCustomModel = Boolean(make) && (!hasModelList || model === OTHER);
  const resolvedMake = (needsCustomMake ? customMake : make).trim();
  const resolvedModel = (needsCustomModel ? customModel : model).trim();

  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel('');
    setCustomMake('');
    setCustomModel('');
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    // When editing, the odometer isn't on this form; it has its own Update control.
    const miles = bike ? bike.current_mileage : fromDisplayDistance(odometer, unitSystem);

    if (!resolvedMake || !resolvedModel) {
      setError('Please choose or enter a make and model.');
      return;
    }
    if (!bike && (odometer.trim() === '' || Number.isNaN(miles) || miles < 0)) {
      setError('Please enter a valid odometer reading.');
      return;
    }

    setSaving(true);
    setError(null);
    const submitError = await onSubmit({ year, make: resolvedMake, model: resolvedModel, currentMileage: miles });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={isEditing ? 'Edit Motorcycle' : 'Add Motorcycle'}
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

        <div>
          <label htmlFor="bike-make" className={ui.label}>Make / Manufacturer</label>
          <select id="bike-make" required value={make} onChange={(event) => handleMakeChange(event.target.value)} className={ui.input}>
            <option value="">Select a make</option>
            {MAKES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={OTHER}>Other / Not Listed</option>
          </select>
          {needsCustomMake && (
            <input
              type="text"
              required
              placeholder="Enter make"
              aria-label="Custom make"
              value={customMake}
              onChange={(event) => setCustomMake(event.target.value)}
              className={`mt-2 ${ui.input}`}
            />
          )}
        </div>

        <div>
          <label htmlFor="bike-model" className={ui.label}>Model</label>
          {hasModelList && (
            <select id="bike-model" required value={model} onChange={(event) => setModel(event.target.value)} className={ui.input}>
              <option value="">Select a model</option>
              {models.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              <option value={OTHER}>Other / Not Listed</option>
            </select>
          )}
          {!make && (
            <select id="bike-model" disabled className={ui.input}>
              <option>Select a make first</option>
            </select>
          )}
          {needsCustomModel && (
            <input
              id={hasModelList ? undefined : 'bike-model'}
              type="text"
              required
              placeholder="Enter model"
              aria-label="Custom model"
              value={customModel}
              onChange={(event) => setCustomModel(event.target.value)}
              className={hasModelList ? `mt-2 ${ui.input}` : ui.input}
            />
          )}
        </div>

        {isEditing ? (
          <p className={`text-xs ${ui.muted}`}>
            Tip: include the trim level in the model (for example &ldquo;Norden 901 Expedition&rdquo;) if it has its own
            owner&apos;s manual. Choose &ldquo;Other / Not Listed&rdquo; to type it.
          </p>
        ) : (
          <div>
            <label htmlFor="bike-odometer" className={ui.label}>
              Current Odometer ({distanceUnitLabel(unitSystem)})
            </label>
            <input
              id="bike-odometer"
              type="number"
              required
              min="0"
              placeholder="0"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className={ui.input}
            />
          </div>
        )}

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className={`w-1/2 py-2.5 ${ui.secondaryButton}`}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={`w-1/2 py-2.5 ${ui.primaryButton}`}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add to Garage'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

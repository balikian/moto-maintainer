'use client';

import { useMemo, useState } from 'react';
import type { BikeCatalog } from '@/lib/bikeCatalog';
import { ui } from './ui';

// The make and model dropdowns, shared by the bike form and the admin page's
// "Add a schedule": pick from the list, or "Other / Not Listed" to type a name.

// Option value for "Other / Not Listed". Can't collide with a real make or model name.
const OTHER = '__other__';

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Maps a saved make and model onto the dropdowns, using "Other" + a text box for names not in the list. */
function initialSelection(catalog: BikeCatalog, current?: { make: string; model: string }) {
  if (!current) return { make: '', model: '', customMake: '', customModel: '' };

  const knownMake = Object.keys(catalog).find((make) => sameName(make, current.make));
  if (!knownMake) return { make: OTHER, model: '', customMake: current.make, customModel: current.model };

  const models = catalog[knownMake]?.models ?? [];
  const knownModel = models.find((model) => sameName(model, current.model));
  if (knownModel) return { make: knownMake, model: knownModel, customMake: '', customModel: '' };

  return { make: knownMake, model: models.length > 0 ? OTHER : '', customMake: '', customModel: current.model };
}

/** The dropdowns' state; `make` and `model` are the chosen or typed names, trimmed ('' until chosen). */
export function useMakeModel(catalog: BikeCatalog, current?: { make: string; model: string }) {
  const makes = useMemo(() => Object.keys(catalog).sort((a, b) => a.localeCompare(b)), [catalog]);
  const [initial] = useState(() => initialSelection(catalog, current));
  const [makeChoice, setMakeChoice] = useState(initial.make);
  const [modelChoice, setModelChoice] = useState(initial.model);
  const [customMake, setCustomMake] = useState(initial.customMake);
  const [customModel, setCustomModel] = useState(initial.customModel);

  const models = makeChoice && makeChoice !== OTHER ? catalog[makeChoice]?.models ?? [] : [];
  // A custom model name is needed for a custom make, a make with no known
  // models, or when the user picks "Other" from the model list.
  const needsCustomMake = makeChoice === OTHER;
  const hasModelList = models.length > 0;
  const needsCustomModel = Boolean(makeChoice) && (!hasModelList || modelChoice === OTHER);

  const chooseMake = (value: string) => {
    setMakeChoice(value);
    setModelChoice('');
    setCustomMake('');
    setCustomModel('');
  };

  return {
    makes,
    models,
    makeChoice,
    modelChoice,
    customMake,
    customModel,
    needsCustomMake,
    hasModelList,
    needsCustomModel,
    chooseMake,
    setModelChoice,
    setCustomMake,
    setCustomModel,
    reset: () => chooseMake(''),
    make: (needsCustomMake ? customMake : makeChoice).trim(),
    model: (needsCustomModel ? customModel : modelChoice).trim(),
  };
}

export type MakeModelPicker = ReturnType<typeof useMakeModel>;

export default function MakeModelFields({ picker, idPrefix }: { picker: MakeModelPicker; idPrefix: string }) {
  const makeId = `${idPrefix}-make`;
  const modelId = `${idPrefix}-model`;
  return (
    <>
      <div>
        <label htmlFor={makeId} className={ui.label}>Make</label>
        <select id={makeId} required value={picker.makeChoice} onChange={(event) => picker.chooseMake(event.target.value)} className={ui.input}>
          <option value="">Select a make</option>
          {picker.makes.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
          <option value={OTHER}>Other / Not Listed</option>
        </select>
        {picker.needsCustomMake && (
          <input
            type="text"
            required
            placeholder="Enter make"
            aria-label="Custom make"
            value={picker.customMake}
            onChange={(event) => picker.setCustomMake(event.target.value)}
            className={`mt-2 ${ui.input}`}
          />
        )}
      </div>

      <div>
        <label htmlFor={modelId} className={ui.label}>Model</label>
        {picker.hasModelList && (
          <select id={modelId} required value={picker.modelChoice} onChange={(event) => picker.setModelChoice(event.target.value)} className={ui.input}>
            <option value="">Select a model</option>
            {picker.models.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={OTHER}>Other / Not Listed</option>
          </select>
        )}
        {!picker.makeChoice && (
          <select id={modelId} disabled className={ui.input}>
            <option>Select a make first</option>
          </select>
        )}
        {picker.needsCustomModel && (
          <input
            id={picker.hasModelList ? undefined : modelId}
            type="text"
            required
            placeholder="Enter model"
            aria-label="Custom model"
            value={picker.customModel}
            onChange={(event) => picker.setCustomModel(event.target.value)}
            className={picker.hasModelList ? `mt-2 ${ui.input}` : ui.input}
          />
        )}
      </div>
    </>
  );
}

/** Model years for the year dropdowns: next year back to 1970, newest first. */
export function modelYears(currentYear: number): number[] {
  return Array.from({ length: currentYear + 2 - 1970 }, (_, index) => currentYear + 1 - index);
}

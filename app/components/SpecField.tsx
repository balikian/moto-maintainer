'use client';

import type { ReactNode } from 'react';
import { MAX_SPEC_TEXT, unitsFor, UNITS, type SpecDraft, type SpecKind, type SpecUnit } from '@/lib/specs';
import type { UnitSystem } from '@/lib/types';
import { ui } from './ui';

type SpecFieldProps = {
  id: string;
  label: string;
  kind: SpecKind;
  draft: SpecDraft;
  placeholder?: string;
  /** Orders the unit choices, the rider's own first. */
  unitSystem: UnitSystem;
  onChange: (change: Partial<SpecDraft>) => void;
  /** Shown after the field, like a page number or a remove button. */
  after?: ReactNode;
};

/** One spec in a form: a text box, or a number (or range) and its unit. Used by the Specs dialog and the import review. */
export default function SpecField({ id, label, kind, draft, placeholder, unitSystem, onChange, after }: SpecFieldProps) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {kind === 'text' ? (
          <input
            id={id}
            value={draft.text}
            onChange={(event) => onChange({ text: event.target.value })}
            placeholder={placeholder}
            maxLength={MAX_SPEC_TEXT}
            className={`${ui.input} min-w-0 flex-1`}
          />
        ) : (
          <>
            <input
              id={id}
              value={draft.text}
              onChange={(event) => onChange({ text: event.target.value })}
              placeholder={placeholder}
              inputMode="decimal"
              className={`${ui.input} min-w-0 flex-1`}
            />
            {/* Sized by its wrapper: ui.input is full width. */}
            <div className="w-28 shrink-0">
              <select
                value={draft.unit ?? ''}
                onChange={(event) => onChange({ unit: event.target.value as SpecUnit })}
                aria-label={`${label} unit`}
                className={ui.input}
              >
                {unitsFor(kind, unitSystem).map((unit) => (
                  <option key={unit} value={unit}>
                    {UNITS[unit].label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {after}
      </div>
    </div>
  );
}

'use client';

import { useId, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Upload } from 'lucide-react';
import { findDuplicateBikes, IMPORT_LIMITS, parseAccountImportText, type AccountImport } from '@/lib/accountImport';
import { importAccountDataAction } from '@/lib/actions/accountImport';
import { formatDisplayDate, todayIsoDate } from '@/lib/dates';
import type { Motorcycle } from '@/lib/types';
import Modal from './Modal';
import { ui } from './ui';

type ImportDataModalProps = {
  /** The rider's bikes, to point out ones the file would add a second time. */
  garage: Pick<Motorcycle, 'year' | 'make' | 'model'>[];
  onClose: () => void;
  onImported: (bikeIds: string[]) => void;
};

type Loaded = { fileName: string; text: string; plan: AccountImport; duplicates: boolean[] };

const count = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * Adds bikes from a "Download my data" file, with their tasks and service
 * history, after a preview where the rider picks which bikes. Bikes already
 * in the garage (same year, make and model) start unticked. Closes only with
 * the X or Escape, like the other forms.
 */
export default function ImportDataModal({ garage, onClose, onImported }: ImportDataModalProps) {
  const inputId = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [chosen, setChosen] = useState<boolean[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLoaded(null);
    setChosen([]);
    setError(null);
    if (!file) return;
    if (file.size > IMPORT_LIMITS.fileChars) {
      setError('This file is too large to be a SwingArm data file.');
      return;
    }

    const text = await file.text();
    const parsed = parseAccountImportText(text, todayIsoDate());
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    const duplicates = findDuplicateBikes(parsed.data.bikes, garage);
    setLoaded({ fileName: file.name, text, plan: parsed.data, duplicates });
    setChosen(duplicates.map((duplicate) => !duplicate));
  };

  const chosenIndexes = chosen.flatMap((isChosen, index) => (isChosen ? [index] : []));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!loaded || chosenIndexes.length === 0) return;
    setImporting(true);
    setError(null);
    const result = await importAccountDataAction(loaded.text, chosenIndexes);
    setImporting(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Couldn’t import this file.');
      return;
    }
    onImported(result.data.bikeIds);
  };

  return (
    <Modal
      title="Import a backup"
      description="Adds bikes from a SwingArm data file, with their tasks and service history. Bikes already in your garage aren’t changed."
      onClose={importing ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={inputId} className={ui.label}>Data file from Download my data (.json)</label>
          <input
            id={inputId}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFile(event)}
            disabled={importing}
            className={`${ui.input} file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1 file:text-sm file:font-bold file:text-on-brand`}
          />
        </div>

        {loaded && (
          <fieldset className="space-y-2">
            <legend className={`${ui.label} mb-2`}>
              Bikes to add{loaded.plan.exportedOn && <> · saved {formatDisplayDate(loaded.plan.exportedOn)}</>}
            </legend>
            {loaded.plan.bikes.map((bike, index) => (
              <label key={index} className={`${ui.card} flex cursor-pointer items-start gap-3 p-3`}>
                <input
                  type="checkbox"
                  checked={chosen[index] ?? false}
                  onChange={(event) =>
                    setChosen((previous) => previous.map((value, i) => (i === index ? event.target.checked : value)))
                  }
                  disabled={importing}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand"
                />
                <span className="min-w-0 text-sm">
                  <span className="block text-base font-bold">
                    {bike.year} {bike.make} {bike.model}
                  </span>
                  <span className={`block ${ui.muted}`}>
                    {count(bike.tasks.length, 'task', 'tasks')} · {count(bike.logs.length, 'service record', 'service records')}
                  </span>
                  {loaded.duplicates[index] && (
                    <span className="block font-semibold text-warn">Already in your garage. Tick it to add a second copy.</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {error && <p className={ui.errorBox}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={importing} className={ui.secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!loaded || chosenIndexes.length === 0 || importing} className={ui.primaryButton}>
            <Upload size={15} aria-hidden="true" />
            {importing
              ? 'Importing…'
              : chosenIndexes.length > 0
                ? `Import ${count(chosenIndexes.length, 'bike', 'bikes')}`
                : 'Import'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

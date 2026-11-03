'use client';

import { useState, type SubmitEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { cleanJob, JOB_KINDS, JOB_LIMITS, jobInput, type JobInput } from '@/lib/jobs';
import type { BikeJob, JobKind } from '@/lib/types';
import ConfirmPopover from './ConfirmPopover';
import Modal from './Modal';
import { ui } from './ui';

type JobFormModalProps = {
  /** The job being edited; omit to add one. */
  job?: BikeJob;
  /** What a new one starts as. */
  kind?: JobKind;
  /** The day the job was done, for a done one. */
  doneOn?: string | null;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSubmit: (input: JobInput) => Promise<string | null>;
  onRemove?: () => void;
};

const PLACEHOLDERS: Record<JobKind, { name: string; notes: string }> = {
  repair: { name: 'Cracked left mirror', notes: 'Part number, what happened, what the shop said…' },
  upgrade: { name: 'Crash bars', notes: 'Color, fitment, what to order with it…' },
};

/** Add or edit a repair or upgrade: what it is, an estimate, links to compare, and notes. */
export default function JobFormModal({ job, kind = 'repair', doneOn = null, onClose, onSubmit, onRemove }: JobFormModalProps) {
  const [values, setValues] = useState<JobInput>(() => jobInput(job, kind));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentKind: JobKind = values.kind === 'upgrade' ? 'upgrade' : 'repair';
  const set = <K extends keyof JobInput>(key: K, value: JobInput[K]) => setValues((previous) => ({ ...previous, [key]: value }));
  const setLink = (index: number, field: 'url' | 'label', value: string) =>
    set('links', values.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const cleaned = cleanJob(values);
    if ('error' in cleaned) {
      setError(cleaned.error);
      return;
    }
    setSaving(true);
    setError(null);
    const submitError = await onSubmit(values);
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={job ? `Edit ${currentKind}` : 'Add a repair or upgrade'}
      description={job ? undefined : 'A one-time job for this bike. Tick it off in Log service when it’s done, and it goes in the history.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {doneOn && <p className={ui.successBox}>Done {formatDisplayDate(doneOn)}. It’s in the history.</p>}

        <div role="radiogroup" aria-label="Kind" className="grid grid-cols-2 gap-1 rounded-xl bg-raised p-1">
          {JOB_KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={currentKind === option.id}
              onClick={() => set('kind', option.id)}
              className={`rounded-lg px-3 py-2 text-left transition-colors ${
                currentKind === option.id ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="block text-xs">{option.id === 'repair' ? 'Something to fix' : 'A mod or accessory'}</span>
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="job-name" className={ui.label}>What is it?</label>
          <input
            id="job-name"
            required
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            maxLength={JOB_LIMITS.name}
            placeholder={PLACEHOLDERS[currentKind].name}
            autoComplete="off"
            className={ui.input}
          />
        </div>

        <div>
          <label htmlFor="job-cost" className={ui.label}>
            Estimated cost <span className="font-normal text-muted">optional</span>
          </label>
          <input
            id="job-cost"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.estimatedCost}
            onChange={(event) => set('estimatedCost', event.target.value)}
            placeholder="e.g. 450"
            className={ui.input}
          />
        </div>

        <fieldset>
          <legend className={ui.label}>
            {currentKind === 'upgrade' ? 'Products you’re looking at' : 'Parts or how-to links'}{' '}
            <span className="font-normal text-muted">optional</span>
          </legend>
          {values.links.length > 0 && (
            <ul className="space-y-2">
              {values.links.map((link, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[3fr_2fr]">
                    <input
                      aria-label={`Link ${index + 1} address`}
                      inputMode="url"
                      autoComplete="off"
                      value={link.url}
                      onChange={(event) => setLink(index, 'url', event.target.value)}
                      maxLength={JOB_LIMITS.url}
                      placeholder="Paste a link"
                      className={ui.input}
                    />
                    <input
                      aria-label={`Link ${index + 1} label`}
                      autoComplete="off"
                      value={link.label}
                      onChange={(event) => setLink(index, 'label', event.target.value)}
                      maxLength={JOB_LIMITS.label}
                      placeholder={currentKind === 'upgrade' ? 'SW-Motech, $420' : 'Label (optional)'}
                      className={ui.input}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set('links', values.links.filter((_, i) => i !== index))}
                    aria-label={`Remove link ${index + 1}`}
                    className={`${ui.iconButton} border-0 bg-transparent text-muted hover:text-danger`}
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {values.links.length < JOB_LIMITS.links && (
            <button
              type="button"
              onClick={() => set('links', [...values.links, { url: '', label: '' }])}
              className={`${ui.chipButton} min-h-11 ${values.links.length > 0 ? 'mt-2' : ''}`}
            >
              <Plus size={15} aria-hidden="true" /> Add a link
            </button>
          )}
        </fieldset>

        <div>
          <label htmlFor="job-notes" className={ui.label}>
            Notes <span className="font-normal text-muted">optional</span>
          </label>
          <textarea
            id="job-notes"
            rows={3}
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            maxLength={JOB_LIMITS.notes}
            placeholder={PLACEHOLDERS[currentKind].notes}
            className={ui.input}
          />
        </div>

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {job && onRemove && (
            <ConfirmPopover
              align="left"
              message={doneOn ? `Remove "${job.name}" from this list? Its service record stays in History.` : `Remove "${job.name}"?`}
              confirmLabel="Remove"
              onConfirm={onRemove}
            >
              {(open, popoverProps) => (
                <button type="button" onClick={open} {...popoverProps} className={`${ui.chipButton} min-h-11 text-muted hover:text-danger`}>
                  <Trash2 size={15} aria-hidden="true" /> Remove
                </button>
              )}
            </ConfirmPopover>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={ui.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={ui.primaryButton}>
              {saving ? 'Saving…' : job ? 'Save changes' : `Add ${currentKind}`}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

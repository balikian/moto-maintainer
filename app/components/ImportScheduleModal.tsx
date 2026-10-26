'use client';

import { useState, type SubmitEvent } from 'react';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { addManualAsAdminAction } from '@/lib/actions/modelData';
import { applyModelScheduleAction, extractScheduleAction, saveModelScheduleAction } from '@/lib/actions/schedules';
import { bikeTitle } from '@/lib/historyExport';
import { formatPageList } from '@/lib/pageRanges';
import { applySummary } from '@/lib/scheduleImport';
import { isTaskCategory, TASK_CATEGORIES } from '@/lib/taskCategories';
import { fetchManualPdf, renderPdfPages } from '@/lib/pdfPages';
import type { ExtractedTask } from '@/lib/scheduleExtraction';
import { isHttpUrl } from '@/lib/modelData';
import type { Motorcycle } from '@/lib/types';
import Modal from './Modal';
import { ui } from './ui';

type ImportScheduleModalProps = {
  /** The bike or model to import for. Without an id (from the admin page) there's no checklist to update. */
  bike: Pick<Motorcycle, 'year' | 'make' | 'model'> & { id?: string };
  /** Model years the schedule should cover; defaults to the bike's year. */
  years?: { from: number; to: number };
  /**
   * Offers reading the manual from its link (admins only; the fetch goes
   * through an admin-only route). The link starts filled in when one is known.
   */
  manualUrl?: string;
  /**
   * The make's other models (admins only), offered as "Also use this schedule
   * for": editions the same manual covers, like a base model and its Expedition.
   */
  otherModels?: string[];
  onClose: () => void;
  /** Called after a schedule is saved (and applied, if chosen) with a summary for the rider. */
  onImported: (summary: string) => void;
};

type Stage =
  | { name: 'select' }
  | { name: 'reading' }
  | { name: 'review' }
  | { name: 'saving' };

// No width here: each field sets its own. A full width on the small interval
// fields made them fill the row on desktop and squeezed the task name.
const cellInput =
  'rounded-lg border border-line-strong bg-page px-2 py-1.5 text-sm text-fg';

export default function ImportScheduleModal({ bike, years, manualUrl, otherModels = [], onClose, onImported }: ImportScheduleModalProps) {
  const [alsoModels, setAlsoModels] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>({ name: 'select' });
  const [file, setFile] = useState<File | null>(null);
  const linkImport = manualUrl !== undefined;
  const [link, setLink] = useState(manualUrl ?? '');
  // The last PDF downloaded from a link, so trying other pages doesn't download it again.
  const [downloaded, setDownloaded] = useState<{ url: string; file: Blob } | null>(null);
  const [readingStep, setReadingStep] = useState('');
  const [pageSelection, setPageSelection] = useState('');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [yearFrom, setYearFrom] = useState(String(years?.from ?? bike.year));
  const [yearTo, setYearTo] = useState(String(years?.to ?? bike.year));
  const [source, setSource] = useState('');
  const [applyToBike, setApplyToBike] = useState(Boolean(bike.id));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRead = async (event: SubmitEvent) => {
    event.preventDefault();
    const url = link.trim();
    if (!file && !(linkImport && url)) {
      setError(linkImport ? 'Paste the manual’s link or choose the PDF first.' : 'Choose the owner’s manual PDF first.');
      return;
    }

    setError(null);
    setStage({ name: 'reading' });
    try {
      // A chosen file wins over the link.
      let pdf: Blob | null = file;
      if (!pdf && downloaded?.url === url) pdf = downloaded.file;
      if (!pdf) {
        setReadingStep('Downloading the manual…');
        const fetched = await fetchManualPdf(url);
        if ('error' in fetched) {
          setError(`${fetched.error} You can also download the PDF and choose it below.`);
          setStage({ name: 'select' });
          return;
        }
        pdf = fetched.file;
        setDownloaded({ url, file: pdf });
      }

      setReadingStep('Reading the schedule… (up to a minute)');
      const excerpt = await renderPdfPages(pdf, pageSelection);
      if ('error' in excerpt) {
        // A link to a web page about the manual downloads that page, not the PDF.
        const notPdf = !file && excerpt.error.startsWith('That file couldn’t be opened');
        setError(notPdf ? 'That link didn’t give a PDF. Use the link that opens the PDF itself, or download it and choose it below.' : excerpt.error);
        if (notPdf) setDownloaded(null);
        setStage({ name: 'select' });
        return;
      }

      const formData = new FormData();
      excerpt.images.forEach((image, index) => formData.append('page', image, `page-${excerpt.pages[index]}.jpg`));
      formData.append('year', String(bike.year));
      formData.append('make', bike.make);
      formData.append('model', bike.model);

      const result = await extractScheduleAction(formData);
      if (result.error || !result.data) {
        setError(result.error ?? 'Couldn’t read the schedule.');
        setStage({ name: 'select' });
        return;
      }
      if (!result.data.found_schedule || result.data.tasks.length === 0) {
        setError(`No maintenance schedule found on those pages. ${result.data.notes}`.trim());
        setStage({ name: 'select' });
        return;
      }

      setTasks(result.data.tasks);
      setSource(`${bike.year} owner's manual, pages ${formatPageList(excerpt.pages)}`);
      setNotes(result.data.notes);
      setStage({ name: 'review' });
    } catch {
      setError('Something went wrong reading that file. Please try again, or try fewer pages.');
      setStage({ name: 'select' });
    }
  };

  const updateTask = (index: number, changes: Partial<ExtractedTask>) => {
    setTasks((previous) => previous.map((task, i) => (i === index ? { ...task, ...changes } : task)));
  };

  const handleSave = async () => {
    setError(null);
    setStage({ name: 'saving' });

    const saved = await saveModelScheduleAction({
      make: bike.make,
      model: bike.model,
      yearFrom: Number(yearFrom),
      yearTo: Number(yearTo),
      source,
      tasks,
      alsoModels,
    });
    if (saved.error || !saved.data) {
      setError(saved.error ?? 'Couldn’t save the schedule.');
      setStage({ name: 'review' });
      return;
    }

    const savedModels = saved.data.models;
    let summary = saved.data.status !== 'approved'
      ? 'Saved your schedule; it will be shared once it’s reviewed.'
      : savedModels.length > 1
        ? `Saved the schedule for the ${bike.make} ${savedModels.join(', ')} (${yearFrom}–${yearTo}), for everyone with these bikes.`
        : `Saved the ${bikeTitle(bike)} schedule for everyone with this bike.`;

    // The other models get the manual's link too, so riders with them see it.
    const url = link.trim();
    if (linkImport && isHttpUrl(url)) {
      for (const otherModel of savedModels.slice(1)) {
        const added = await addManualAsAdminAction({ make: bike.make, model: otherModel, yearFrom: Number(yearFrom), yearTo: Number(yearTo), url });
        if (added.error) summary += ` The manual link wasn’t saved for the ${otherModel}: ${added.error}`;
      }
    }

    if (applyToBike && bike.id) {
      const applied = await applyModelScheduleAction(bike.id);
      if (applied.error || !applied.data) {
        setError(`The schedule was saved, but updating your tasks failed: ${applied.error}`);
        setStage({ name: 'review' });
        return;
      }
      summary += ` Your checklist: ${applySummary(applied.data)}.`;
    }

    onImported(summary);
  };

  const reviewing = stage.name === 'review' || stage.name === 'saving';

  return (
    <Modal
      title="Import maintenance schedule"
      description={`Read the service schedule from the ${bikeTitle(bike)} owner's manual.`}
      size="lg"
      onClose={stage.name === 'reading' || stage.name === 'saving' ? () => {} : onClose}
    >
      {!reviewing ? (
        <form onSubmit={handleRead} className="space-y-4">
          {linkImport && (
            <div>
              <label htmlFor="manual-link" className={ui.label}>Link to the manual PDF</label>
              <input
                id="manual-link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://…/owners-manual.pdf"
                disabled={stage.name === 'reading'}
                className={ui.input}
              />
              <p className="mt-1.5 text-xs text-muted">
                SwingArm downloads it for you. It has to be the PDF itself, not a page that links to it.{' '}
                {isHttpUrl(link.trim()) && (
                  <a href={link.trim()} target="_blank" rel="noreferrer noopener" className="font-bold text-accent hover:underline">
                    Open it to find the schedule pages
                  </a>
                )}
              </p>
            </div>
          )}
          <div>
            <label htmlFor="manual-pdf" className={ui.label}>
              {linkImport ? 'Or choose the PDF' : 'Owner’s manual (PDF)'}
            </label>
            <input
              id="manual-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={stage.name === 'reading'}
              className={`${ui.input} file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1 file:text-sm file:font-bold file:text-on-brand`}
            />
          </div>

          <div>
            <label htmlFor="manual-pages" className={ui.label}>Pages with the maintenance schedule</label>
            <input
              id="manual-pages"
              type="text"
              value={pageSelection}
              onChange={(event) => setPageSelection(event.target.value)}
              placeholder="e.g. 84-87"
              disabled={stage.name === 'reading'}
              className={ui.input}
            />
            <p className="mt-1.5 text-xs text-muted">
              Use the page numbers your PDF viewer shows (not the numbers printed on the page). The schedule is usually a
              table near the back, titled &ldquo;Maintenance schedule&rdquo; or &ldquo;Service intervals.&rdquo; Only
              these pages are sent, which keeps it quick and cheap.
            </p>
          </div>

          {error && <div className={ui.errorBox}>{error}</div>}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={stage.name === 'reading'} className={ui.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={stage.name === 'reading'} className={ui.primaryButton}>
              <Sparkles size={16} />
              {stage.name === 'reading' ? readingStep || 'Reading the schedule… (up to a minute)' : 'Read schedule'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className={`text-sm ${ui.muted}`}>
            Check each row against the manual and fix anything that&apos;s off. Set a distance or months to 0 if it
            doesn&apos;t apply.
          </p>

          {notes && (
            <div className={ui.infoBox}>
              <span className="font-semibold">Notes from the manual:</span> {notes}
            </div>
          )}

          {/*
            One block per task, at every width: the full name on top (wrapping, never cut off), its intervals below.
            A side-by-side desktop layout doesn't fit: the intervals row alone is about as wide as the dialog.
          */}
          <ul className="divide-y divide-line">
            {tasks.map((task, index) => (
              <li key={index} className="grid gap-2 py-2.5">
                <textarea
                  rows={1}
                  value={task.task_name}
                  onChange={(e) => updateTask(index, { task_name: e.target.value.replace(/\n/g, ' ') })}
                  className={`${cellInput} field-sizing-content min-h-8 w-full resize-none`}
                  aria-label="Task name"
                  placeholder="Task name"
                />
                <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs ${ui.muted}`}>
                  <span>Every</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={task.interval_distance}
                    onChange={(e) => updateTask(index, { interval_distance: Number(e.target.value) })}
                    className={`${cellInput} w-20`}
                    aria-label="Distance interval"
                  />
                  <select
                    value={task.distance_unit}
                    onChange={(e) => updateTask(index, { distance_unit: e.target.value === 'km' ? 'km' : 'mi' })}
                    className={`${cellInput} select-compact w-16`}
                    aria-label="Distance unit"
                  >
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                  </select>
                  <span>or</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={task.interval_months}
                    onChange={(e) => updateTask(index, { interval_months: Number(e.target.value) })}
                    className={`${cellInput} w-14`}
                    aria-label="Months interval"
                  />
                  <span>mo</span>
                  <label className="ml-1 inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={task.is_diy}
                      onChange={(e) => updateTask(index, { is_diy: e.target.checked })}
                      className="h-4 w-4 accent-brand"
                    />
                    DIY
                  </label>
                  <select
                    value={task.category}
                    onChange={(e) => updateTask(index, { category: isTaskCategory(e.target.value) ? e.target.value : 'other' })}
                    className={`${cellInput} select-compact w-auto`}
                    aria-label="Category"
                  >
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setTasks((previous) => previous.filter((_, i) => i !== index))}
                    className="ml-auto rounded p-1.5 text-muted hover:text-danger"
                    aria-label={`Remove ${task.task_name || 'this task'}`}
                    title="Remove task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() =>
              setTasks((previous) => [
                ...previous,
                { task_name: '', interval_distance: 0, distance_unit: previous[0]?.distance_unit ?? 'km', interval_months: 0, is_diy: true, category: 'other' },
              ])
            }
            className={`text-xs font-semibold ${ui.muted} hover:text-fg`}
          >
            <Plus size={12} className="mr-0.5 inline" /> Add a row
          </button>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_auto_1fr]">
            <div>
              <label htmlFor="schedule-year-from" className={ui.label}>From year</label>
              <input id="schedule-year-from" type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${ui.input} sm:w-28`} />
            </div>
            <div>
              <label htmlFor="schedule-year-to" className={ui.label}>To year</label>
              <input id="schedule-year-to" type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${ui.input} sm:w-28`} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="schedule-source" className={ui.label}>Source</label>
              <input id="schedule-source" value={source} onChange={(e) => setSource(e.target.value)} className={ui.input} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted">
            Widen the years if the same schedule applies to other model years; it will be used for all of them.
          </p>

          {otherModels.length > 0 && (
            <div>
              <label htmlFor="schedule-also" className={ui.label}>
                Also use this schedule for <span className="font-normal text-muted">optional</span>
              </label>
              <select
                id="schedule-also"
                value=""
                onChange={(event) => {
                  const picked = event.target.value;
                  if (picked) setAlsoModels((previous) => (previous.includes(picked) ? previous : [...previous, picked]));
                }}
                className={ui.input}
              >
                <option value="">Add another {bike.make} model…</option>
                {otherModels
                  .filter((name) => !alsoModels.includes(name))
                  .map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
              </select>
              {alsoModels.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {alsoModels.map((name) => (
                    <li key={name} className="inline-flex items-center gap-1 rounded-full border border-line bg-raised py-1 pl-3 pr-1 text-sm font-semibold">
                      {name}
                      <button
                        type="button"
                        onClick={() => setAlsoModels((previous) => previous.filter((other) => other !== name))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-fg"
                        aria-label={`Don’t use it for the ${name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-xs text-muted">
                For editions the same manual covers, like a base model and its Expedition or S. Each gets its own copy
                {linkImport ? ', and the manual link' : ''}.
              </p>
            </div>
          )}

          {bike.id ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={applyToBike} onChange={(e) => setApplyToBike(e.target.checked)} className="h-4 w-4 accent-brand" />
              Also update my bike&apos;s checklist with this schedule
            </label>
          ) : (
            <p className={`text-sm ${ui.muted}`}>
              Riders with this bike will see a prompt to apply the schedule to their checklist.
            </p>
          )}

          {error && <div className={ui.errorBox}>{error}</div>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStage({ name: 'select' });
                setError(null);
              }}
              disabled={stage.name === 'saving'}
              className={ui.secondaryButton}
            >
              Back
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={stage.name === 'saving'} className={ui.primaryButton}>
              {stage.name === 'saving' ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

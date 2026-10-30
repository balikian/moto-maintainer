'use client';

import { useState, type SubmitEvent } from 'react';
import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { addManualAsAdminAction } from '@/lib/actions/modelData';
import { applyModelScheduleAction, readManualAction, saveModelScheduleAction } from '@/lib/actions/schedules';
import { saveModelSpecsAction } from '@/lib/actions/specs';
import { bikeTitle } from '@/lib/historyExport';
import { formatPageList } from '@/lib/pageRanges';
import { applySummary } from '@/lib/scheduleImport';
import { isMeasured, SPEC_KEYS, specDefinition, specFromDraft, specNumberText, unitsFor, type SpecDraft, type SpecKey, type SpecValues } from '@/lib/specs';
import { isTaskCategory, TASK_CATEGORIES } from '@/lib/taskCategories';
import { fetchManualPdf, renderPdfPages } from '@/lib/pdfPages';
import type { ExtractedTask } from '@/lib/scheduleExtraction';
import { isHttpUrl } from '@/lib/modelData';
import type { Motorcycle } from '@/lib/types';
import Modal from './Modal';
import SpecField from './SpecField';
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

/** A spec under review, with the printed page it was read from. */
type SpecRow = SpecDraft & { page?: number };

function specRows(values: SpecValues): Partial<Record<SpecKey, SpecRow>> {
  return Object.fromEntries(
    SPEC_KEYS.flatMap((key) => {
      const value = values[key];
      if (!value) return [];
      const draft: SpecDraft = isMeasured(value) ? { text: specNumberText(value), unit: value.unit } : { text: value.text, unit: null };
      return [[key, { ...draft, page: value.page }]];
    })
  );
}

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
  const [specPageSelection, setSpecPageSelection] = useState('');
  // What the last read found: a schedule to review (tasks), specs to review (null when none were read).
  const [hasSchedule, setHasSchedule] = useState(false);
  const [specs, setSpecs] = useState<Partial<Record<SpecKey, SpecRow>> | null>(null);
  const [specNotes, setSpecNotes] = useState('');
  const [specSource, setSpecSource] = useState('');
  // One half that couldn't be read while the other was, shown on the review screen.
  const [readProblem, setReadProblem] = useState<string | null>(null);
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
    if (!pageSelection.trim() && !specPageSelection.trim()) {
      setError('Enter the pages with the maintenance schedule, the specifications, or both.');
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

      setReadingStep('Reading the pages… (up to a minute)');
      const formData = new FormData();
      const pagesRead: { schedule?: number[]; specs?: number[] } = {};
      for (const [selection, field] of [
        [pageSelection, 'page'],
        [specPageSelection, 'specPage'],
      ] as const) {
        if (!selection.trim()) continue;
        const excerpt = await renderPdfPages(pdf, selection);
        if ('error' in excerpt) {
          // A link to a web page about the manual downloads that page, not the PDF.
          const notPdf = !file && excerpt.error.startsWith('That file couldn’t be opened');
          setError(notPdf ? 'That link didn’t give a PDF. Use the link that opens the PDF itself, or download it and choose it below.' : excerpt.error);
          if (notPdf) setDownloaded(null);
          setStage({ name: 'select' });
          return;
        }
        excerpt.images.forEach((image, index) => formData.append(field, image, `page-${excerpt.pages[index]}.jpg`));
        pagesRead[field === 'page' ? 'schedule' : 'specs'] = excerpt.pages;
      }
      formData.append('year', String(bike.year));
      formData.append('make', bike.make);
      formData.append('model', bike.model);

      const result = await readManualAction(formData);
      if (result.error || !result.data) {
        setError(result.error ?? 'Couldn’t read those pages.');
        setStage({ name: 'select' });
        return;
      }

      // What each half found, or why it found nothing.
      const problems: string[] = [];
      const { schedule, specs: specsRead } = result.data;
      const scheduleFound = schedule && 'data' in schedule && schedule.data.found_schedule && schedule.data.tasks.length > 0 ? schedule.data : null;
      if (schedule && !scheduleFound) {
        problems.push('error' in schedule ? `The schedule couldn’t be read: ${schedule.error}` : `No maintenance schedule found on those pages. ${schedule.data.notes}`.trim());
      }
      const specsFound = specsRead && 'data' in specsRead && Object.keys(specsRead.data.specs).length > 0 ? specsRead.data : null;
      if (specsRead && !specsFound) {
        problems.push('error' in specsRead ? `The specs couldn’t be read: ${specsRead.error}` : `No specifications found on those pages. ${specsRead.data.notes}`.trim());
      }
      if (!scheduleFound && !specsFound) {
        setError(problems.join(' '));
        setStage({ name: 'select' });
        return;
      }

      setHasSchedule(Boolean(scheduleFound));
      setTasks(scheduleFound?.tasks ?? []);
      setNotes(scheduleFound?.notes ?? '');
      setSource(pagesRead.schedule ? `${bike.year} owner's manual, pages ${formatPageList(pagesRead.schedule)}` : '');
      setSpecs(specsFound ? specRows(specsFound.specs) : null);
      setSpecNotes(specsFound?.notes ?? '');
      setSpecSource(pagesRead.specs ? `${bike.year} owner's manual, pages ${formatPageList(pagesRead.specs)}` : '');
      setReadProblem(problems.join(' ') || null);
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

    // The reviewed specs, checked before anything is saved.
    const specValues: SpecValues = {};
    for (const [key, row] of Object.entries(specs ?? {}) as [SpecKey, SpecRow][]) {
      const value = specFromDraft(specDefinition(key).kind, row);
      if (value === 'invalid') {
        setError(`${specDefinition(key).label}: enter a number, or a range like 25–35.`);
        return;
      }
      if (value) specValues[key] = row.page ? { ...value, page: row.page } : value;
    }
    const savingSpecs = Object.keys(specValues).length > 0;
    if (!hasSchedule && !savingSpecs) {
      setError('There’s nothing left to save.');
      return;
    }

    setStage({ name: 'saving' });
    const range = { make: bike.make, model: bike.model, yearFrom: Number(yearFrom), yearTo: Number(yearTo), alsoModels };
    const summaries: string[] = [];
    let savedModels: string[] = [];

    if (hasSchedule) {
      const saved = await saveModelScheduleAction({ ...range, source, tasks });
      if (saved.error || !saved.data) {
        setError(saved.error ?? 'Couldn’t save the schedule.');
        setStage({ name: 'review' });
        return;
      }
      savedModels = saved.data.models;
      summaries.push(
        saved.data.status !== 'approved'
          ? 'Saved your schedule; it will be shared once it’s reviewed.'
          : savedModels.length > 1
            ? `Saved the schedule for the ${bike.make} ${savedModels.join(', ')} (${yearFrom}–${yearTo}), for everyone with these bikes.`
            : `Saved the ${bikeTitle(bike)} schedule for everyone with this bike.`
      );
    }

    if (savingSpecs) {
      const saved = await saveModelSpecsAction({ ...range, source: specSource, specs: specValues });
      if (saved.error || !saved.data) {
        setError(hasSchedule ? `The schedule was saved, but the specs weren’t: ${saved.error}` : (saved.error ?? 'Couldn’t save the specs.'));
        if (hasSchedule) setHasSchedule(false);
        setStage({ name: 'review' });
        return;
      }
      savedModels = saved.data.models;
      const count = `${saved.data.count} ${saved.data.count === 1 ? 'spec' : 'specs'}`;
      summaries.push(saved.data.status !== 'approved' ? `Saved ${count}; they’ll be shared once they’re reviewed.` : `Saved ${count} from the manual.`);
    }

    let summary = summaries.join(' ');

    // The other models get the manual's link too, so riders with them see it.
    const url = link.trim();
    if (linkImport && isHttpUrl(url)) {
      for (const otherModel of savedModels.slice(1)) {
        const added = await addManualAsAdminAction({ make: bike.make, model: otherModel, yearFrom: Number(yearFrom), yearTo: Number(yearTo), url });
        if (added.error) summary += ` The manual link wasn’t saved for the ${otherModel}: ${added.error}`;
      }
    }

    if (hasSchedule && applyToBike && bike.id) {
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
      title="Import from the manual"
      description={`Read the service schedule and specs from the ${bikeTitle(bike)} owner's manual.`}
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

          <div>
            <label htmlFor="manual-spec-pages" className={ui.label}>Pages with specifications</label>
            <input
              id="manual-spec-pages"
              type="text"
              value={specPageSelection}
              onChange={(event) => setSpecPageSelection(event.target.value)}
              placeholder="e.g. 12, 140-145"
              disabled={stage.name === 'reading'}
              className={ui.input}
            />
            <p className="mt-1.5 text-xs text-muted">
              Oil, fuel, tires, fluids and torques: usually a &ldquo;Specifications&rdquo; chapter at the back, plus pages
              like the oil change steps for the drain plug torque. Leave either field empty to read only the other.
            </p>
          </div>

          {error && <div className={ui.errorBox}>{error}</div>}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} disabled={stage.name === 'reading'} className={ui.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={stage.name === 'reading'} className={ui.primaryButton}>
              <Sparkles size={16} />
              {stage.name === 'reading' ? readingStep || 'Reading the pages… (up to a minute)' : 'Read pages'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {readProblem && <div className={ui.errorBox}>{readProblem}</div>}

          {hasSchedule && (
            <>
              <h3 className={ui.sectionTitle}>Maintenance schedule</h3>
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
            </>
          )}

          {specs && (
            <section className="space-y-3">
              <h3 className={ui.sectionTitle}>Specs</h3>
              <p className={`text-sm ${ui.muted}`}>
                Check each value against the manual, especially torques and amounts: riders will rely on them. The page
                number is the one printed on the manual&apos;s page, shown to riders as the source.
              </p>
              {specNotes && (
                <div className={ui.infoBox}>
                  <span className="font-semibold">Notes from the manual:</span> {specNotes}
                </div>
              )}
              <div className="space-y-2.5">
                {SPEC_KEYS.filter((key) => specs[key]).map((key) => {
                  const definition = specDefinition(key);
                  const row = specs[key]!;
                  return (
                    <SpecField
                      key={key}
                      id={`import-spec-${key}`}
                      label={definition.label}
                      kind={definition.kind}
                      draft={row}
                      unitSystem="metric"
                      onChange={(change) => setSpecs((previous) => ({ ...previous, [key]: { ...row, ...change } }))}
                      after={
                        <>
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={row.page ?? ''}
                            onChange={(event) =>
                              setSpecs((previous) => ({ ...previous, [key]: { ...row, page: Number(event.target.value) || undefined } }))
                            }
                            placeholder="p."
                            aria-label={`${definition.label} page`}
                            title="Page printed in the manual"
                            className={`${cellInput} w-16 shrink-0`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSpecs((previous) => Object.fromEntries(Object.entries(previous ?? {}).filter(([other]) => other !== key)))
                            }
                            className="shrink-0 rounded p-1.5 text-muted hover:text-danger"
                            aria-label={`Remove ${definition.label}`}
                            title="Remove spec"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
              {SPEC_KEYS.some((key) => !specs[key]) && (
                <select
                  value=""
                  onChange={(event) => {
                    const key = event.target.value as SpecKey;
                    if (!key) return;
                    const kind = specDefinition(key).kind;
                    setSpecs((previous) => ({ ...previous, [key]: { text: '', unit: kind === 'text' ? null : unitsFor(kind, 'metric')[0] } }));
                  }}
                  aria-label="Add a spec Claude missed"
                  className={`${ui.input} sm:w-auto`}
                >
                  <option value="">Add a spec Claude missed…</option>
                  {SPEC_KEYS.filter((key) => !specs[key]).map((key) => (
                    <option key={key} value={key}>{specDefinition(key).label}</option>
                  ))}
                </select>
              )}
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_auto_1fr]">
            <div>
              <label htmlFor="schedule-year-from" className={ui.label}>From year</label>
              <input id="schedule-year-from" type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${ui.input} sm:w-28`} />
            </div>
            <div>
              <label htmlFor="schedule-year-to" className={ui.label}>To year</label>
              <input id="schedule-year-to" type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${ui.input} sm:w-28`} />
            </div>
            {hasSchedule && (
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="schedule-source" className={ui.label}>Schedule source</label>
                <input id="schedule-source" value={source} onChange={(e) => setSource(e.target.value)} className={ui.input} />
              </div>
            )}
          </div>
          <p className="-mt-2 text-xs text-muted">
            Widen the years if the same {hasSchedule && specs ? 'schedule and specs apply' : hasSchedule ? 'schedule applies' : 'specs apply'} to
            other model years; {hasSchedule && !specs ? 'it' : 'they'} will be used for all of them.
          </p>

          {otherModels.length > 0 && (
            <div>
              <label htmlFor="schedule-also" className={ui.label}>
                Also use {hasSchedule && specs ? 'these' : 'this'} for <span className="font-normal text-muted">optional</span>
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

          {hasSchedule &&
            (bike.id ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={applyToBike} onChange={(e) => setApplyToBike(e.target.checked)} className="h-4 w-4 accent-brand" />
                Also update my bike&apos;s checklist with this schedule
              </label>
            ) : (
              <p className={`text-sm ${ui.muted}`}>
                Riders with this bike will see a prompt to apply the schedule to their checklist.
              </p>
            ))}
          {specs && (
            <p className={`text-sm ${ui.muted}`}>
              Specs show on every matching bike right away, under any values its rider entered.
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
              {stage.name === 'saving' ? 'Saving…' : hasSchedule && specs ? 'Save schedule and specs' : hasSchedule ? 'Save schedule' : 'Save specs'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

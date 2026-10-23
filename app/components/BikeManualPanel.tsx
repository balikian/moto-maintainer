'use client';

import { useState, type SubmitEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BookOpen, ExternalLink, ListChecks, Plus, Search, Sparkles, X } from 'lucide-react';
import { deleteManualAction, submitManualAction } from '@/lib/actions/modelData';
import { applyModelScheduleAction } from '@/lib/actions/schedules';
import { trackEvent } from '@/lib/analytics';
import { manualPortalFor, manualSearchUrl } from '@/lib/data/manualPortals';
import { bikeTitle } from '@/lib/historyExport';
import { fetchManuals, fetchModelSchedule, isHttpUrl } from '@/lib/modelData';
import { applySummary } from '@/lib/scheduleImport';
import type { BikeManual, ModelEntry, ModelSchedule, Motorcycle } from '@/lib/types';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import ConfirmPopover from './ConfirmPopover';
import ImportScheduleModal from './ImportScheduleModal';
import Modal from './Modal';
import { ui } from './ui';

type BikeManualPanelProps = {
  supabase: SupabaseClient;
  bike: Motorcycle;
  currentUserId: string;
  isAdmin: boolean;
  /** Called after the bike's checklist changed, so the page can reload its tasks. */
  onTasksChanged: () => void;
  onClose: () => void;
};

const linkButtonClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold text-fg transition-colors hover:bg-raised disabled:opacity-60';

function yearsLabel(entry: Pick<ModelEntry, 'year_from' | 'year_to'>): string {
  return entry.year_from === entry.year_to ? String(entry.year_from) : `${entry.year_from}–${entry.year_to}`;
}

export default function BikeManualPanel({ supabase, bike, currentUserId, isAdmin, onTasksChanged, onClose }: BikeManualPanelProps) {
  const lookupKey = `${bike.id}|${bike.year}|${bike.make}|${bike.model}`;
  const manuals = useSupabaseQuery<BikeManual[]>(lookupKey, () => fetchManuals(supabase, bike));
  const schedule = useSupabaseQuery<ModelSchedule | null>(lookupKey, () => fetchModelSchedule(supabase, bike));
  const [importOpen, setImportOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  const list = manuals.data ?? [];
  const portal = manualPortalFor(bike.make);
  const formVisible = showForm || (!manuals.loading && list.length === 0);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!isHttpUrl(url)) {
      setMessage({ tone: 'error', text: 'Please paste a full web link, starting with https://' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const result = await submitManualAction({ make: bike.make, model: bike.model, year: bike.year, url });
    setSaving(false);
    if (result.error) {
      setMessage({ tone: 'error', text: result.error });
      return;
    }

    setUrl('');
    setShowForm(false);
    setMessage({
      tone: 'info',
      text: result.data?.status === 'approved'
        ? 'Manual added for everyone with this bike.'
        : 'Thanks! You can use this link now; it will be shared with other riders once it is reviewed.',
    });
    manuals.reload();
  };

  const handleApplySchedule = async () => {
    setApplying(true);
    setMessage(null);
    const result = await applyModelScheduleAction(bike.id);
    setApplying(false);
    if (result.error || !result.data) {
      setMessage({ tone: 'error', text: result.error ?? 'Couldn’t update your checklist.' });
      return;
    }
    trackEvent('Schedule applied');
    setMessage({ tone: 'info', text: `Checklist updated: ${applySummary(result.data)}.` });
    onTasksChanged();
  };

  const handleRemove = async (manual: BikeManual) => {
    const result = await deleteManualAction(manual.id);
    if (result.error) {
      setMessage({ tone: 'error', text: result.error });
      return;
    }
    manuals.reload();
  };

  return (
    <Modal title="Manual & schedule" description={bikeTitle(bike)} size="lg" onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`inline-flex items-center gap-1.5 ${ui.subTitle}`}>
          <BookOpen size={14} className="text-accent" />
          Owner&apos;s manual
        </h2>
        {list.length > 0 && !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className={`text-xs font-semibold ${ui.muted} hover:text-fg`}>
            <Plus size={12} className="mr-0.5 inline" />
            Add another link
          </button>
        )}
      </div>

      {manuals.loading ? (
        <p className={`mt-3 text-sm ${ui.muted}`}>Looking for a manual…</p>
      ) : (
        list.length > 0 && (
          <ul className="mt-3 space-y-2">
            {list.map((manual) => (
              <li key={manual.id} className="flex flex-wrap items-center gap-2">
                {isHttpUrl(manual.url) && (
                  <a href={manual.url} target="_blank" rel="noreferrer noopener" className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
                    <ExternalLink size={14} /> Open {manual.label.toLowerCase()}
                  </a>
                )}
                <span className={`text-xs ${ui.muted}`}>
                  {manual.make} {manual.model} · {yearsLabel(manual)}
                </span>
                {manual.status === 'pending' && (
                  <>
                    <span className={`${ui.tag} bg-warn/10 text-warn`}>
                      Waiting for review
                    </span>
                    {manual.submitted_by === currentUserId && (
                      <ConfirmPopover message="Remove this manual link?" confirmLabel="Remove" onConfirm={() => void handleRemove(manual)}>
                        {(open, popoverProps) => (
                          <button
                            type="button"
                            onClick={open}
                            {...popoverProps}
                            className="rounded p-1 text-muted hover:text-danger"
                            aria-label="Remove this link"
                            title="Remove this link"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </ConfirmPopover>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {!manuals.loading && formVisible && (
        <div className="mt-3 space-y-3">
          {list.length === 0 && (
            <p className={`text-sm ${ui.muted}`}>
              We don&apos;t have a manual for the {bikeTitle(bike)} yet. Find it, then paste the link here so you, and
              other riders with this bike, can open it from the app.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {portal && (
              <a href={portal.url} target="_blank" rel="noreferrer noopener" className={linkButtonClass}>
                <BookOpen size={13} className="text-accent" /> {portal.name} manuals
              </a>
            )}
            <a href={manualSearchUrl(bike)} target="_blank" rel="noreferrer noopener" className={linkButtonClass}>
              <Search size={13} className="text-accent" /> Search the web
            </a>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://… link to the manual (PDF or page)"
              aria-label="Link to the owner's manual"
              className={`${ui.input} py-2`}
              required
            />
            <div className="flex shrink-0 gap-2">
              <button type="submit" disabled={saving} className={ui.primaryButton}>
                {saving ? 'Saving…' : 'Save link'}
              </button>
              {showForm && (
                <button type="button" onClick={() => setShowForm(false)} className={ui.secondaryButton}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <p className="text-xs text-muted">
            Prefer the manufacturer&apos;s own site. Links from other riders are reviewed before they&apos;re shared.
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <h3 className={`inline-flex items-center gap-1.5 ${ui.subTitle}`}>
          <ListChecks size={14} className="text-accent" />
          Manufacturer schedule
        </h3>

        {schedule.loading ? (
          <p className={`mt-2 text-sm ${ui.muted}`}>Checking for a schedule…</p>
        ) : schedule.data ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm">
              {schedule.data.model_schedule_tasks.length} tasks · covers {yearsLabel(schedule.data)} models
              {schedule.data.source && <span className={ui.muted}> · from the {schedule.data.source}</span>}
            </span>
            {schedule.data.status === 'pending' && (
              <span className={`${ui.tag} bg-warn/10 text-warn`}>
                Waiting for review
              </span>
            )}
            <ConfirmPopover
              message="Update your checklist from this schedule? Matching tasks get its intervals and missing ones are added. Starter tasks it replaces are removed unless you logged service for them. Tasks you added yourself are kept."
              confirmLabel="Update checklist"
              align="left"
              onConfirm={() => void handleApplySchedule()}
            >
              {(open, popoverProps) => (
                <button type="button" onClick={open} {...popoverProps} disabled={applying} className={linkButtonClass}>
                  {applying ? 'Updating…' : 'Apply to my checklist'}
                </button>
              )}
            </ConfirmPopover>
            {isAdmin && (
              <button type="button" onClick={() => setImportOpen(true)} className={`text-xs font-semibold ${ui.muted} hover:text-fg`}>
                Re-import
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className={`text-sm ${ui.muted}`}>
              No manufacturer schedule for the {bike.year} {bike.model} yet
              {isAdmin
                ? '.'
                : list.length > 0
                  ? '. Once the manual is reviewed, an admin imports its schedule and you’ll be offered it here and on your checklist. Until then your checklist uses general defaults.'
                  : ', so your checklist uses general defaults. Add a link to the owner’s manual above so an admin can import its schedule.'}
            </p>
            {isAdmin && (
              <button type="button" onClick={() => setImportOpen(true)} className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
                <Sparkles size={14} /> Import from manual
              </button>
            )}
          </div>
        )}
      </div>

      {importOpen && (
        <ImportScheduleModal
          bike={bike}
          onClose={() => setImportOpen(false)}
          onImported={(summary) => {
            setImportOpen(false);
            setMessage({ tone: 'info', text: summary });
            schedule.reload();
            onTasksChanged();
          }}
        />
      )}

      {(message || manuals.error || schedule.error) && (
        <p
          className={`mt-3 ${
            message?.tone === 'info'
              ? ui.successBox
              : ui.errorBox
          }`}
        >
          {message?.text ?? `Couldn't load manual information: ${manuals.error ?? schedule.error}`}
        </p>
      )}
    </Modal>
  );
}

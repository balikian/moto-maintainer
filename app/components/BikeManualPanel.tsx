'use client';

import { useState, type SubmitEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BookOpen, ExternalLink, Plus, Search, X } from 'lucide-react';
import { deleteManualAction, submitManualAction } from '@/lib/actions/modelData';
import { manualPortalFor, manualSearchUrl } from '@/lib/data/manualPortals';
import { bikeTitle } from '@/lib/historyExport';
import { fetchManuals, isHttpUrl } from '@/lib/modelData';
import type { BikeManual, Motorcycle } from '@/lib/types';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { ui } from './ui';

type BikeManualPanelProps = {
  supabase: SupabaseClient;
  bike: Motorcycle;
  currentUserId: string;
};

const linkButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-amber-500/60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

function yearsLabel(manual: BikeManual): string {
  return manual.year_from === manual.year_to ? String(manual.year_from) : `${manual.year_from}–${manual.year_to}`;
}

export default function BikeManualPanel({ supabase, bike, currentUserId }: BikeManualPanelProps) {
  const lookupKey = `${bike.id}|${bike.year}|${bike.make}|${bike.model}`;
  const manuals = useSupabaseQuery<BikeManual[]>(lookupKey, () => fetchManuals(supabase, bike));
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

  const handleRemove = async (manual: BikeManual) => {
    if (!window.confirm('Remove this manual link?')) return;
    const result = await deleteManualAction(manual.id);
    if (result.error) {
      setMessage({ tone: 'error', text: result.error });
      return;
    }
    manuals.reload();
  };

  return (
    <section className={`${ui.card} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`inline-flex items-center gap-1.5 ${ui.sectionTitle}`}>
          <BookOpen size={14} className="text-amber-500" />
          Owner&apos;s Manual
        </h2>
        {list.length > 0 && !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className={`text-xs font-semibold ${ui.muted} hover:text-amber-600`}>
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
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      Waiting for review
                    </span>
                    {manual.submitted_by === currentUserId && (
                      <button
                        type="button"
                        onClick={() => void handleRemove(manual)}
                        className="rounded p-1 text-slate-400 hover:text-rose-500"
                        aria-label="Remove this link"
                        title="Remove this link"
                      >
                        <X size={14} />
                      </button>
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
                <BookOpen size={13} className="text-amber-500" /> {portal.name} manuals
              </a>
            )}
            <a href={manualSearchUrl(bike)} target="_blank" rel="noreferrer noopener" className={linkButtonClass}>
              <Search size={13} className="text-amber-500" /> Search the web
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
          <p className="text-[11px] text-slate-500">
            Prefer the manufacturer&apos;s own site. Links from other riders are reviewed before they&apos;re shared.
          </p>
        </div>
      )}

      {(message || manuals.error) && (
        <p
          className={`mt-3 ${
            message?.tone === 'info'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
              : ui.errorBox
          }`}
        >
          {message?.text ?? `Couldn't load manuals: ${manuals.error}`}
        </p>
      )}
    </section>
  );
}

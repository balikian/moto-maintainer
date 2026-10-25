'use client';

import { useId, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { addManualAsAdminAction } from '@/lib/actions/modelData';
import type { BikeCatalog } from '@/lib/bikeCatalog';
import { isHttpUrl } from '@/lib/modelData';
import ImportScheduleModal from '../components/ImportScheduleModal';
import { ui } from '../components/ui';

type Target = { make: string; model: string; yearFrom: number; yearTo: number; url: string };

/**
 * Imports a model's schedule straight from its manual link: no bike in a
 * garage, no download and upload. The link is saved as an approved manual.
 */
export default function AddScheduleForm({ catalog }: { catalog: BikeCatalog }) {
  const router = useRouter();
  const id = useId();
  const thisYear = new Date().getFullYear();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [yearFrom, setYearFrom] = useState(String(thisYear));
  const [yearTo, setYearTo] = useState(String(thisYear));
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'good'; text: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const makes = Object.keys(catalog).sort((a, b) => a.localeCompare(b));
  const catalogMake = makes.find((name) => name.toLowerCase() === make.trim().toLowerCase());
  const models = catalogMake ? catalog[catalogMake].models : [];

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const from = Number(yearFrom);
    const to = Number(yearTo);
    const link = url.trim();
    if (!make.trim() || !model.trim()) {
      setMessage({ tone: 'error', text: 'Enter the make and model as riders pick them.' });
      return;
    }
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
      setMessage({ tone: 'error', text: 'Enter the model years the manual covers, earliest first.' });
      return;
    }
    if (link && !isHttpUrl(link)) {
      setMessage({ tone: 'error', text: 'The manual link should start with https://' });
      return;
    }

    setBusy(true);
    setMessage(null);
    if (link) {
      const saved = await addManualAsAdminAction({ make, model, yearFrom: from, yearTo: to, url: link });
      if (saved.error) {
        setBusy(false);
        setMessage({ tone: 'error', text: saved.error });
        return;
      }
    }
    setBusy(false);
    setTarget({ make: catalogMake ?? make.trim(), model: model.trim(), yearFrom: from, yearTo: to, url: link });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={`${ui.card} space-y-3 p-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-make`} className={ui.label}>Make</label>
            <input id={`${id}-make`} list={`${id}-makes`} value={make} onChange={(e) => setMake(e.target.value)} className={ui.input} autoComplete="off" />
            <datalist id={`${id}-makes`}>
              {makes.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor={`${id}-model`} className={ui.label}>Model</label>
            <input id={`${id}-model`} list={`${id}-models`} value={model} onChange={(e) => setModel(e.target.value)} className={ui.input} autoComplete="off" />
            <datalist id={`${id}-models`}>
              {models.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`${id}-from`} className={ui.label}>Model years</label>
            <div className="flex items-center gap-2">
              <input id={`${id}-from`} type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${ui.input} w-24`} aria-label="From year" />
              <span className={ui.muted}>–</span>
              <input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${ui.input} w-24`} aria-label="To year" />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-url`} className={ui.label}>
            Link to the manual PDF <span className="font-normal text-muted">optional; or choose the file next</span>
          </label>
          <input id={`${id}-url`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/owners-manual.pdf" className={ui.input} />
          <p className="mt-1.5 text-xs text-muted">
            Use the names from the bike form&apos;s lists, so riders&apos; bikes match. The link is saved as the
            model&apos;s manual for riders, approved; a new make or model joins the lists.
          </p>
        </div>
        {message && <div className={message.tone === 'error' ? ui.errorBox : ui.successBox}>{message.text}</div>}
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className={ui.primaryButton}>
            <Sparkles size={16} />
            {busy ? 'Saving…' : 'Next: pick the schedule pages'}
          </button>
        </div>
      </form>

      {target && (
        <ImportScheduleModal
          bike={{ make: target.make, model: target.model, year: target.yearTo }}
          years={{ from: target.yearFrom, to: target.yearTo }}
          manualUrl={target.url}
          onClose={() => {
            setTarget(null);
            router.refresh();
          }}
          onImported={(summary) => {
            setTarget(null);
            setMessage({ tone: 'good', text: summary });
            setMake('');
            setModel('');
            setUrl('');
            router.refresh();
          }}
        />
      )}
    </>
  );
}

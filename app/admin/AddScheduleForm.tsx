'use client';

import { useMemo, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { addManualAsAdminAction } from '@/lib/actions/modelData';
import { otherModelsOf, type BikeCatalog } from '@/lib/bikeCatalog';
import { isHttpUrl } from '@/lib/modelData';
import ImportScheduleModal from '../components/ImportScheduleModal';
import MakeModelFields, { modelYears, useMakeModel } from '../components/MakeModelFields';
import { ui } from '../components/ui';

type Target = { make: string; model: string; yearFrom: number; yearTo: number; url: string };

/**
 * Imports a model's schedule straight from its manual link: no bike in a
 * garage, no download and upload. The link is saved as an approved manual.
 * The make and model dropdowns are the bike form's, so names match riders' bikes.
 */
export default function AddScheduleForm({ catalog }: { catalog: BikeCatalog }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => modelYears(currentYear), [currentYear]);
  const picker = useMakeModel(catalog);
  const [yearFrom, setYearFrom] = useState(currentYear);
  const [yearTo, setYearTo] = useState(currentYear);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'good'; text: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const link = url.trim();
    if (!picker.make || !picker.model) {
      setMessage({ tone: 'error', text: 'Choose or enter a make and model.' });
      return;
    }
    if (yearFrom > yearTo) {
      setMessage({ tone: 'error', text: 'The first model year comes before the last.' });
      return;
    }
    if (link && !isHttpUrl(link)) {
      setMessage({ tone: 'error', text: 'The manual link should start with https://' });
      return;
    }

    setBusy(true);
    setMessage(null);
    if (link) {
      const saved = await addManualAsAdminAction({ make: picker.make, model: picker.model, yearFrom, yearTo, url: link });
      if (saved.error) {
        setBusy(false);
        setMessage({ tone: 'error', text: saved.error });
        return;
      }
    }
    setBusy(false);
    setTarget({ make: picker.make, model: picker.model, yearFrom, yearTo, url: link });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={`${ui.card} space-y-4 p-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="schedule-from" className={ui.label}>First model year</label>
            <select id="schedule-from" value={yearFrom} onChange={(event) => setYearFrom(Number(event.target.value))} className={ui.input}>
              {years.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="schedule-to" className={ui.label}>Last model year</label>
            <select id="schedule-to" value={yearTo} onChange={(event) => setYearTo(Number(event.target.value))} className={ui.input}>
              {years.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <MakeModelFields picker={picker} idPrefix="schedule" />

        <div>
          <label htmlFor="schedule-url" className={ui.label}>
            Link to the manual PDF <span className="font-normal text-muted">optional; or choose the file next</span>
          </label>
          <input
            id="schedule-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…/owners-manual.pdf"
            className={ui.input}
          />
          <p className="mt-1.5 text-xs text-muted">
            The link is saved as the model&apos;s manual for riders, approved. A make or model typed in under Other joins
            everyone&apos;s lists.
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
          otherModels={otherModelsOf(catalog, target.make, target.model)}
          onClose={() => {
            setTarget(null);
            router.refresh();
          }}
          onImported={(summary) => {
            setTarget(null);
            setMessage({ tone: 'good', text: summary });
            picker.reset();
            setUrl('');
            router.refresh();
          }}
        />
      )}
    </>
  );
}

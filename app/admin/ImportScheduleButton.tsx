'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import ImportScheduleModal from '../components/ImportScheduleModal';
import { ui } from '../components/ui';

type ImportScheduleButtonProps = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
};

/** Lets an admin import a model's schedule without having that bike in their garage. */
export default function ImportScheduleButton({ make, model, yearFrom, yearTo }: ImportScheduleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
        <Sparkles size={14} /> Import schedule
      </button>
      {summary && <p className="text-sm text-emerald-700 dark:text-emerald-300">{summary}</p>}
      {open && (
        <ImportScheduleModal
          bike={{ make, model, year: yearTo }}
          years={{ from: yearFrom, to: yearTo }}
          onClose={() => setOpen(false)}
          onImported={(message) => {
            setOpen(false);
            setSummary(message);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

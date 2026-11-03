'use client';

import { useState } from 'react';
import { Warehouse } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { cleanBatteryType, cleanStorageChecklist, storageChecklist, storageDuration } from '@/lib/storage';
import type { Motorcycle } from '@/lib/types';
import { ui } from './ui';

type StorageCardProps = {
  bike: Motorcycle;
  onChecklist: () => void;
  onReturn: () => void;
};

/** On Tasks while the bike is stored: since when, how far the checklist got, and Back on the road. */
export default function StorageCard({ bike, onChecklist, onReturn }: StorageCardProps) {
  const [today] = useState(() => new Date());
  if (!bike.stored_on) return null;

  const items = storageChecklist(cleanBatteryType(bike.battery_type));
  const ticked = cleanStorageChecklist(bike.storage_checklist);
  const done = items.filter((item) => ticked.includes(item.key)).length;
  const duration = storageDuration(bike.stored_on, today);

  return (
    <section aria-label="In storage" className={`${ui.card} border-info/40 p-4`}>
      <div className="flex items-start gap-3">
        <Warehouse size={20} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-info">In storage</p>
          <h3 className="text-lg font-extrabold leading-tight">
            Since {formatDisplayDate(bike.stored_on)}
            {weeksShown(duration) && <span className="font-bold text-muted"> · {duration}</span>}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Storage checklist: {done} of {items.length} done. We&apos;ll ask about the battery every four weeks.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onReturn} className={`${ui.primaryButton} min-h-11`}>
          Back on the road
        </button>
        <button type="button" onClick={onChecklist} className={`${ui.chipButton} min-h-11`}>
          Storage checklist
        </button>
      </div>
    </section>
  );
}

/** "0 weeks" says nothing yet. */
const weeksShown = (duration: string) => duration !== '0 weeks';

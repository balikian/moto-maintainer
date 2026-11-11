'use client';

import { ChevronRight } from 'lucide-react';
import type { TaskStatus } from '@/lib/maintenance';
import type { FavoriteSpecRow } from '@/lib/specs';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import BikeSwitcher from './BikeSwitcher';
import FavoriteSpecs from './FavoriteSpecs';
import OdometerControl from './OdometerControl';
import { ui } from './ui';

type BikePanelProps = {
  bikes: Motorcycle[];
  activeBike: Motorcycle;
  /** The active bike's tasks by status; null while they load. */
  statusCounts: Record<TaskStatus, number> | null;
  unitSystem: UnitSystem;
  onSelectBike: (bikeId: string) => void;
  onAddBike: () => void;
  onUpdateOdometer: (miles: number) => Promise<string | null>;
  /** Open the odometer box right away: a reminder's link asked for a new reading. */
  editOdometer?: boolean;
  onCancelOdometer?: () => void;
  onOpenSpecs: () => void;
  /** Open the bike's owner's manual and the maker's schedule. */
  onOpenManual: () => void;
  /** The bike's starred specs. */
  favoriteSpecs: FavoriteSpecRow[];
};

const STATUS_TILES: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'Overdue', label: 'Overdue', color: 'text-danger' },
  { status: 'Urgent', label: 'Urgent', color: 'text-danger' },
  { status: 'Soon', label: 'Soon', color: 'text-warn' },
  { status: 'Healthy', label: 'All good', color: 'text-muted' },
];

/** The top of Tasks: the bike's name (tap to switch), its odometer, its starred specs (tap for all), its manual, and its tasks by status. */
export default function BikePanel(props: BikePanelProps) {
  const { statusCounts } = props;

  return (
    <section aria-label="Your bike" className={`${ui.card} space-y-3.5 p-4`}>
      <BikeSwitcher
        bikes={props.bikes}
        activeBike={props.activeBike}
        unitSystem={props.unitSystem}
        onSelect={props.onSelectBike}
        onAdd={props.onAddBike}
      />
      <div className="border-t border-line pt-3.5">
        <OdometerControl
          key={props.activeBike.id}
          bike={props.activeBike}
          unitSystem={props.unitSystem}
          onSave={props.onUpdateOdometer}
          startEditing={props.editOdometer}
          onCancel={props.onCancelOdometer}
        />
      </div>
      <button
        type="button"
        onClick={props.onOpenSpecs}
        className="flex min-h-11 w-full items-start gap-2 rounded-xl bg-raised py-2.5 pl-3 pr-2 text-left transition-colors hover:bg-line/60"
      >
        {props.favoriteSpecs.length > 0 ? (
          <FavoriteSpecs specs={props.favoriteSpecs} className="min-w-0 flex-1" />
        ) : (
          <span className="min-w-0 flex-1 text-sm font-semibold text-muted">Oil, tires, torques and more</span>
        )}
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-accent">
          Specs <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>
      <button
        type="button"
        onClick={props.onOpenManual}
        className="-mt-1.5 flex min-h-11 w-full items-center gap-2 rounded-xl bg-raised py-2.5 pl-3 pr-2 text-left transition-colors hover:bg-line/60"
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-muted">Owner&apos;s manual and schedule</span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-accent">
          Manual <ChevronRight size={16} aria-hidden="true" />
        </span>
      </button>
      {statusCounts && (
        <ul aria-label="Tasks by status" className="grid grid-cols-4 gap-1.5">
          {STATUS_TILES.map(({ status, label, color }) => (
            <li key={status} className={`rounded-xl bg-raised px-1 py-2 text-center ${color}`}>
              <span className="block text-2xl font-extrabold leading-none tabular-nums">{statusCounts[status]}</span>
              <span className="mt-1 block text-xs font-bold">{label}</span>
            </li>
          ))}
        </ul>
      )}
      {statusCounts && statusCounts.NoStart > 0 && (
        <p className="-mt-1 text-center text-sm font-semibold text-muted">
          {statusCounts.NoStart} {statusCounts.NoStart === 1 ? 'task needs' : 'tasks need'} a start point
        </p>
      )}
    </section>
  );
}

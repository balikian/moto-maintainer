'use client';

import { ClipboardList } from 'lucide-react';
import type { TaskStatus } from '@/lib/maintenance';
import type { ResolvedSpec } from '@/lib/specs';
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
  /** The bike's starred specs that have a value. */
  favoriteSpecs: ResolvedSpec[];
};

const STATUS_TILES: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'Overdue', label: 'Overdue', color: 'text-danger' },
  { status: 'Urgent', label: 'Urgent', color: 'text-danger' },
  { status: 'Soon', label: 'Soon', color: 'text-warn' },
  { status: 'Healthy', label: 'All good', color: 'text-muted' },
];

/** The top of Tasks: the bike's name (tap to switch), its odometer, specs and starred specs, and its tasks by status. */
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
          actions={
            <button type="button" onClick={props.onOpenSpecs} className={`${ui.secondaryButton} px-3.5`}>
              <ClipboardList size={15} aria-hidden="true" /> Specs
            </button>
          }
        />
      </div>
      {props.favoriteSpecs.length > 0 && (
        <FavoriteSpecs specs={props.favoriteSpecs} unitSystem={props.unitSystem} className="border-t border-line pt-3.5" />
      )}
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

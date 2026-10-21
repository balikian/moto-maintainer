'use client';

import { Plus } from 'lucide-react';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { formatOdometer } from '@/lib/units';
import { BikeStatusLine } from './GarageView';
import { ui } from './ui';

type BikeListProps = {
  bikes: Motorcycle[];
  activeBikeId: string;
  /** Every bike's tasks, for the status line; null while they load. */
  allTasks: MaintenanceTask[] | null;
  unitSystem: UnitSystem;
  onSelect: (bikeId: string) => void;
  onAdd: () => void;
  className?: string;
};

/** Desktop's "Your bikes" list beside the tasks: each bike with what it needs, tap to switch. */
export default function BikeList({ bikes, activeBikeId, allTasks, unitSystem, onSelect, onAdd, className = '' }: BikeListProps) {
  return (
    <section aria-labelledby="bike-list-title" className={`${ui.card} overflow-hidden ${className}`}>
      <h2 id="bike-list-title" className="px-4 pb-2 pt-3.5 text-sm font-bold text-muted">Your bikes</h2>
      <ul>
        {bikes.map((bike) => {
          const isActive = bike.id === activeBikeId;
          return (
            <li key={bike.id}>
              <button
                type="button"
                onClick={() => onSelect(bike.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`block w-full border-l-2 py-2.5 pl-3.5 pr-4 text-left transition-colors ${
                  isActive ? 'border-accent bg-raised' : 'border-transparent hover:bg-raised'
                }`}
              >
                <span className="block truncate text-[15px] font-bold">{bike.year} {bike.make} {bike.model}</span>
                <span className="block truncate text-sm font-semibold">
                  <span className="text-muted tabular-nums">{formatOdometer(bike.current_mileage, unitSystem)} · </span>
                  {allTasks ? (
                    <BikeStatusLine tasks={allTasks.filter((task) => task.motorcycle_id === bike.id)} mileage={bike.current_mileage} />
                  ) : (
                    <span className="text-muted">…</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="p-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-bold text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <Plus size={15} aria-hidden="true" /> Add bike
        </button>
      </div>
    </section>
  );
}

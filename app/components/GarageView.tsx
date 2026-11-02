'use client';

import { useId, useRef, useState } from 'react';
import { ClipboardList, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import { countTasksByStatus, type TaskStatus } from '@/lib/maintenance';
import type { FavoriteSpecRow } from '@/lib/specs';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { formatOdometer } from '@/lib/units';
import { useDismiss } from '../hooks/useDismiss';
import ConfirmPopover from './ConfirmPopover';
import FavoriteSpecs from './FavoriteSpecs';
import { ui } from './ui';

type GarageViewProps = {
  bikes: Motorcycle[];
  activeBikeId: string | null;
  /** Every bike's tasks, for the status line; null while they load. */
  allTasks: MaintenanceTask[] | null;
  /** Each bike's starred specs, by bike id. */
  favoriteSpecs: Record<string, FavoriteSpecRow[]>;
  unitSystem: UnitSystem;
  /** Shows the bike's tasks. */
  onOpen: (bikeId: string) => void;
  onAdd: () => void;
  onEdit: (bike: Motorcycle) => void;
  onSpecs: (bike: Motorcycle) => void;
  onRemove: (bike: Motorcycle) => void;
};

const SUMMARY: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'Overdue', label: 'overdue', color: 'text-danger' },
  { status: 'Urgent', label: 'urgent', color: 'text-danger' },
  { status: 'Soon', label: 'soon', color: 'text-warn' },
  { status: 'NoStart', label: 'to set up', color: 'text-muted' },
];

/** "2 overdue · 1 soon · 4 to set up", "All good" or "No tasks yet" for one bike. */
export function BikeStatusLine({ tasks, mileage }: { tasks: MaintenanceTask[]; mileage: number | null }) {
  if (tasks.length === 0) return <span className="text-muted">No tasks yet</span>;
  const counts = countTasksByStatus(tasks, mileage, new Date());
  const parts = SUMMARY.filter(({ status }) => counts[status] > 0);
  if (parts.length === 0) return <span className="text-good">All good</span>;
  return (
    <>
      {parts.map(({ status, label, color }, index) => (
        <span key={status} className={color}>
          {index > 0 && <span className="text-muted"> · </span>}
          {counts[status]} {label}
        </span>
      ))}
    </>
  );
}

const menuItem =
  'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-bold text-fg transition-colors hover:bg-raised';

/** The ⋯ menu on a bike's card: Specs, and the rarely needed Edit and Remove. */
function BikeMenu({ name, onSpecs, onEdit, onRemove }: { name: string; onSpecs: () => void; onEdit: () => void; onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapperRef, isOpen, () => setIsOpen(false));

  const choose = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={wrapperRef} className="relative -mr-2 -mt-1.5 shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`More for the ${name}`}
        className="inline-flex size-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg"
      >
        <Ellipsis size={20} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={menuId} className={`absolute right-0 top-full z-30 mt-1 flex w-52 flex-col p-1.5 ${ui.popover}`}>
          <button type="button" onClick={choose(onSpecs)} className={menuItem}>
            <ClipboardList size={16} className="text-muted" aria-hidden="true" /> Specs
          </button>
          <button type="button" onClick={choose(onEdit)} className={menuItem}>
            <Pencil size={16} className="text-muted" aria-hidden="true" /> Edit bike
          </button>
          <ConfirmPopover message={`Remove the ${name}? This deletes its tasks and service history.`} confirmLabel="Remove bike" onConfirm={choose(onRemove)}>
            {(open, popoverProps) => (
              <button type="button" onClick={open} {...popoverProps} className={`${menuItem} hover:text-danger`}>
                <Trash2 size={16} className="text-muted" aria-hidden="true" /> Remove bike
              </button>
            )}
          </ConfirmPopover>
        </div>
      )}
    </div>
  );
}

/** Every bike, with what each needs; tap one to see its tasks. Bikes are added, edited and removed here, and their specs kept. */
export default function GarageView({
  bikes,
  activeBikeId,
  allTasks,
  favoriteSpecs,
  unitSystem,
  onOpen,
  onAdd,
  onEdit,
  onSpecs,
  onRemove,
}: GarageViewProps) {
  return (
    <div className="space-y-3">
      {bikes.length === 0 ? (
        <div className={ui.emptyState}>Your garage is empty. Add your first bike to start tracking maintenance.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {bikes.map((bike) => {
            const name = `${bike.year} ${bike.make} ${bike.model}`;
            const isActive = bike.id === activeBikeId;
            const specs = favoriteSpecs[bike.id] ?? [];
            return (
              <li key={bike.id} className={`${ui.card} p-4 ${isActive ? 'border-accent/60' : ''}`}>
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => onOpen(bike.id)} className="block min-w-0 flex-1 text-left" aria-label={`Show tasks for the ${name}`}>
                    <span className="block text-sm font-semibold text-muted">
                      {bike.year} {bike.make}
                    </span>
                    <span className="block truncate text-2xl font-extrabold leading-tight tracking-tight">{bike.model}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-1 text-sm font-bold">
                      <span className="tabular-nums">{formatOdometer(bike.current_mileage, unitSystem)}</span>
                      <span className="text-muted"> · </span>
                      {allTasks ? (
                        <BikeStatusLine tasks={allTasks.filter((task) => task.motorcycle_id === bike.id)} mileage={bike.current_mileage} />
                      ) : (
                        <span className="text-muted">…</span>
                      )}
                    </span>
                  </button>
                  <BikeMenu name={name} onSpecs={() => onSpecs(bike)} onEdit={() => onEdit(bike)} onRemove={() => onRemove(bike)} />
                </div>
                {specs.length > 0 && (
                  <button type="button" onClick={() => onSpecs(bike)} className="mt-3 block w-full text-left">
                    <span className="sr-only">Specs: </span>
                    <FavoriteSpecs specs={specs} chips />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={onAdd} className={`w-full ${ui.secondaryButton} min-h-12`}>
        <Plus size={15} aria-hidden="true" /> Add bike
      </button>
    </div>
  );
}

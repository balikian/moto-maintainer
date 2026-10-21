'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { countTasksByStatus, type TaskStatus } from '@/lib/maintenance';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { formatOdometer } from '@/lib/units';
import ConfirmPopover from './ConfirmPopover';
import { ui } from './ui';

type GarageViewProps = {
  bikes: Motorcycle[];
  activeBikeId: string | null;
  /** Every bike's tasks, for the status line; null while they load. */
  allTasks: MaintenanceTask[] | null;
  unitSystem: UnitSystem;
  /** Shows the bike's tasks. */
  onOpen: (bikeId: string) => void;
  onAdd: () => void;
  onEdit: (bike: Motorcycle) => void;
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

const smallButton =
  'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-muted transition-colors';

/** Every bike, with what each needs; tap one to see its tasks. Bikes are added, edited and removed here. */
export default function GarageView({ bikes, activeBikeId, allTasks, unitSystem, onOpen, onAdd, onEdit, onRemove }: GarageViewProps) {
  return (
    <div className="space-y-3">
      {bikes.length === 0 ? (
        <div className={ui.emptyState}>Your garage is empty. Add your first bike to start tracking maintenance.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {bikes.map((bike) => {
            const name = `${bike.year} ${bike.make} ${bike.model}`;
            const isActive = bike.id === activeBikeId;
            return (
              <li key={bike.id} className={`${ui.card} p-4 ${isActive ? 'border-accent/60' : ''}`}>
                <button type="button" onClick={() => onOpen(bike.id)} className="block w-full text-left" aria-label={`Show tasks for the ${name}`}>
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
                <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                  <button type="button" onClick={() => onEdit(bike)} className={`${smallButton} hover:text-fg`}>
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <ConfirmPopover
                    message={`Remove the ${name}? This deletes its tasks and service history.`}
                    confirmLabel="Remove bike"
                    onConfirm={() => onRemove(bike)}
                  >
                    {(open, popoverProps) => (
                      <button type="button" onClick={open} {...popoverProps} className={`${smallButton} hover:border-danger/40 hover:text-danger`}>
                        <Trash2 size={13} aria-hidden="true" /> Remove
                      </button>
                    )}
                  </ConfirmPopover>
                </div>
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

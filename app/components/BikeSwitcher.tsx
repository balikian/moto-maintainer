'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import { ui } from './ui';

type BikeSwitcherProps = {
  bikes: Motorcycle[];
  activeBike: Motorcycle | null;
  unitSystem: UnitSystem;
  onSelect: (bikeId: string) => void;
  onAdd: () => void;
  onEdit: (bike: Motorcycle) => void;
  onRemove: (bike: Motorcycle) => void;
};

const rowButtonClass = 'rounded-lg border border-line p-2 text-muted transition-colors';

/** The bike's name, large; opens the garage list to switch, add, edit or remove bikes. */
export default function BikeSwitcher({ bikes, activeBike, unitSystem, onSelect, onAdd, onEdit, onRemove }: BikeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The bike whose row is asking "remove this bike?"; shown inline, since the list scrolls.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const select = (bikeId: string) => {
    onSelect(bikeId);
    setIsOpen(false);
  };

  const toggleOpen = () => {
    setIsOpen((previous) => !previous);
    setConfirmingId(null);
  };

  return (
    <div className="relative">
      <button type="button" onClick={toggleOpen} className="flex w-full items-end justify-between gap-3 text-left" aria-expanded={isOpen}>
        {activeBike ? (
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-muted">
              {activeBike.year} {activeBike.make}
            </span>
            <span className="block truncate text-3xl font-extrabold leading-tight tracking-tight">{activeBike.model}</span>
          </span>
        ) : (
          <span className="text-lg font-bold">No bikes in your garage</span>
        )}
        <span className="flex shrink-0 items-center gap-1 pb-1.5 text-sm font-bold text-muted">
          {bikes.length > 1 ? `${bikes.length} bikes` : 'Garage'}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full z-30 mt-2 w-[26rem] max-w-[calc(100vw-3rem)] overflow-hidden ${ui.popover}`}>
          <div className="max-h-72 overflow-y-auto">
            {bikes.length > 0 ? (
              bikes.map((bike) => {
                const isSelected = bike.id === activeBike?.id;
                if (confirmingId === bike.id) {
                  return (
                    <div key={bike.id} role="alertdialog" aria-label="Confirm removing this bike" className="border-l-2 border-danger bg-danger/5 px-3 py-2.5">
                      <p className="text-sm">
                        Remove the {bike.year} {bike.make} {bike.model}? This deletes its tasks and service history.
                      </p>
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setConfirmingId(null)} className={`${ui.secondaryButton} px-3 py-1.5 text-xs`}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          autoFocus
                          onClick={() => {
                            setConfirmingId(null);
                            setIsOpen(false);
                            onRemove(bike);
                          }}
                          className={`${ui.primaryButton} px-3 py-1.5 text-xs`}
                        >
                          Remove bike
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={bike.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => select(bike.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        select(bike.id);
                      }
                    }}
                    className={`w-full cursor-pointer border-l-2 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-raised'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{bike.make} {bike.model}</span>
                      <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 text-xs font-bold text-muted">{bike.year}</span>
                      <span className="ml-auto shrink-0 text-xs font-semibold text-muted tabular-nums">
                        {formatDistance(bike.current_mileage, unitSystem)}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsOpen(false);
                          onEdit(bike);
                        }}
                        className={`${rowButtonClass} hover:text-fg`}
                        title="Edit bike"
                        aria-label={`Edit ${bike.year} ${bike.make} ${bike.model}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmingId(bike.id);
                        }}
                        className={`${rowButtonClass} hover:border-danger/40 hover:text-danger`}
                        title="Remove bike"
                        aria-label={`Remove ${bike.year} ${bike.make} ${bike.model}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-4 text-sm text-muted">Your garage is empty.</div>
            )}
          </div>
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAdd();
              }}
              className={`w-full ${ui.secondaryButton}`}
            >
              <Plus size={15} /> Add bike
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bike as BikeIcon, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
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

const rowButtonClass =
  'rounded-md border border-slate-300 p-1.5 text-slate-500 transition-colors dark:border-slate-700';

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
      <button type="button" onClick={toggleOpen} className={`py-2 ${ui.chipButton}`} aria-expanded={isOpen}>
        <BikeIcon size={14} className="text-amber-500" />
        {activeBike ? (
          <>
            <span className="max-w-[180px] truncate">{activeBike.make} {activeBike.model}</span>
            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {activeBike.year}
            </span>
          </>
        ) : (
          <span>No bikes in garage</span>
        )}
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full z-30 mt-2 w-[26rem] max-w-[calc(100vw-3rem)] overflow-hidden ${ui.popover}`}>
          <div className="max-h-72 overflow-y-auto">
            {bikes.length > 0 ? (
              bikes.map((bike) => {
                const isSelected = bike.id === activeBike?.id;
                if (confirmingId === bike.id) {
                  return (
                    <div key={bike.id} role="alertdialog" aria-label="Confirm removing this bike" className="border-l-2 border-rose-500 bg-rose-500/5 px-3 py-2.5">
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
                          className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-500"
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
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BikeIcon size={14} className="shrink-0 text-amber-500" />
                      <span className="truncate text-sm">{bike.make} {bike.model}</span>
                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {bike.year}
                      </span>
                      <span className={`ml-auto shrink-0 font-mono text-xs ${ui.muted}`}>
                        {formatDistance(bike.current_mileage, unitSystem)}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsOpen(false);
                          onEdit(bike);
                        }}
                        className={`${rowButtonClass} hover:border-amber-500/40 hover:text-amber-500`}
                        title="Edit bike"
                        aria-label={`Edit ${bike.year} ${bike.make} ${bike.model}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmingId(bike.id);
                        }}
                        className={`${rowButtonClass} hover:border-rose-500/40 hover:text-rose-500 dark:hover:text-rose-400`}
                        title="Remove bike"
                        aria-label={`Remove ${bike.year} ${bike.make} ${bike.model}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`px-4 py-4 text-sm ${ui.muted}`}>Your garage is empty.</div>
            )}
          </div>
          <div className="border-t border-slate-200 p-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAdd();
              }}
              className={`w-full ${ui.secondaryButton}`}
            >
              <Plus size={15} className="text-amber-500" /> Add Bike
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

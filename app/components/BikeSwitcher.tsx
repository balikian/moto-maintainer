'use client';

import { useState } from 'react';
import { Bike as BikeIcon, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import { ui } from './ui';

type BikeSwitcherProps = {
  bikes: Motorcycle[];
  activeBike: Motorcycle | null;
  unitSystem: UnitSystem;
  onSelect: (bikeId: string) => void;
  onAdd: () => void;
  onRemove: (bike: Motorcycle) => void;
};

export default function BikeSwitcher({ bikes, activeBike, unitSystem, onSelect, onAdd, onRemove }: BikeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const select = (bikeId: string) => {
    onSelect(bikeId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((previous) => !previous)} className={`py-2 ${ui.chipButton}`} aria-expanded={isOpen}>
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
                          onRemove(bike);
                        }}
                        className="rounded-md border border-slate-300 p-1.5 text-slate-500 transition-colors hover:border-rose-500/40 hover:text-rose-500 dark:border-slate-700 dark:hover:text-rose-400"
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

'use client';

import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import { ui } from './ui';

type BikeSwitcherProps = {
  bikes: Motorcycle[];
  activeBike: Motorcycle;
  unitSystem: UnitSystem;
  onSelect: (bikeId: string) => void;
  onAdd: () => void;
  /** Opens Garage, where bikes are edited and removed. */
  onManage: () => void;
};

/** The bike's name, large; opens a quick list to switch bikes or add one. */
export default function BikeSwitcher({ bikes, activeBike, unitSystem, onSelect, onAdd, onManage }: BikeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = (then: () => void) => {
    setIsOpen(false);
    then();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-full items-end justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-muted">
            {activeBike.year} {activeBike.make}
          </span>
          <span className="block truncate text-3xl font-extrabold leading-tight tracking-tight">{activeBike.model}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 pb-1.5 text-sm font-bold text-muted">
          {bikes.length > 1 ? `${bikes.length} bikes` : 'Garage'}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full z-30 mt-2 w-[26rem] max-w-[calc(100vw-3rem)] overflow-hidden ${ui.popover}`}>
          <ul className="max-h-72 overflow-y-auto">
            {bikes.map((bike) => {
              const isSelected = bike.id === activeBike.id;
              return (
                <li key={bike.id}>
                  <button
                    type="button"
                    onClick={() => close(() => onSelect(bike.id))}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`flex min-h-12 w-full items-center gap-2 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-raised'
                    }`}
                  >
                    <span className="truncate text-sm font-semibold">{bike.make} {bike.model}</span>
                    <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 text-xs font-bold text-muted">{bike.year}</span>
                    <span className="ml-auto shrink-0 text-xs font-semibold text-muted tabular-nums">
                      {formatDistance(bike.current_mileage, unitSystem)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 border-t border-line p-2">
            <button type="button" onClick={() => close(onAdd)} className={`flex-1 ${ui.secondaryButton}`}>
              <Plus size={15} /> Add bike
            </button>
            <button type="button" onClick={() => close(onManage)} className={`flex-1 ${ui.secondaryButton}`}>
              Manage garage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

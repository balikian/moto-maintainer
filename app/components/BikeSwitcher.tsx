'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Motorcycle, UnitSystem } from '@/lib/types';
import { formatOdometer } from '@/lib/units';
import { useDismiss } from '../hooks/useDismiss';
import { ui } from './ui';

type BikeSwitcherProps = {
  bikes: Motorcycle[];
  activeBike: Motorcycle;
  unitSystem: UnitSystem;
  onSelect: (bikeId: string) => void;
  onAdd: () => void;
};

/**
 * The bike's name, large. With more than one bike, "2 bikes" opens a quick
 * list to switch or add one. (Garage, in the bottom bar, is where bikes are
 * added, edited and removed otherwise.)
 */
export default function BikeSwitcher({ bikes, activeBike, unitSystem, onSelect, onAdd }: BikeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapperRef, isOpen, () => setIsOpen(false));

  const close = (then: () => void) => {
    setIsOpen(false);
    then();
  };

  const yearAndMake = (
    <span className="min-w-0 text-sm font-semibold text-muted">
      {activeBike.year} {activeBike.make}
    </span>
  );
  // Wraps rather than truncating: a long model name ("R 1250 GS Adventure") should show in full.
  const model = <span className="block break-words text-3xl font-extrabold leading-tight tracking-tight">{activeBike.model}</span>;

  if (bikes.length < 2) {
    return (
      <div>
        <span className="block">{yearAndMake}</span>
        {model}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setIsOpen((previous) => !previous)} className="block w-full text-left" aria-expanded={isOpen}>
        <span className="flex items-center justify-between gap-3">
          {yearAndMake}
          <span className="-my-1 flex shrink-0 items-center gap-1 rounded-lg bg-raised px-2 py-1 text-sm font-bold text-muted">
            {bikes.length} bikes
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </span>
        {model}
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
                      {formatOdometer(bike.current_mileage, unitSystem)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line p-2">
            <button type="button" onClick={() => close(onAdd)} className={`w-full ${ui.secondaryButton}`}>
              <Plus size={15} /> Add bike
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

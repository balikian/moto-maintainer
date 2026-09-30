'use client';

import type { Motorcycle, Theme, UnitSystem } from '@/lib/types';
import BikeSwitcher from './BikeSwitcher';
import OdometerControl from './OdometerControl';
import UserMenu from './UserMenu';
import { ui } from './ui';

type GarageHeaderProps = {
  avatarUrl: string | null;
  bikes: Motorcycle[];
  activeBike: Motorcycle | null;
  unitSystem: UnitSystem;
  theme: Theme;
  isAdmin: boolean;
  onSelectBike: (bikeId: string) => void;
  onAddBike: () => void;
  onRemoveBike: (bike: Motorcycle) => void;
  onUpdateOdometer: (miles: number) => Promise<string | null>;
  onToggleUnits: () => void;
  onToggleTheme: () => void;
};

export default function GarageHeader(props: GarageHeaderProps) {
  return (
    <header className="relative mx-auto mb-8 max-w-4xl rounded-2xl border border-l-4 border-slate-200 border-l-amber-500 bg-white/80 p-5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:border-l-amber-500 dark:bg-slate-900/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-amber-500">MOTO_MAINTAIN</h1>
          <p className={`text-sm ${ui.muted}`}>Digital Garage &amp; Service Tracker</p>
        </div>
        <UserMenu
          avatarUrl={props.avatarUrl}
          unitSystem={props.unitSystem}
          theme={props.theme}
          isAdmin={props.isAdmin}
          onToggleUnits={props.onToggleUnits}
          onToggleTheme={props.onToggleTheme}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BikeSwitcher
          bikes={props.bikes}
          activeBike={props.activeBike}
          unitSystem={props.unitSystem}
          onSelect={props.onSelectBike}
          onAdd={props.onAddBike}
          onRemove={props.onRemoveBike}
        />
        <OdometerControl
          key={props.activeBike?.id ?? 'none'}
          bike={props.activeBike}
          unitSystem={props.unitSystem}
          onSave={props.onUpdateOdometer}
        />
      </div>
    </header>
  );
}

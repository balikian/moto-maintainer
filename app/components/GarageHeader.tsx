'use client';

import type { TaskStatus } from '@/lib/maintenance';
import type { Motorcycle, Theme, UnitSystem } from '@/lib/types';
import BikeSwitcher from './BikeSwitcher';
import BrandLogo from './BrandLogo';
import OdometerControl from './OdometerControl';
import UserMenu from './UserMenu';
import { ui } from './ui';

type GarageHeaderProps = {
  avatarUrl: string | null;
  email: string | null;
  bikes: Motorcycle[];
  activeBike: Motorcycle | null;
  /** The active bike's tasks by status; null while they load. */
  statusCounts: Record<TaskStatus, number> | null;
  unitSystem: UnitSystem;
  theme: Theme;
  isAdmin: boolean;
  onSelectBike: (bikeId: string) => void;
  onAddBike: () => void;
  onEditBike: (bike: Motorcycle) => void;
  onRemoveBike: (bike: Motorcycle) => void;
  onUpdateOdometer: (miles: number) => Promise<string | null>;
  onToggleUnits: () => void;
  onToggleTheme: () => void;
};

const STATUS_TILES: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'Overdue', label: 'Overdue', color: 'text-danger' },
  { status: 'Urgent', label: 'Urgent', color: 'text-danger' },
  { status: 'Soon', label: 'Soon', color: 'text-warn' },
  { status: 'Healthy', label: 'All good', color: 'text-muted' },
];

export default function GarageHeader(props: GarageHeaderProps) {
  const { statusCounts } = props;

  return (
    <header className="mx-auto mb-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h1>
          <BrandLogo className="h-10 sm:h-12" />
        </h1>
        <UserMenu
          avatarUrl={props.avatarUrl}
          email={props.email}
          unitSystem={props.unitSystem}
          theme={props.theme}
          isAdmin={props.isAdmin}
          onToggleUnits={props.onToggleUnits}
          onToggleTheme={props.onToggleTheme}
        />
      </div>

      <section aria-label="Your bike" className={`${ui.card} mt-4 space-y-3.5 p-4`}>
        <BikeSwitcher
          bikes={props.bikes}
          activeBike={props.activeBike}
          unitSystem={props.unitSystem}
          onSelect={props.onSelectBike}
          onAdd={props.onAddBike}
          onEdit={props.onEditBike}
          onRemove={props.onRemoveBike}
        />
        {props.activeBike && (
          <div className="border-t border-line pt-3.5">
            <OdometerControl
              key={props.activeBike.id}
              bike={props.activeBike}
              unitSystem={props.unitSystem}
              onSave={props.onUpdateOdometer}
            />
          </div>
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
      </section>
    </header>
  );
}

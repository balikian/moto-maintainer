'use client';

import { useId, useRef, useState } from 'react';
import { Bike, ClipboardList, Ellipsis, Pencil, Plus, Store, Trash2, Warehouse } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dates';
import { countTasksByStatus, type TaskStatus } from '@/lib/maintenance';
import type { FavoriteSpecRow } from '@/lib/specs';
import type { MaintenanceTask, Motorcycle, Shop, UnitSystem } from '@/lib/types';
import { formatDistance, formatOdometer } from '@/lib/units';
import { useDismiss } from '../hooks/useDismiss';
import ConfirmPopover from './ConfirmPopover';
import FavoriteSpecs from './FavoriteSpecs';
import ShopLinks from './ShopLinks';
import { ui } from './ui';

type GarageViewProps = {
  bikes: Motorcycle[];
  activeBikeId: string | null;
  /** Every bike's tasks, for the status line; null while they load. */
  allTasks: MaintenanceTask[] | null;
  /** Each bike's starred specs, by bike id. */
  favoriteSpecs: Record<string, FavoriteSpecRow[]>;
  /** The rider's shops, for each bike's preferred one and the Shops list. */
  shops: Shop[];
  unitSystem: UnitSystem;
  /** Shows the bike's tasks. */
  onOpen: (bikeId: string) => void;
  onAdd: () => void;
  onEdit: (bike: Motorcycle) => void;
  onSpecs: (bike: Motorcycle) => void;
  onRemove: (bike: Motorcycle) => void;
  /** Puts the bike in storage, or (when it's stored) back on the road. */
  onStorage: (bike: Motorcycle) => void;
  onAddShop: () => void;
  onEditShop: (shop: Shop) => void;
  onRemoveShop: (shop: Shop) => void;
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

/** The ⋯ menu on a bike's card: Specs, storage, and the rarely needed Edit and Remove. */
function BikeMenu({
  name,
  stored,
  onSpecs,
  onStorage,
  onEdit,
  onRemove,
}: {
  name: string;
  stored: boolean;
  onSpecs: () => void;
  onStorage: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
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
          <button type="button" onClick={choose(onStorage)} className={menuItem}>
            {stored ? (
              <>
                <Bike size={16} className="text-muted" aria-hidden="true" /> Back on the road
              </>
            ) : (
              <>
                <Warehouse size={16} className="text-muted" aria-hidden="true" /> Put in storage
              </>
            )}
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

/** One of the rider's shops: its details and links, with Edit and Remove. */
function ShopCard({ shop, bikeNames, onEdit, onRemove }: { shop: Shop; bikeNames: string[]; onEdit: () => void; onRemove: () => void }) {
  return (
    <li className={`${ui.card} p-4`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-extrabold leading-tight">{shop.name}</h3>
          {(shop.phone || shop.address) && (
            <p className="mt-0.5 text-sm font-semibold text-muted">{[shop.phone, shop.address].filter(Boolean).join(' · ')}</p>
          )}
          {bikeNames.length > 0 && <p className="mt-0.5 text-sm font-semibold text-muted">For the {bikeNames.join(', ')}</p>}
        </div>
        <button type="button" onClick={onEdit} className={`${ui.iconButton} -mr-2 -mt-1.5 border-0 bg-transparent text-muted hover:text-fg`} aria-label={`Edit ${shop.name}`}>
          <Pencil size={17} aria-hidden="true" />
        </button>
        <ConfirmPopover
          message={`Remove ${shop.name}?${bikeNames.length > 0 ? ' Bikes that use it will have no shop.' : ''} Your service history keeps its name.`}
          confirmLabel="Remove shop"
          onConfirm={onRemove}
        >
          {(open, popoverProps) => (
            <button
              type="button"
              onClick={open}
              {...popoverProps}
              className={`${ui.iconButton} -mr-2 -mt-1.5 border-0 bg-transparent text-muted hover:text-danger`}
              aria-label={`Remove ${shop.name}`}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          )}
        </ConfirmPopover>
      </div>
      {shop.notes && <p className="mt-2 whitespace-pre-line text-sm">{shop.notes}</p>}
      <div className="mt-3 empty:hidden">
        <ShopLinks shop={shop} />
      </div>
    </li>
  );
}

/** Every bike, with what each needs; tap one to see its tasks. Bikes are added, edited and removed here, and their specs kept; then the rider's shops. */
export default function GarageView({
  bikes,
  activeBikeId,
  allTasks,
  favoriteSpecs,
  shops,
  unitSystem,
  onOpen,
  onAdd,
  onEdit,
  onSpecs,
  onRemove,
  onStorage,
  onAddShop,
  onEditShop,
  onRemoveShop,
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
            const shop = shops.find((candidate) => candidate.id === bike.shop_id) ?? null;
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
                    {bike.purchased_on && bike.purchase_mileage != null && (
                      <span className="mt-0.5 block text-sm font-semibold text-muted">
                        Bought {formatDisplayDate(bike.purchased_on)} at {formatDistance(bike.purchase_mileage, unitSystem)}
                      </span>
                    )}
                    {bike.stored_on && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-info">
                        <Warehouse size={15} aria-hidden="true" /> In storage since {formatDisplayDate(bike.stored_on)}
                      </span>
                    )}
                  </button>
                  <BikeMenu
                    name={name}
                    stored={Boolean(bike.stored_on)}
                    onSpecs={() => onSpecs(bike)}
                    onStorage={() => onStorage(bike)}
                    onEdit={() => onEdit(bike)}
                    onRemove={() => onRemove(bike)}
                  />
                </div>
                {specs.length > 0 && (
                  <button type="button" onClick={() => onSpecs(bike)} className="mt-3 block w-full text-left">
                    <span className="sr-only">Specs: </span>
                    <FavoriteSpecs specs={specs} chips />
                  </button>
                )}
                {shop && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                      <Store size={16} className="shrink-0 text-muted" aria-hidden="true" />
                      <span className="sr-only">Shop: </span>
                      <span className="truncate">{shop.name}</span>
                    </span>
                    <ShopLinks shop={shop} compact />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={onAdd} className={`w-full ${ui.secondaryButton} min-h-12`}>
        <Plus size={15} aria-hidden="true" /> Add bike
      </button>

      <section aria-labelledby="garage-shops" className="space-y-3 pt-5">
        <div>
          <h2 id="garage-shops" className={ui.sectionTitle}>Shops</h2>
          <p className="mt-0.5 text-sm text-muted">
            {shops.length === 0
              ? 'Add the shop or mechanic you take your bikes to, then pick it for each bike in Edit bike.'
              : 'Pick a bike’s shop in Edit bike (⋯ on its card).'}
          </p>
        </div>
        {shops.length > 0 && (
          <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {shops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                bikeNames={bikes.filter((bike) => bike.shop_id === shop.id).map((bike) => `${bike.make} ${bike.model}`)}
                onEdit={() => onEditShop(shop)}
                onRemove={() => onRemoveShop(shop)}
              />
            ))}
          </ul>
        )}
        <button type="button" onClick={onAddShop} className={`w-full ${ui.secondaryButton} min-h-12`}>
          <Plus size={15} aria-hidden="true" /> Add a shop
        </button>
      </section>
    </div>
  );
}

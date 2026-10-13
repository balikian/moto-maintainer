'use client';

import { Bike, Check, History as HistoryIcon, Menu, Wrench, type LucideIcon } from 'lucide-react';
import type { View } from '../hooks/useView';
import ViewLink from './ViewLink';

type AppNavProps = {
  view: View;
  onNavigate: (view: View) => void;
  onLogService: () => void;
  /** False with no bike to log service on. */
  canLogService: boolean;
};

/** The screens, in bar order. On desktop, More is reached from the avatar instead. */
export const NAV_TABS: { view: View; label: string; Icon: LucideIcon }[] = [
  { view: 'tasks', label: 'Tasks', Icon: Wrench },
  { view: 'history', label: 'History', Icon: HistoryIcon },
  { view: 'garage', label: 'Garage', Icon: Bike },
  { view: 'more', label: 'More', Icon: Menu },
];

/** The phone's bottom bar: four screens, with Log service (the common action) raised in the middle. Desktop uses DesktopHeader. */
export default function AppNav({ view, onNavigate, onLogService, canLogService }: AppNavProps) {
  const tab = ({ view: target, label, Icon }: (typeof NAV_TABS)[number]) => {
    const isCurrent = target === view;
    return (
      <ViewLink
        key={target}
        view={target}
        onNavigate={onNavigate}
        aria-current={isCurrent ? 'page' : undefined}
        className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs transition-colors ${
          isCurrent ? 'font-extrabold text-fg' : 'font-bold text-muted hover:text-fg'
        }`}
      >
        <Icon size={22} strokeWidth={2} className={isCurrent ? 'text-accent' : undefined} aria-hidden="true" />
        {label}
      </ViewLink>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 print:hidden lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {NAV_TABS.slice(0, 2).map(tab)}
        <button
          type="button"
          onClick={onLogService}
          disabled={!canLogService}
          className="group -mt-7 flex flex-col items-center gap-1 text-xs font-extrabold text-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lg shadow-black/25 transition-colors group-enabled:group-hover:bg-brand-hover">
            <Check size={26} strokeWidth={2.6} aria-hidden="true" />
          </span>
          Log service
        </button>
        {NAV_TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { Bike, Check, History as HistoryIcon, Menu, Wrench, type LucideIcon } from 'lucide-react';
import { LOG_SERVICE_HREF, viewHref, type View } from '../hooks/useView';
import ViewLink from './ViewLink';

type AppNavProps =
  | {
      view: View;
      onNavigate: (view: View) => void;
      onLogService: () => void;
      /** False with no bike to log service on. */
      canLogService: boolean;
    }
  | {
      /**
       * Off the dashboard (About, Help, Privacy, Terms, for signed-in riders):
       * every button is a plain link back into it. These pages are reached
       * from More, so More shows as current.
       */
      view: 'more';
      onNavigate?: undefined;
    };

/** The screens, in bar order. On desktop, More is reached from the avatar instead. */
export const NAV_TABS: { view: View; label: string; Icon: LucideIcon }[] = [
  { view: 'tasks', label: 'Tasks', Icon: Wrench },
  { view: 'history', label: 'History', Icon: HistoryIcon },
  { view: 'garage', label: 'Garage', Icon: Bike },
  { view: 'more', label: 'More', Icon: Menu },
];

const LOG_BUTTON = 'group -mt-7 flex flex-col items-center gap-1 text-xs font-extrabold text-fg';

/** `hover` is the hover class: a disabled button mustn't light up. */
function LogServiceIcon({ hover }: { hover: string }) {
  return (
    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lg shadow-black/25 transition-colors ${hover}`}>
      <Check size={26} strokeWidth={2.6} aria-hidden="true" />
    </span>
  );
}

/** The phone's bottom bar: four screens, with Log service (the common action) raised in the middle. Desktop uses DesktopHeader. */
export default function AppNav(props: AppNavProps) {
  const { view } = props;

  const tab = ({ view: target, label, Icon }: (typeof NAV_TABS)[number]) => {
    const isCurrent = target === view;
    const linkProps = {
      'aria-current': isCurrent ? ('page' as const) : undefined,
      className: `flex min-h-12 flex-col items-center justify-center gap-1 text-xs transition-colors ${
        isCurrent ? 'font-extrabold text-fg' : 'font-bold text-muted hover:text-fg'
      }`,
      children: (
        <>
          <Icon size={22} strokeWidth={2} className={isCurrent ? 'text-accent' : undefined} aria-hidden="true" />
          {label}
        </>
      ),
    };
    return props.onNavigate ? (
      <ViewLink key={target} view={target} onNavigate={props.onNavigate} {...linkProps} />
    ) : (
      <Link key={target} href={viewHref(target)} {...linkProps} />
    );
  };

  return (
    <nav
      aria-label="Main"
      // Hidden while typing on a phone (globals.css), so it can't ride up on the keyboard.
      data-app-nav
      className="sticky bottom-0 z-30 border-t border-line bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 print:hidden lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {NAV_TABS.slice(0, 2).map(tab)}
        {props.onNavigate ? (
          <button
            type="button"
            onClick={props.onLogService}
            disabled={!props.canLogService}
            className={`${LOG_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <LogServiceIcon hover="group-enabled:group-hover:bg-brand-hover" />
            Log service
          </button>
        ) : (
          <Link href={LOG_SERVICE_HREF} className={LOG_BUTTON}>
            <LogServiceIcon hover="group-hover:bg-brand-hover" />
            Log service
          </Link>
        )}
        {NAV_TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}

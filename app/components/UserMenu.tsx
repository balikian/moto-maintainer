'use client';

import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import type { Theme, UnitSystem } from '@/lib/types';
import { ui } from './ui';

type UserMenuProps = {
  avatarUrl: string | null;
  unitSystem: UnitSystem;
  theme: Theme;
  isAdmin: boolean;
  onToggleUnits: () => void;
  onToggleTheme: () => void;
};

const menuItemClass =
  'w-full rounded-xl bg-slate-100 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700';

export default function UserMenu({ avatarUrl, unitSystem, theme, isAdmin, onToggleUnits, onToggleTheme }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex items-center justify-center overflow-hidden rounded-full bg-slate-100 p-1 text-slate-900 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        aria-label="User options"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar; next/image would need remotePatterns per provider
          <img src={avatarUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="p-2">
            <User size={18} />
          </div>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full z-40 mt-2 w-52 ${ui.popover}`}>
          <div className="space-y-2 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">User Options</div>
            <button
              type="button"
              onClick={() => {
                onToggleUnits();
                setIsOpen(false);
              }}
              className={menuItemClass}
            >
              {unitSystem === 'imperial' ? 'Switch to Metric (km)' : 'Switch to Imperial (mi)'}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleTheme();
                setIsOpen(false);
              }}
              className={menuItemClass}
            >
              {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
            {isAdmin && (
              <a href="/admin" className={`block ${menuItemClass}`}>
                Review submissions
              </a>
            )}
            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-400 dark:hover:text-rose-300"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

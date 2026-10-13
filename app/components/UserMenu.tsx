'use client';

import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import type { Theme, UnitSystem } from '@/lib/types';
import { ui } from './ui';

type UserMenuProps = {
  avatarUrl: string | null;
  email: string | null;
  unitSystem: UnitSystem;
  theme: Theme;
  isAdmin: boolean;
  onToggleUnits: () => void;
  onToggleTheme: () => void;
};

const menuItemClass = 'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-raised';

/** The signed-in rider's avatar, top right; opens account options. */
export default function UserMenu({ avatarUrl, email, unitSystem, theme, isAdmin, onToggleUnits, onToggleTheme }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex h-11 w-11 items-center justify-center rounded-full"
        aria-label={email ? `Account: ${email}` : 'Account'}
        title={email ?? undefined}
        aria-expanded={isOpen}
      >
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-raised text-fg ring-2 ring-line ring-offset-2 ring-offset-page">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar; next/image would need remotePatterns per provider
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={18} aria-hidden="true" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full z-40 mt-2 w-64 p-2 ${ui.popover}`}>
          {email && (
            <div className="border-b border-line px-3 pb-2.5 pt-1.5">
              <div className="text-xs font-semibold text-muted">Signed in as</div>
              <div className="truncate text-sm font-bold" title={email}>{email}</div>
            </div>
          )}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onToggleUnits();
                setIsOpen(false);
              }}
              className={menuItemClass}
            >
              {unitSystem === 'imperial' ? 'Use kilometers' : 'Use miles'}
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleTheme();
                setIsOpen(false);
              }}
              className={menuItemClass}
            >
              {theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            </button>
            {isAdmin && (
              <a href="/admin" className={menuItemClass}>
                Review submissions
              </a>
            )}
          </div>
          <form action={logout} className="border-t border-line pt-1">
            <button type="submit" className={`${menuItemClass} text-danger`}>
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

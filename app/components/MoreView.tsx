'use client';

import { useId, type ReactNode } from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import type { Theme, UnitSystem } from '@/lib/types';
import Avatar from './Avatar';
import { SUPPORT_EMAIL } from '@/lib/site';
import { ui } from './ui';

type MoreViewProps = {
  email: string | null;
  avatarUrl: string | null;
  /** The sign-in provider from Supabase, e.g. "google" or "email". */
  provider: string | null;
  unitSystem: UnitSystem;
  theme: Theme;
  isAdmin: boolean;
  onChangeUnits: (unitSystem: UnitSystem) => void;
  onChangeTheme: (theme: Theme) => void;
};

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'Miles' },
  { value: 'metric', label: 'Kilometers' },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const rowClass = 'flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line py-2 last:border-b-0';
const comingSoon = <span className="text-xs font-bold text-muted">Coming soon</span>;

function providerLabel(provider: string | null) {
  if (provider === 'google') return 'Signed in with Google';
  if (provider === 'apple') return 'Signed in with Apple';
  return 'Signed in with an email link';
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="mx-1 text-sm font-bold text-muted">{title}</h2>
      <div className={`${ui.card} px-3.5`}>{children}</div>
    </section>
  );
}

/** Buttons for picking one of a few values, like Miles / Kilometers. */
function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  return (
    <div className={rowClass}>
      <span id={labelId} className="text-base font-bold">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex gap-0.5 rounded-xl bg-raised p-1">
        {options.map((option) => {
          const isOn = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-lg px-3 text-sm font-extrabold transition-colors ${
                isOn ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Account, preferences, help and legal, admin tools, and sign out. */
export default function MoreView({ email, avatarUrl, provider, unitSystem, theme, isAdmin, onChangeUnits, onChangeTheme }: MoreViewProps) {
  return (
    <div className="space-y-6">
      <div className={`${ui.card} flex items-center gap-3 p-3.5`}>
        <Avatar url={avatarUrl} className="h-11 w-11" iconSize={20} />
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold" title={email ?? undefined}>{email ?? 'Signed in'}</div>
          <div className="text-sm font-medium text-muted">{providerLabel(provider)}</div>
        </div>
      </div>

      <Group title="Preferences">
        <Segmented label="Distance" options={UNIT_OPTIONS} value={unitSystem} onChange={onChangeUnits} />
        <Segmented label="Theme" options={THEME_OPTIONS} value={theme} onChange={onChangeTheme} />
        <div className={rowClass}>
          <span className="text-base font-bold">Reminders and notifications</span>
          {comingSoon}
        </div>
      </Group>

      <Group title="SwingArm">
        <a href="/about" className={`${rowClass} text-base font-bold`}>
          About SwingArm
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={`${rowClass} text-base font-bold`}>
          Help and feedback
          <span className="text-sm font-semibold text-muted">{SUPPORT_EMAIL}</span>
        </a>
        {['Privacy policy', 'Terms of use'].map((label) => (
          <div key={label} className={rowClass}>
            <span className="text-base font-bold">{label}</span>
            {comingSoon}
          </div>
        ))}
      </Group>

      {isAdmin && (
        <Group title="Admins only">
          <a href="/admin" className={`${rowClass} text-base font-bold`}>
            Review submissions
            <ChevronRight size={18} className="text-muted" aria-hidden="true" />
          </a>
        </Group>
      )}

      <form action={logout}>
        <button type="submit" className={`w-full min-h-12 ${ui.secondaryButton} text-base`}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </form>
    </div>
  );
}

'use client';

import { useId, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ChevronRight, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import type { ReminderPreferences, Theme, UnitSystem } from '@/lib/types';
import Avatar from './Avatar';
import DeleteAccountModal from './DeleteAccountModal';
import { SUPPORT_EMAIL } from '@/lib/site';
import { ui } from './ui';

type MoreViewProps = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  avatarUrl: string | null;
  /** The sign-in provider from Supabase, e.g. "google" or "email". */
  provider: string | null;
  unitSystem: UnitSystem;
  theme: Theme;
  reminders: ReminderPreferences;
  isAdmin: boolean;
  onChangeUnits: (unitSystem: UnitSystem) => void;
  onChangeTheme: (theme: Theme) => void;
  onChangeReminders: (reminders: ReminderPreferences) => void;
};

const REMINDER_OPTIONS: { key: keyof ReminderPreferences; label: string; detail: string }[] = [
  { key: 'taskReminders', label: 'Tasks coming due', detail: 'One email when tasks turn soon or overdue' },
  { key: 'odometerReminders', label: 'Odometer check-in', detail: 'When a bike’s odometer hasn’t changed in 30 days' },
  { key: 'monthlySummary', label: 'Monthly summary', detail: 'What’s coming up and what you spent' },
];

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

/** An on/off switch with a label and a line of detail, like "Tasks coming due". */
function SwitchRow({ label, detail, checked, onChange }: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const detailId = useId();
  return (
    <div className={`${rowClass} flex-nowrap`}>
      <span className="min-w-0">
        <span id={labelId} className="block text-base font-bold">{label}</span>
        <span id={detailId} className="block text-sm font-medium text-muted">{detail}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={detailId}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-line-strong'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-on-brand shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

/** Account, preferences, reminders, help and legal, admin tools, sign out, and deleting the account. */
export default function MoreView({
  supabase,
  userId,
  email,
  avatarUrl,
  provider,
  unitSystem,
  theme,
  reminders,
  isAdmin,
  onChangeUnits,
  onChangeTheme,
  onChangeReminders,
}: MoreViewProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      </Group>

      <div className="space-y-2">
        <Group title="Reminder emails">
          {REMINDER_OPTIONS.map((option) => (
            <SwitchRow
              key={option.key}
              label={option.label}
              detail={option.detail}
              checked={reminders[option.key]}
              onChange={(checked) => onChangeReminders({ ...reminders, [option.key]: checked })}
            />
          ))}
        </Group>
        <p className="mx-1 text-sm text-muted">
          At most one email a day{email && <>, sent to {email}</>}.
        </p>
      </div>

      <Group title="SwingArm">
        <a href="/about" className={`${rowClass} text-base font-bold`}>
          About SwingArm
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </a>
        <a href="/help" className={`${rowClass} text-base font-bold`}>
          How SwingArm works
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

      <div className="text-center">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="min-h-11 rounded-xl px-3 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
        >
          Delete account
        </button>
      </div>

      {deleteOpen && (
        <DeleteAccountModal supabase={supabase} userId={userId} email={email} onClose={() => setDeleteOpen(false)} />
      )}
    </div>
  );
}

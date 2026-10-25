'use client';

import { useId, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BellRing, ChevronRight, LogOut, Share, SquarePlus, Upload } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { turnOffPushOnThisDevice, usePush } from '../hooks/usePush';
import { logout } from '@/lib/actions/auth';
import type { Motorcycle, PushPreferences, ReminderPreferences, Theme, UnitSystem } from '@/lib/types';
import Avatar from './Avatar';
import CountBadge from './CountBadge';
import DeleteAccountModal from './DeleteAccountModal';
import DownloadDataButton from './DownloadDataButton';
import ImportDataModal from './ImportDataModal';
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
  push: PushPreferences;
  isAdmin: boolean;
  /** Admins only: submissions waiting for review. */
  reviewCount: number;
  /** The rider's bikes, so Import can point out ones already in the garage. */
  bikes: Motorcycle[];
  onChangeUnits: (unitSystem: UnitSystem) => void;
  onChangeTheme: (theme: Theme) => void;
  onChangeReminders: (reminders: ReminderPreferences) => void;
  onChangePush: (push: PushPreferences) => void;
  /** After Import a backup adds bikes. */
  onImported: (bikeIds: string[]) => void;
};

const REMINDER_OPTIONS: { key: keyof ReminderPreferences; label: string; detail: string }[] = [
  { key: 'taskReminders', label: 'Tasks coming due', detail: 'One email when tasks turn soon or overdue' },
  { key: 'odometerReminders', label: 'Odometer check-in', detail: 'When a bike’s odometer hasn’t changed in 30 days' },
  { key: 'monthlySummary', label: 'Monthly summary', detail: 'What’s coming up and what you spent' },
];

const PUSH_OPTIONS: { key: keyof PushPreferences; label: string; detail: string }[] = [
  { key: 'taskReminders', label: 'Tasks coming due', detail: 'When tasks turn soon or overdue' },
  { key: 'odometerReminders', label: 'Odometer check-in', detail: 'When a bike’s odometer hasn’t changed in 30 days' },
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

const rowBase = 'flex min-h-14 items-center justify-between gap-x-3 gap-y-2 border-b border-line py-2 last:border-b-0';
const rowClass = `${rowBase} flex-wrap`;
/** A row whose control stays on the right while the label and detail wrap beside it. */
const sideControlRowClass = `${rowBase} flex-nowrap`;
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
function SwitchRow({ label, detail, checked, onChange, disabled = false }: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  const detailId = useId();
  return (
    <div className={sideControlRowClass}>
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
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-brand' : 'bg-line-strong'}`}
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

/** A row with a label and a line of detail and no control, e.g. why push isn't available here. */
function NoteRow({ label, detail }: { label: string; detail: ReactNode }) {
  return (
    <div className={rowClass}>
      <span className="min-w-0">
        <span className="block text-base font-bold">{label}</span>
        <span className="block text-sm font-medium text-muted">{detail}</span>
      </span>
    </div>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Push on this device, and which reminders go by push (account-wide, shown once any device has push). */
function PushGroup({ supabase, preferences, onChange }: {
  supabase: SupabaseClient;
  preferences: PushPreferences;
  onChange: (push: PushPreferences) => void;
}) {
  const push = usePush(supabase);
  const anyDevice = push.status === 'on' || push.otherDevices > 0;

  let deviceRow: ReactNode;
  if (push.status === 'home-screen') {
    deviceRow = (
      <NoteRow
        label="Add SwingArm to your Home Screen first"
        detail="On iPhone and iPad, notifications work in the Home Screen app. Add it from Safari’s Share menu, open it from its icon, then come back here."
      />
    );
  } else if (push.status === 'unsupported') {
    deviceRow = <NoteRow label="Not available in this browser" detail="This browser can’t show notifications from websites." />;
  } else if (push.status === 'blocked') {
    deviceRow = (
      <NoteRow
        label="Notifications are blocked"
        detail="Allow notifications for SwingArm in this browser’s or device’s settings, then come back here."
      />
    );
  } else {
    deviceRow = (
      <SwitchRow
        label="On this device"
        detail={push.status === 'on' ? 'Reminders show up here as notifications' : 'Get reminders here as notifications'}
        checked={push.status === 'on'}
        disabled={push.status === 'loading' || push.busy}
        onChange={(checked) => void (checked ? push.turnOn() : push.turnOff())}
      />
    );
  }

  return (
    <div className="space-y-2">
      <Group title="Push notifications">
        {deviceRow}
        {push.status === 'on' && (
          <div className={sideControlRowClass}>
            <span className="min-w-0">
              <span className="block text-base font-bold">Send a test</span>
              <span className="block text-sm font-medium text-muted">
                {push.testSent ? 'Sent. It should show up in a few seconds.' : 'Check that notifications reach this device'}
              </span>
            </span>
            <button type="button" onClick={() => void push.sendTest()} disabled={push.busy} className={`${ui.chipButton} shrink-0`}>
              <BellRing size={15} aria-hidden="true" />
              Test
            </button>
          </div>
        )}
        {anyDevice &&
          PUSH_OPTIONS.map((option) => (
            <SwitchRow
              key={option.key}
              label={option.label}
              detail={option.detail}
              checked={preferences[option.key]}
              onChange={(checked) => onChange({ ...preferences, [option.key]: checked })}
            />
          ))}
      </Group>
      {push.error && <p className={ui.errorBox}>{push.error}</p>}
      <p className="mx-1 text-sm text-muted">
        At most one a day, on each device where you turn them on.
        {push.otherDevices > 0 && <> On for {plural(push.otherDevices, 'other device')}.</>}
      </p>
    </div>
  );
}

/** Install SwingArm (browsers with an install prompt) or how to add it to the Home Screen (iPhone, iPad); nothing once it's installed. */
function InstallRow() {
  const { option, install } = useInstallPrompt();
  if (option === 'prompt') {
    return (
      <div className={sideControlRowClass}>
        <span className="min-w-0">
          <span className="block text-base font-bold">Install SwingArm</span>
          <span className="block text-sm font-medium text-muted">Opens in its own window, like an app</span>
        </span>
        <button type="button" onClick={() => void install()} className={`${ui.chipButton} shrink-0`}>
          <SquarePlus size={15} aria-hidden="true" />
          Install
        </button>
      </div>
    );
  }
  if (option === 'ios') {
    return (
      <div className={rowClass}>
        <span className="min-w-0">
          <span className="block text-base font-bold">Add to Home Screen</span>
          <span className="block text-sm font-medium text-muted">
            Open Safari’s Share menu <Share size={14} className="inline align-[-2px]" aria-hidden="true" />, then tap Add to
            Home Screen. SwingArm opens full screen, like an app.
          </span>
        </span>
      </div>
    );
  }
  return null;
}

/** Account, preferences, reminders, downloading your data, help and legal, admin tools, sign out, and deleting the account. */
export default function MoreView({
  supabase,
  userId,
  email,
  avatarUrl,
  provider,
  unitSystem,
  theme,
  reminders,
  push,
  isAdmin,
  reviewCount,
  bikes,
  onChangeUnits,
  onChangeTheme,
  onChangeReminders,
  onChangePush,
  onImported,
}: MoreViewProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

      <PushGroup supabase={supabase} preferences={push} onChange={onChangePush} />

      <div className="space-y-2">
        <Group title="Your data">
          <div className={sideControlRowClass}>
            <span className="min-w-0">
              <span className="block text-base font-bold">Download a copy</span>
              <span className="block text-sm font-medium text-muted">Every bike, task and service record, in one file</span>
            </span>
            <div className="shrink-0">
              <DownloadDataButton supabase={supabase} userId={userId} email={email} onError={setDownloadError} />
            </div>
          </div>
          <div className={sideControlRowClass}>
            <span className="min-w-0">
              <span className="block text-base font-bold">Import a backup</span>
              <span className="block text-sm font-medium text-muted">Add bikes from a file saved with Download my data</span>
            </span>
            <button type="button" onClick={() => setImportOpen(true)} className={`${ui.chipButton} shrink-0`}>
              <Upload size={15} aria-hidden="true" />
              Import
            </button>
          </div>
        </Group>
        {downloadError && <p className={ui.errorBox}>{downloadError}</p>}
      </div>

      <Group title="SwingArm">
        <InstallRow />
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
        <a href="/privacy" className={`${rowClass} text-base font-bold`}>
          Privacy policy
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </a>
        <a href="/terms" className={`${rowClass} text-base font-bold`}>
          Terms of use
          <ChevronRight size={18} className="text-muted" aria-hidden="true" />
        </a>
      </Group>

      {isAdmin && (
        <Group title="Admins only">
          <a href="/admin" className={`${rowClass} text-base font-bold`}>
            Review submissions
            <span className="flex items-center gap-2">
              <CountBadge count={reviewCount} className="ring-transparent" />
              {reviewCount > 0 && <span className="sr-only">{reviewCount} waiting</span>}
              <ChevronRight size={18} className="text-muted" aria-hidden="true" />
            </span>
          </a>
        </Group>
      )}

      <form
        action={async () => {
          // So whoever uses this device next doesn't get this rider's reminders. It comes back on if they sign in again.
          await turnOffPushOnThisDevice(userId);
          await logout();
        }}
      >
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

      {importOpen && (
        <ImportDataModal
          garage={bikes}
          onClose={() => setImportOpen(false)}
          onImported={(bikeIds) => {
            setImportOpen(false);
            onImported(bikeIds);
          }}
        />
      )}

      {deleteOpen && (
        <DeleteAccountModal supabase={supabase} userId={userId} email={email} onClose={() => setDeleteOpen(false)} />
      )}
    </div>
  );
}

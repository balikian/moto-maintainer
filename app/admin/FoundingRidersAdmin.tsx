'use client';

import { useState, useTransition, type SubmitEvent } from 'react';
import {
  addFoundingRiderAction,
  createInviteAction,
  removeFoundingRiderAction,
  setInviteActiveAction,
} from '@/lib/actions/invites';
import type { ActionResult } from '@/lib/actions/result';
import { formatDisplayDate } from '@/lib/dates';
import { inviteUrl } from '@/lib/invites';
import ConfirmPopover from '../components/ConfirmPopover';
import { ui } from '../components/ui';

export type AdminInvite = { code: string; note: string | null; active: boolean; created_at: string };
export type AdminFoundingRider = { user_id: string; email: string; invite_code: string | null; created_at: string };

type Props = {
  invites: AdminInvite[];
  riders: AdminFoundingRider[];
  /** This site's address, so the links shown are the ones to send from here. */
  siteUrl: string;
};

const smallInput = 'rounded-lg border border-line-strong bg-page px-2 py-1.5 text-sm text-fg';

/** Admin page: invite links (/join/<code>) and the founding riders who came through them or were added by hand. */
export default function FoundingRidersAdmin({ invites, riders, siteUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');

  const run = (action: () => Promise<ActionResult<unknown>>, done?: (result: ActionResult<unknown>) => void) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else done?.(result);
    });
  };

  const ridersPerInvite = new Map<string, number>();
  for (const rider of riders) {
    if (rider.invite_code) ridersPerInvite.set(rider.invite_code, (ridersPerInvite.get(rider.invite_code) ?? 0) + 1);
  }
  const noteFor = (code: string | null) => {
    if (!code) return 'Added by hand';
    const invite = invites.find((entry) => entry.code === code);
    return invite?.note ? `Invite: ${invite.note}` : 'Invite link';
  };

  const createInvite = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(() => createInviteAction(note), () => setNote(''));
  };

  const addRider = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      () => addFoundingRiderAction(email),
      (result) => {
        setNotice((result.data as { status: string }).status === 'already' ? `${email.trim()} was already a founding rider.` : `${email.trim()} is now a founding rider.`);
        setEmail('');
      }
    );
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      {notice && <p className="text-sm font-semibold text-good">{notice}</p>}

      <div className="space-y-2">
        <h3 className="text-sm font-extrabold">Invite links</h3>
        {invites.length === 0 ? (
          <div className={ui.emptyState}>No invite links yet.</div>
        ) : (
          invites.map((invite) => (
            <div key={invite.code} className={`${ui.card} flex flex-wrap items-center gap-3 p-4`}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">
                  {invite.note || 'Invite link'}{' '}
                  <span className={`font-normal ${ui.muted}`}>
                    · {ridersPerInvite.get(invite.code) ?? 0} joined · {invite.active ? 'on' : 'off'}
                  </span>
                </p>
                {/* select-all: one tap selects the whole link to copy. */}
                <p className={`select-all break-all font-mono text-xs ${invite.active ? 'text-accent' : 'text-muted line-through'}`}>
                  {inviteUrl(siteUrl, invite.code)}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setInviteActiveAction(invite.code, !invite.active))}
                className={`${ui.secondaryButton} px-3 py-1.5 text-xs`}
              >
                {invite.active ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          ))
        )}
        <form onSubmit={createInvite} className="flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="Who it's for, e.g. Friends and family"
            aria-label="Invite link note"
            className={`${smallInput} min-w-56 flex-1`}
          />
          <button type="submit" disabled={pending} className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
            New invite link
          </button>
        </form>
        <p className="text-xs text-muted">
          Anyone who signs up through an invite link while it&apos;s on becomes a founding rider: SwingArm free for good,
          paid features included. Turn a link off once its round of invites is done.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-extrabold">Founding riders ({riders.length})</h3>
        {riders.length === 0 ? (
          <div className={ui.emptyState}>No founding riders yet.</div>
        ) : (
          <ul className={`${ui.card} divide-y divide-line`}>
            {riders.map((rider) => (
              <li key={rider.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{rider.email}</p>
                  <p className={`text-xs ${ui.muted}`}>
                    {noteFor(rider.invite_code)} · {formatDisplayDate(rider.created_at.slice(0, 10))}
                  </p>
                </div>
                <ConfirmPopover
                  message={`Remove ${rider.email} from founding riders? They keep their account and garage.`}
                  confirmLabel="Remove"
                  onConfirm={() => run(() => removeFoundingRiderAction(rider.user_id))}
                >
                  {(open, props) => (
                    <button type="button" onClick={open} disabled={pending} className={`${ui.secondaryButton} px-3 py-1.5 text-xs`} {...props}>
                      Remove
                    </button>
                  )}
                </ConfirmPopover>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addRider} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Their sign-in email"
            aria-label="Founding rider's sign-in email"
            className={`${smallInput} min-w-56 flex-1`}
          />
          <button type="submit" disabled={pending || !email.trim()} className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
            Add founding rider
          </button>
        </form>
        <p className="text-xs text-muted">
          For riders who signed up without the link. Apple&apos;s Hide My Email gives a different address: find theirs in
          Supabase&apos;s users.
        </p>
      </div>
    </div>
  );
}

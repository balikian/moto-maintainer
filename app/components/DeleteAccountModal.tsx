'use client';

import { useId, useState, type SubmitEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Trash2 } from 'lucide-react';
import { deleteAccountAction } from '@/lib/actions/account';
import DownloadDataButton from './DownloadDataButton';
import Modal from './Modal';
import { ui } from './ui';

type DeleteAccountModalProps = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  onClose: () => void;
};

// The server action checks the same word.
const CONFIRM_WORD = 'DELETE';

/** Deletes the rider's account after they type DELETE. Closes only with the X or Escape. */
export default function DeleteAccountModal({ supabase, userId, email, onClose }: DeleteAccountModalProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed.trim() === CONFIRM_WORD;

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    // On success the action signs out and goes to the home page, so it only returns on failure.
    const result = await deleteAccountAction(typed);
    setDeleting(false);
    if (result?.error) setError(result.error);
  };

  return (
    <Modal title="Delete your account" description="This can’t be undone." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 text-sm">
          <p>
            Deleting your account{email && <> ({email})</>} erases, for good:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your bikes, their maintenance tasks and service history</li>
            <li>your settings</li>
            <li>any service history links you shared, which stop working</li>
          </ul>
          <p className={ui.muted}>
            Manual links and bike models you submitted stay for other riders, without your name.
          </p>
        </div>

        <div className={`${ui.card} flex flex-wrap items-center justify-between gap-3 p-3`}>
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">Want a copy first?</span>
            <span className={ui.muted}>Every bike, task and service record, in one file.</span>
          </p>
          <DownloadDataButton supabase={supabase} userId={userId} email={email} onError={setError} />
        </div>

        <div>
          <label htmlFor={inputId} className={ui.label}>Type {CONFIRM_WORD} to confirm</label>
          <input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={ui.input}
          />
        </div>

        {error && <p className={ui.errorBox}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ui.secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!confirmed || deleting} className={ui.primaryButton}>
            <Trash2 size={15} aria-hidden="true" />
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

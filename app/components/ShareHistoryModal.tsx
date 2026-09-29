'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Check, Copy, ExternalLink, Link2, Mail, Share2 } from 'lucide-react';
import { createShareLinkAction, revokeShareLinkAction } from '@/lib/actions/shares';
import { bikeTitle } from '@/lib/historyExport';
import type { Motorcycle } from '@/lib/types';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import Modal from './Modal';
import { ui } from './ui';

type ShareHistoryModalProps = {
  supabase: SupabaseClient;
  bike: Motorcycle;
  onClose: () => void;
};

export default function ShareHistoryModal({ supabase, bike, onClose }: ShareHistoryModalProps) {
  const share = useSupabaseQuery<{ token: string } | null>(bike.id, (bikeId) =>
    supabase
      .from('history_shares')
      .select('token')
      .eq('motorcycle_id', bikeId)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle()
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = share.data?.token ?? null;
  const shareUrl = token ? `${window.location.origin}/share/${token}` : null;
  const title = `${bikeTitle(bike)} service history`;
  const canUseShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const runAction = async (action: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCopied(false);
    share.reload();
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it instead.");
    }
  };

  const openShareSheet = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({ title, url: shareUrl });
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  const mailtoHref = shareUrl
    ? `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Here's the service history for my ${bikeTitle(bike)}:\n\n${shareUrl}`)}`
    : undefined;

  return (
    <Modal title="Share Service History" description={bikeTitle(bike)} onClose={onClose}>
      <div className="space-y-4">
        <p className={`text-sm ${ui.muted}`}>
          Anyone with the link can view this bike&apos;s service history, including dates, odometer readings, costs,
          and notes. They can&apos;t change anything or see your other bikes. You can turn the link off at any time.
        </p>

        {share.loading ? (
          <div className={ui.emptyState}>Loading…</div>
        ) : shareUrl ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Share link"
                className={`${ui.input} font-mono text-xs`}
              />
              <button type="button" onClick={() => void copyLink()} className={`shrink-0 ${ui.primaryButton}`}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={mailtoHref} className={ui.secondaryButton}>
                <Mail size={16} /> Email
              </a>
              {canUseShareSheet && (
                <button type="button" onClick={() => void openShareSheet()} className={ui.secondaryButton}>
                  <Share2 size={16} /> Share…
                </button>
              )}
              <a href={shareUrl} target="_blank" rel="noreferrer" className={ui.secondaryButton}>
                <ExternalLink size={16} /> Preview
              </a>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Turn off this link? Anyone who has it will no longer be able to view the history.')) {
                    void runAction(() => revokeShareLinkAction(bike.id));
                  }
                }}
                className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400"
              >
                Turn off link
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(() => createShareLinkAction(bike.id))}
            className={`w-full py-2.5 ${ui.primaryButton}`}
          >
            <Link2 size={16} />
            {busy ? 'Creating link…' : 'Create share link'}
          </button>
        )}

        {(error || share.error) && <div className={ui.errorBox}>{error ?? share.error}</div>}
      </div>
    </Modal>
  );
}

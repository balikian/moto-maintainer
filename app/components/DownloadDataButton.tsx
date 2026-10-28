'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Check, Download } from 'lucide-react';
import { accountExportFileName, buildAccountExport } from '@/lib/accountExport';
import { todayIsoDate } from '@/lib/dates';
import type { MaintenanceTask, Motorcycle, ServiceLog } from '@/lib/types';
import { downloadFile, type SaveResult } from './download';
import { ui } from './ui';

type DownloadDataButtonProps = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  /** Called with a message when gathering the data fails, and with null when a new try starts. */
  onError: (message: string | null) => void;
};

/**
 * Reads everything the rider has (row-level security limits it to theirs) and
 * saves it as one JSON file. Returns how it was saved, or an error message.
 */
async function downloadAllData(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<{ saved: SaveResult } | { error: string }> {
  const [profile, bikes, tasks, logs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('motorcycles').select('*').order('created_at'),
    supabase.from('maintenance_tasks').select('*').order('created_at'),
    supabase.from('service_logs').select('*'),
  ]);
  const failed = [profile, bikes, tasks, logs].find((result) => result.error);
  if (failed?.error) return { error: `Couldn't gather your data: ${failed.error.message}` };

  const exportedOn = todayIsoDate();
  const data = buildAccountExport({
    email,
    profile: profile.data,
    bikes: (bikes.data ?? []) as Motorcycle[],
    tasks: (tasks.data ?? []) as MaintenanceTask[],
    logs: (logs.data ?? []) as ServiceLog[],
    exportedOn,
  });
  try {
    return { saved: await downloadFile(accountExportFileName(exportedOn), JSON.stringify(data, null, 2), 'application/json') };
  } catch {
    return { error: 'Couldn’t save the file. Please try again.' };
  }
}

/** "Download my data": every bike, task and service record in one JSON file. On More and in the delete dialog. */
export default function DownloadDataButton({ supabase, userId, email, onError }: DownloadDataButtonProps) {
  const [downloading, setDownloading] = useState(false);
  // In the Android app the file lands in Downloads without a sign from the phone, so the button says so for a moment.
  const [savedToDownloads, setSavedToDownloads] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    onError(null);
    const result = await downloadAllData(supabase, userId, email);
    setDownloading(false);
    if ('error' in result) onError(result.error);
    else if (result.saved === 'saved') {
      setSavedToDownloads(true);
      setTimeout(() => setSavedToDownloads(false), 4000);
    }
  };

  return (
    <button type="button" onClick={() => void handleDownload()} disabled={downloading} className={ui.chipButton}>
      {savedToDownloads ? <Check size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
      <span aria-live="polite">{downloading ? 'Preparing…' : savedToDownloads ? 'Saved to Downloads' : 'Download my data'}</span>
    </button>
  );
}

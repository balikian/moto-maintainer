'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Download } from 'lucide-react';
import { accountExportFileName, buildAccountExport } from '@/lib/accountExport';
import { todayIsoDate } from '@/lib/dates';
import type { MaintenanceTask, Motorcycle, ServiceLog } from '@/lib/types';
import { downloadFile } from './download';
import { ui } from './ui';

type DownloadDataButtonProps = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  /** Called with a message when gathering the data fails, and with null when a new try starts. */
  onError: (message: string | null) => void;
};

/** Reads everything the rider has (row-level security limits it to theirs) and saves it as one JSON file. */
async function downloadAllData(supabase: SupabaseClient, userId: string, email: string | null): Promise<string | null> {
  const [profile, bikes, tasks, logs] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('motorcycles').select('*').order('created_at'),
    supabase.from('maintenance_tasks').select('*').order('created_at'),
    supabase.from('service_logs').select('*'),
  ]);
  const failed = [profile, bikes, tasks, logs].find((result) => result.error);
  if (failed?.error) return `Couldn't gather your data: ${failed.error.message}`;

  const exportedOn = todayIsoDate();
  const data = buildAccountExport({
    email,
    profile: profile.data,
    bikes: (bikes.data ?? []) as Motorcycle[],
    tasks: (tasks.data ?? []) as MaintenanceTask[],
    logs: (logs.data ?? []) as ServiceLog[],
    exportedOn,
  });
  downloadFile(accountExportFileName(exportedOn), JSON.stringify(data, null, 2), 'application/json');
  return null;
}

/** "Download my data": every bike, task and service record in one JSON file. On More and in the delete dialog. */
export default function DownloadDataButton({ supabase, userId, email, onError }: DownloadDataButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    onError(null);
    const failure = await downloadAllData(supabase, userId, email);
    setDownloading(false);
    if (failure) onError(failure);
  };

  return (
    <button type="button" onClick={() => void handleDownload()} disabled={downloading} className={ui.chipButton}>
      <Download size={15} aria-hidden="true" />
      {downloading ? 'Preparing…' : 'Download my data'}
    </button>
  );
}

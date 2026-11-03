'use server';

import { cleanJob, type JobInput } from '../jobs';
import { getSignedInClient } from '../supabase/server';
import type { BikeJob } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Repairs and upgrades (lib/jobs.ts). Row-level security limits these to the
// signed-in rider's own jobs, and the two-column foreign key to their own bikes.
// They're marked done by logging them (logServiceAction in ./tasks.ts).

export async function createJobAction(motorcycleId: string, input: JobInput): Promise<ActionResult<BikeJob>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };
  if (!motorcycleId) return { error: 'A motorcycle must be selected.' };

  const cleaned = cleanJob(input ?? {});
  if ('error' in cleaned) return cleaned;

  const { data, error } = await supabase
    .from('bike_jobs')
    .insert({ user_id: user.id, motorcycle_id: motorcycleId, ...cleaned.job })
    .select()
    .single();
  if (error || !data) return { error: error?.message ?? 'Unable to save this right now.' };
  return { data: data as BikeJob };
}

export async function updateJobAction(jobId: string, input: JobInput): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const cleaned = cleanJob(input ?? {});
  if ('error' in cleaned) return cleaned;

  const { data, error } = await supabase.from('bike_jobs').update(cleaned.job).eq('id', jobId).select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Repair or upgrade not found.' };

  // A done job's record keeps its kind in step, so the history labels it the same way.
  const relabel = await supabase.from('service_logs').update({ job_kind: cleaned.job.kind }).eq('job_id', jobId);
  if (relabel.error) return { error: relabel.error.message };
  return {};
}

/** Removes a repair or upgrade. If it was done, its service record stays in the history. */
export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.from('bike_jobs').delete().eq('id', jobId);
  if (error) return { error: error.message };
  return {};
}

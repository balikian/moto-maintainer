'use server';

import { isIsoDate } from '../dates';
import { getSignedInClient } from '../supabase/server';
import { normalizeMileage } from '../units';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

type SupabaseServerClient = Awaited<ReturnType<typeof getSignedInClient>>['supabase'];

type CreateMaintenanceTaskInput = {
  motorcycleId: string;
  taskName: string;
  intervalMileage: number;
  intervalMonths: number;
  baselineOdometer: number;
  baselineDate: string;
  notes?: string;
};

export async function createMaintenanceTaskAction(
  input: CreateMaintenanceTaskInput
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const taskName = input.taskName.trim();
  const intervalMileage = normalizeMileage(input.intervalMileage) ?? 0;
  const intervalMonths = normalizeMileage(input.intervalMonths) ?? 0;
  const baselineOdometer = normalizeMileage(input.baselineOdometer);

  if (!input.motorcycleId) return { error: 'A motorcycle must be selected.' };
  if (!taskName) return { error: 'Task name is required.' };
  if (intervalMileage === 0 && intervalMonths === 0) {
    return { error: 'Enter a mileage interval, a time interval, or both.' };
  }
  if (baselineOdometer === null) return { error: 'Please enter a valid baseline odometer.' };
  if (!isIsoDate(input.baselineDate)) return { error: 'Please enter a valid baseline date.' };

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert({
      motorcycle_id: input.motorcycleId,
      user_id: user.id,
      task_name: taskName,
      interval_mileage: intervalMileage,
      interval_months: intervalMonths,
      last_performed_mileage: baselineOdometer,
      last_performed_date: input.baselineDate,
      notes: input.notes?.trim() || null,
      is_diy: true,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Unable to create task.' };
  return { data: { id: data.id as string } };
}

export async function updateTaskIntervalsAction(
  taskId: string,
  intervals: { intervalMileage: number; intervalMonths: number }
): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const intervalMileage = normalizeMileage(intervals.intervalMileage);
  const intervalMonths = normalizeMileage(intervals.intervalMonths);
  if (intervalMileage === null || intervalMonths === null) {
    return { error: 'Intervals must be whole, non-negative numbers.' };
  }

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .update({ interval_mileage: intervalMileage, interval_months: intervalMonths })
    .eq('id', taskId)
    .select('id');

  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Maintenance task not found.' };
  return {};
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  // Keep past service records; just detach them from the task being removed.
  const detach = await supabase.from('service_logs').update({ task_id: null }).eq('task_id', taskId);
  if (detach.error) return { error: detach.error.message };

  const { error } = await supabase.from('maintenance_tasks').delete().eq('id', taskId);
  if (error) return { error: error.message };
  return {};
}

type CompleteTaskActionInput = {
  motorcycleId: string;
  taskId: string | null;
  taskName: string;
  performedAt: string;
  odometerAtService: number;
  cost: number | null;
  notes: string | null;
};

/** Records a service log, and moves the task's "last performed" forward if this is its newest service. */
export async function completeTaskAction(input: CompleteTaskActionInput): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const taskName = input.taskName.trim();
  const odometer = normalizeMileage(input.odometerAtService);
  const cost = input.cost !== null && Number.isFinite(input.cost) && input.cost >= 0 ? input.cost : null;

  if (!input.motorcycleId) return { error: 'A motorcycle must be selected.' };
  if (!taskName) return { error: 'Task name is required.' };
  if (!isIsoDate(input.performedAt)) return { error: 'Please enter a valid date.' };
  if (odometer === null) return { error: 'Please enter a valid odometer reading.' };

  let task: { id: string; last_performed_date: string | null } | null = null;
  if (input.taskId) {
    const lookup = await supabase
      .from('maintenance_tasks')
      .select('id,last_performed_date')
      .eq('id', input.taskId)
      .eq('motorcycle_id', input.motorcycleId)
      .maybeSingle();

    if (lookup.error) return { error: lookup.error.message };
    if (!lookup.data) return { error: 'Maintenance task not found for this motorcycle.' };
    task = lookup.data;
  }

  const logInsert = await supabase.from('service_logs').insert({
    user_id: user.id,
    motorcycle_id: input.motorcycleId,
    task_id: task?.id ?? null,
    task_name: taskName,
    performed_at: input.performedAt,
    odometer_at_service: odometer,
    cost,
    notes: input.notes?.trim() || null,
  });
  if (logInsert.error) return { error: logInsert.error.message };

  // Back-filling an older service shouldn't rewind the task's schedule.
  const lastPerformed = task?.last_performed_date?.slice(0, 10) ?? '';
  if (task && input.performedAt >= lastPerformed) {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({ last_performed_mileage: odometer, last_performed_date: input.performedAt })
      .eq('id', task.id);
    if (error) return { error: error.message };
  }

  const bumpOdometer = await supabase
    .from('motorcycles')
    .update({ current_mileage: odometer })
    .eq('id', input.motorcycleId)
    .lt('current_mileage', odometer);
  if (bumpOdometer.error) return { error: bumpOdometer.error.message };

  return {};
}

/**
 * Deletes a service log. If that log is what the task's "last performed" came
 * from, the task falls back to its most recent remaining log.
 */
export async function deleteServiceLogAction(logId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const lookup = await supabase
    .from('service_logs')
    .select('id,task_id,performed_at,odometer_at_service')
    .eq('id', logId)
    .maybeSingle();
  if (lookup.error) return { error: lookup.error.message };
  if (!lookup.data) return { error: 'Service record not found.' };

  const { error } = await supabase.from('service_logs').delete().eq('id', logId);
  if (error) return { error: error.message };

  if (lookup.data.task_id) {
    return rewindTaskIfNeeded(supabase, lookup.data.task_id, lookup.data);
  }
  return {};
}

async function rewindTaskIfNeeded(
  supabase: SupabaseServerClient,
  taskId: string,
  deletedLog: { performed_at: string; odometer_at_service: number }
): Promise<ActionResult> {
  const taskLookup = await supabase
    .from('maintenance_tasks')
    .select('last_performed_date,last_performed_mileage')
    .eq('id', taskId)
    .maybeSingle();
  if (taskLookup.error) return { error: taskLookup.error.message };

  const task = taskLookup.data;
  const cameFromDeletedLog =
    task &&
    task.last_performed_date?.slice(0, 10) === deletedLog.performed_at.slice(0, 10) &&
    Number(task.last_performed_mileage) === Number(deletedLog.odometer_at_service);
  if (!cameFromDeletedLog) return {};

  const latest = await supabase
    .from('service_logs')
    .select('performed_at,odometer_at_service')
    .eq('task_id', taskId)
    .order('performed_at', { ascending: false })
    .order('odometer_at_service', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) return { error: latest.error.message };
  // With no older logs left there's nothing to fall back to, so keep the current baseline.
  if (!latest.data) return {};

  const { error } = await supabase
    .from('maintenance_tasks')
    .update({
      last_performed_mileage: latest.data.odometer_at_service,
      last_performed_date: latest.data.performed_at.slice(0, 10),
    })
    .eq('id', taskId);
  if (error) return { error: error.message };
  return {};
}

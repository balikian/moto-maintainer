'use server';

import { isFutureEverywhere, isIsoDate } from '../dates';
import { baselineFromLogs, fromNewBaseline, startTodayBaseline } from '../maintenance';
import { guessCategory, isTaskCategory, type TaskCategory } from '../taskCategories';
import { getSignedInClient } from '../supabase/server';
import { normalizeMileage } from '../units';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

type SupabaseServerClient = Awaited<ReturnType<typeof getSignedInClient>>['supabase'];

type CreateMaintenanceTaskInput = {
  motorcycleId: string;
  taskName: string;
  intervalMileage: number;
  intervalMonths: number;
  /** Null to count from the bike's current odometer. */
  baselineOdometer: number | null;
  baselineDate: string;
  notes?: string;
  /** Guessed from the name when not given. */
  category?: TaskCategory;
};

export async function createMaintenanceTaskAction(
  input: CreateMaintenanceTaskInput
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const taskName = input.taskName.trim();
  const intervalMileage = normalizeMileage(input.intervalMileage) ?? 0;
  const intervalMonths = normalizeMileage(input.intervalMonths) ?? 0;
  const typedOdometer = input.baselineOdometer === null ? null : normalizeMileage(input.baselineOdometer);

  if (!input.motorcycleId) return { error: 'A motorcycle must be selected.' };
  if (!taskName) return { error: 'Task name is required.' };
  if (intervalMileage === 0 && intervalMonths === 0) {
    return { error: 'Enter a mileage interval, a time interval, or both.' };
  }
  if (input.baselineOdometer !== null && typedOdometer === null) return { error: 'Please enter a valid odometer reading.' };
  if (!isIsoDate(input.baselineDate)) return { error: 'Please enter a valid date.' };
  if (isFutureEverywhere(input.baselineDate)) return { error: 'The date it was last done can’t be in the future.' };

  // Left blank, it counts from the bike's odometer (as Log service does).
  let baselineOdometer = typedOdometer;
  if (baselineOdometer === null) {
    const bike = await supabase.from('motorcycles').select('current_mileage').eq('id', input.motorcycleId).maybeSingle();
    if (bike.error) return { error: bike.error.message };
    baselineOdometer = (bike.data?.current_mileage as number | null | undefined) ?? null;
    if (baselineOdometer === null) {
      return { error: 'Enter the odometer when it was last done. Your bike doesn’t have a reading yet.' };
    }
  }

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
      category: isTaskCategory(input.category) ? input.category : guessCategory(taskName),
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Unable to create task.' };
  return { data: { id: data.id as string } };
}

export async function updateTaskIntervalsAction(
  taskId: string,
  intervals: { intervalMileage: number; intervalMonths: number; category?: TaskCategory }
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
    .update({
      interval_mileage: intervalMileage,
      interval_months: intervalMonths,
      ...(isTaskCategory(intervals.category) ? { category: intervals.category } : {}),
    })
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
  /** Null without a reading: the task's miles then count from the bike's odometer. */
  odometerAtService: number | null;
  cost: number | null;
  notes: string | null;
};

/** Records a service log, and moves the task's "last performed" forward if this is its newest service. */
export async function completeTaskAction(input: CompleteTaskActionInput): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const taskName = input.taskName.trim();
  const odometer = input.odometerAtService === null ? null : normalizeMileage(input.odometerAtService);
  const cost = input.cost !== null && Number.isFinite(input.cost) && input.cost >= 0 ? input.cost : null;

  if (!input.motorcycleId) return { error: 'A motorcycle must be selected.' };
  if (!taskName) return { error: 'Task name is required.' };
  if (!isIsoDate(input.performedAt)) return { error: 'Please enter a valid date.' };
  if (isFutureEverywhere(input.performedAt)) return { error: 'The service date can’t be in the future.' };
  if (input.odometerAtService !== null && odometer === null) return { error: 'Please enter a valid odometer reading.' };

  const bike = await supabase.from('motorcycles').select('current_mileage').eq('id', input.motorcycleId).maybeSingle();
  if (bike.error) return { error: bike.error.message };
  if (!bike.data) return { error: 'Motorcycle not found.' };
  // Without a reading, the task's miles count from the bike's odometer now.
  const taskMileage = odometer ?? (bike.data.current_mileage as number | null);
  if (taskMileage === null) return { error: 'Enter the odometer reading. Your bike doesn’t have one yet.' };

  let task: { id: string; last_performed_date: string | null } | null = null;
  let taskHasLogs = false;
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

    const logs = await supabase.from('service_logs').select('id', { count: 'exact', head: true }).eq('task_id', task.id);
    if (logs.error) return { error: logs.error.message };
    taskHasLogs = (logs.count ?? 0) > 0;
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

  // Back-filling an older service shouldn't rewind the task's schedule. But a
  // start point no service backs up ("start today", "from new") was only a
  // guess, so the task's first logged service replaces it, however old.
  const lastPerformed = task?.last_performed_date?.slice(0, 10) ?? '';
  if (task && (!taskHasLogs || input.performedAt >= lastPerformed)) {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({ last_performed_mileage: taskMileage, last_performed_date: input.performedAt })
      .eq('id', task.id);
    if (error) return { error: error.message };
  }

  if (odometer !== null) {
    const bumpOdometer = await supabase
      .from('motorcycles')
      .update({ current_mileage: odometer })
      .eq('id', input.motorcycleId)
      .or(`current_mileage.is.null,current_mileage.lt.${odometer}`);
    if (bumpOdometer.error) return { error: bumpOdometer.error.message };
  }

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
  deletedLog: { performed_at: string; odometer_at_service: number | null }
): Promise<ActionResult> {
  const taskLookup = await supabase
    .from('maintenance_tasks')
    .select('last_performed_date,last_performed_mileage,motorcycle_id')
    .eq('id', taskId)
    .maybeSingle();
  if (taskLookup.error) return { error: taskLookup.error.message };

  const task = taskLookup.data;
  // A log without a reading took the bike's odometer for the task's miles, so only its date can match.
  const cameFromDeletedLog =
    task &&
    task.last_performed_date?.slice(0, 10) === deletedLog.performed_at.slice(0, 10) &&
    (deletedLog.odometer_at_service === null ||
      Number(task.last_performed_mileage) === Number(deletedLog.odometer_at_service));
  if (!cameFromDeletedLog) return {};

  const remaining = await supabase.from('service_logs').select('performed_at,odometer_at_service').eq('task_id', taskId);
  if (remaining.error) return { error: remaining.error.message };

  const bike = await supabase.from('motorcycles').select('current_mileage').eq('id', task.motorcycle_id).maybeSingle();
  if (bike.error) return { error: bike.error.message };

  // With no logs left, the task has no start point again, and asks for one.
  const baseline = baselineFromLogs(remaining.data ?? [], (bike.data?.current_mileage as number | null) ?? null);
  const { error } = await supabase.from('maintenance_tasks').update(baseline).eq('id', taskId);
  if (error) return { error: error.message };
  return {};
}

/**
 * Gives tasks without a start point one: "today" counts from today at the
 * bike's current odometer, "new" from when the bike was new. Tasks that
 * already have a start point are left alone.
 */
export async function setTaskStartAction(input: {
  motorcycleId: string;
  taskIds: string[];
  start: 'today' | 'new';
  /** The rider's calendar day, so "today" matches their time zone. */
  today: string;
}): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  if (input.taskIds.length === 0) return {};
  if (input.start !== 'today' && input.start !== 'new') return { error: 'Choose when to start counting.' };
  if (!isIsoDate(input.today)) return { error: 'Please enter a valid date.' };

  const bike = await supabase.from('motorcycles').select('year,current_mileage').eq('id', input.motorcycleId).maybeSingle();
  if (bike.error) return { error: bike.error.message };
  if (!bike.data) return { error: 'Motorcycle not found.' };
  if (input.start === 'today' && bike.data.current_mileage === null) {
    return { error: 'Enter your odometer reading first, so there’s a starting point for the miles.' };
  }

  const baseline =
    input.start === 'new'
      ? fromNewBaseline(Number(bike.data.year))
      : startTodayBaseline(Number(bike.data.current_mileage), input.today);

  const { error } = await supabase
    .from('maintenance_tasks')
    .update(baseline)
    .eq('motorcycle_id', input.motorcycleId)
    .in('id', input.taskIds)
    .is('last_performed_mileage', null);
  if (error) return { error: error.message };
  return {};
}

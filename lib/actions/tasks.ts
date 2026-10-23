'use server';

import { isFutureEverywhere, isIsoDate } from '../dates';
import { baselineFromLogs, fromNewBaseline, logMileage, startTodayBaseline } from '../maintenance';
import { guessCategory, isTaskCategory, type TaskCategory } from '../taskCategories';
import { normalizeShop, SHOP_MAX_LENGTH } from '../serviceVisits';
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

type LogServiceActionInput = {
  motorcycleId: string;
  /** Checklist tasks done in this visit. */
  taskIds: string[];
  /** A job that isn't on the checklist, logged as a one-off. */
  oneOffName: string | null;
  performedAt: string;
  /** Null without a reading: the tasks' miles then count from the bike's odometer. */
  odometerAtService: number | null;
  /** The visit's cost and notes, saved on its first record. */
  cost: number | null;
  notes: string | null;
  /** Where it was done ("Home", a shop's name). */
  shop: string | null;
};

/** The most tasks one visit can log; a bike's whole checklist fits. */
const MAX_TASKS_PER_VISIT = 200;

/**
 * Records one service visit: a service record for each task done (and the
 * one-off job, if any), all with the same date, odometer and place. Each task's
 * "last performed" moves forward if this is its newest service.
 */
export async function logServiceAction(input: LogServiceActionInput): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const taskIds = [...new Set(input.taskIds)];
  const oneOffName = input.oneOffName?.trim() || null;
  const odometer = input.odometerAtService === null ? null : normalizeMileage(input.odometerAtService);
  const cost = input.cost !== null && Number.isFinite(input.cost) && input.cost >= 0 ? input.cost : null;

  if (!input.motorcycleId) return { error: 'A motorcycle must be selected.' };
  if (taskIds.length === 0 && !oneOffName) return { error: 'Choose what was done.' };
  if (taskIds.length > MAX_TASKS_PER_VISIT) return { error: 'That’s more tasks than one visit can hold.' };
  if (oneOffName && oneOffName.length > 200) return { error: 'Keep the description under 200 characters.' };
  if (input.shop && input.shop.trim().length > SHOP_MAX_LENGTH) {
    return { error: `Keep where it was done under ${SHOP_MAX_LENGTH} characters.` };
  }
  if (!isIsoDate(input.performedAt)) return { error: 'Please enter a valid date.' };
  if (isFutureEverywhere(input.performedAt)) return { error: 'The service date can’t be in the future.' };
  if (input.odometerAtService !== null && odometer === null) return { error: 'Please enter a valid odometer reading.' };

  const bike = await supabase.from('motorcycles').select('current_mileage').eq('id', input.motorcycleId).maybeSingle();
  if (bike.error) return { error: bike.error.message };
  if (!bike.data) return { error: 'Motorcycle not found.' };
  // Without a reading, the task's miles count from the bike's odometer now.
  const taskMileage = odometer ?? (bike.data.current_mileage as number | null);
  if (taskMileage === null) return { error: 'Enter the odometer reading. Your bike doesn’t have one yet.' };

  let tasks: { id: string; task_name: string; last_performed_date: string | null }[] = [];
  const tasksWithLogs = new Set<string>();
  if (taskIds.length > 0) {
    const lookup = await supabase
      .from('maintenance_tasks')
      .select('id,task_name,last_performed_date')
      .in('id', taskIds)
      .eq('motorcycle_id', input.motorcycleId);
    if (lookup.error) return { error: lookup.error.message };
    if ((lookup.data ?? []).length !== taskIds.length) return { error: 'Maintenance task not found for this motorcycle.' };
    // In the order the rider picked them, so the visit's cost lands on the first.
    const byId = new Map(lookup.data.map((task) => [task.id as string, task]));
    tasks = taskIds.map((id) => byId.get(id)!);

    const logs = await supabase.from('service_logs').select('task_id').in('task_id', taskIds);
    if (logs.error) return { error: logs.error.message };
    for (const log of logs.data ?? []) tasksWithLogs.add(log.task_id as string);
  }

  const shop = normalizeShop(input.shop);
  const entries = [
    ...tasks.map((task) => ({ taskId: task.id, taskName: task.task_name })),
    ...(oneOffName ? [{ taskId: null, taskName: oneOffName }] : []),
  ];
  const logInsert = await supabase.from('service_logs').insert(
    entries.map((entry, index) => ({
      user_id: user.id,
      motorcycle_id: input.motorcycleId,
      task_id: entry.taskId,
      task_name: entry.taskName,
      performed_at: input.performedAt,
      odometer_at_service: odometer,
      // What the task counts from, kept so deleting a newer service later can fall back to it exactly.
      baseline_mileage: taskMileage,
      shop,
      cost: index === 0 ? cost : null,
      notes: index === 0 ? input.notes?.trim() || null : null,
    }))
  );
  if (logInsert.error) return { error: logInsert.error.message };

  // Back-filling an older service shouldn't rewind the task's schedule. But a
  // start point no service backs up ("start today", "from new") was only a
  // guess, so the task's first logged service replaces it, however old.
  const moveForward = tasks
    .filter((task) => !tasksWithLogs.has(task.id) || input.performedAt >= (task.last_performed_date?.slice(0, 10) ?? ''))
    .map((task) => task.id);
  if (moveForward.length > 0) {
    const { error } = await supabase
      .from('maintenance_tasks')
      .update({ last_performed_mileage: taskMileage, last_performed_date: input.performedAt })
      .in('id', moveForward);
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
    .select('id,task_id,performed_at,odometer_at_service,baseline_mileage')
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
  deletedLog: { performed_at: string; odometer_at_service: number | null; baseline_mileage: number | null }
): Promise<ActionResult> {
  const taskLookup = await supabase
    .from('maintenance_tasks')
    .select('last_performed_date,last_performed_mileage,motorcycle_id')
    .eq('id', taskId)
    .maybeSingle();
  if (taskLookup.error) return { error: taskLookup.error.message };

  const task = taskLookup.data;
  // An older record without a reading saved no mileage, so only its date can match.
  const deletedMileage = logMileage(deletedLog);
  const cameFromDeletedLog =
    task &&
    task.last_performed_date?.slice(0, 10) === deletedLog.performed_at.slice(0, 10) &&
    (deletedMileage === null || Number(task.last_performed_mileage) === Number(deletedMileage));
  if (!cameFromDeletedLog) return {};

  const remaining = await supabase
    .from('service_logs')
    .select('performed_at,odometer_at_service,baseline_mileage')
    .eq('task_id', taskId);
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

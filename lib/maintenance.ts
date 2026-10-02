import { addMonths, daysBetween, parseIsoDate } from './dates';
import type { MaintenanceTask, ModelSchedule } from './types';
import { fromDisplayDistance } from './units';

export type TaskDefaults = Pick<MaintenanceTask, 'task_name' | 'interval_mileage' | 'interval_months' | 'is_diy'>;

/** Used for bikes that don't have a manufacturer schedule in model_schedules yet. */
export const GENERIC_MAINTENANCE_TASKS: TaskDefaults[] = [
  { task_name: 'Engine Oil & Filter', interval_mileage: 5000, interval_months: 12, is_diy: true },
  { task_name: 'Chain Clean & Tension', interval_mileage: 500, interval_months: 1, is_diy: true },
  { task_name: 'Valve Clearance Check', interval_mileage: 15000, interval_months: 24, is_diy: false },
];

/**
 * The tasks a bike starts with: its manufacturer schedule (converted to miles)
 * if there is one, otherwise the generic defaults.
 */
export function getDefaultTasks(schedule: Pick<ModelSchedule, 'model_schedule_tasks'> | null): TaskDefaults[] {
  const tasks = schedule?.model_schedule_tasks ?? [];
  if (tasks.length === 0) return GENERIC_MAINTENANCE_TASKS;

  return [...tasks]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((task) => ({
      task_name: task.task_name,
      interval_mileage: Math.round(fromDisplayDistance(task.interval_distance, task.distance_unit === 'km' ? 'metric' : 'imperial')),
      interval_months: task.interval_months,
      is_diy: task.is_diy,
    }));
}

export type TaskBaseline = Pick<MaintenanceTask, 'last_performed_mileage' | 'last_performed_date'>;

/**
 * Where a task's countdown starts before any service is logged for it: we
 * assume the work hasn't been done since the bike was new, so it counts from
 * 0 miles and the start of the model year.
 */
export function fromNewBaseline(bikeYear: number): TaskBaseline {
  return { last_performed_mileage: 0, last_performed_date: `${String(bikeYear).padStart(4, '0')}-01-01` };
}

/** The most recent of these service logs as a task's baseline, or from new if there are none. */
export function baselineFromLogs(
  logs: { performed_at: string; odometer_at_service: number }[],
  bikeYear: number
): TaskBaseline {
  const latest = [...logs].sort(
    (a, b) => b.performed_at.slice(0, 10).localeCompare(a.performed_at.slice(0, 10)) || b.odometer_at_service - a.odometer_at_service
  )[0];
  return latest
    ? { last_performed_mileage: Number(latest.odometer_at_service), last_performed_date: latest.performed_at.slice(0, 10) }
    : fromNewBaseline(bikeYear);
}

/**
 * Whether a bike's checklist already uses this schedule: true if any task has
 * the same name as one of the schedule's. A bike still on the generic
 * defaults shares none, so the rider can be offered the schedule.
 */
export function scheduleOverlapsTasks(
  schedule: Pick<ModelSchedule, 'model_schedule_tasks'>,
  tasks: Pick<MaintenanceTask, 'task_name'>[]
): boolean {
  const key = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
  const names = new Set(tasks.map((task) => key(task.task_name)));
  return schedule.model_schedule_tasks.some((task) => names.has(key(task.task_name)));
}

/** The default interval for one task by name, used by "Reset to default". */
export function findDefaultTask(
  schedule: Pick<ModelSchedule, 'model_schedule_tasks'> | null,
  taskName: string
): TaskDefaults | null {
  const name = taskName.trim().toLowerCase();
  const matches = (task: TaskDefaults) => task.task_name.toLowerCase() === name;
  return getDefaultTasks(schedule).find(matches) ?? GENERIC_MAINTENANCE_TASKS.find(matches) ?? null;
}

export type TaskStatus = 'Healthy' | 'Soon' | 'Urgent' | 'Overdue';

export type TaskDueState = {
  status: TaskStatus;
  /** Which interval is closest to (or furthest past) due; null if the task has neither. */
  trigger: 'mileage' | 'time' | null;
  milesRemaining: number | null;
  daysRemaining: number | null;
  /** Share of the closest interval still left: 1 = just serviced, 0 = due now, negative = overdue. */
  fractionRemaining: number | null;
};

// Fraction of the interval left at which a task turns "Soon" / "Urgent".
const SOON_FRACTION = 0.25;
const URGENT_FRACTION = 0.1;

/**
 * Works out whether a task is due, using whichever of its mileage and time
 * intervals comes first. Each interval is compared as the fraction of it still
 * remaining, so "10% of 12 months left" and "10% of 5,000 miles left" rank
 * the same. A negative fraction means that interval is already past due.
 */
export function getTaskDueState(
  task: Pick<MaintenanceTask, 'interval_mileage' | 'interval_months' | 'last_performed_mileage' | 'last_performed_date'>,
  currentMileage: number,
  today: Date
): TaskDueState {
  let milesRemaining: number | null = null;
  let milesFraction = Number.POSITIVE_INFINITY;
  if (task.interval_mileage > 0) {
    milesRemaining = task.interval_mileage - (currentMileage - task.last_performed_mileage);
    milesFraction = milesRemaining / task.interval_mileage;
  }

  let daysRemaining: number | null = null;
  let daysFraction = Number.POSITIVE_INFINITY;
  const lastPerformed = parseIsoDate(task.last_performed_date);
  if (task.interval_months > 0 && lastPerformed) {
    const dueDate = addMonths(lastPerformed, task.interval_months);
    daysRemaining = daysBetween(today, dueDate);
    daysFraction = daysRemaining / daysBetween(lastPerformed, dueDate);
  }

  if (milesRemaining === null && daysRemaining === null) {
    return { status: 'Healthy', trigger: null, milesRemaining, daysRemaining, fractionRemaining: null };
  }

  const trigger = daysFraction < milesFraction ? 'time' : 'mileage';
  const fraction = Math.min(milesFraction, daysFraction);
  const status: TaskStatus =
    fraction < 0 ? 'Overdue'
    : fraction <= URGENT_FRACTION ? 'Urgent'
    : fraction <= SOON_FRACTION ? 'Soon'
    : 'Healthy';

  return { status, trigger, milesRemaining, daysRemaining, fractionRemaining: fraction };
}

const STATUS_RANK: Record<TaskStatus, number> = { Overdue: 0, Urgent: 1, Soon: 2, Healthy: 3 };

/**
 * Splits a bike's tasks into the ones that need attention (overdue, urgent,
 * or soon) and the healthy ones, each sorted most-due first: by status, then
 * by the share of the interval left. Tasks without intervals go last.
 */
export function groupTasksByUrgency<T extends Parameters<typeof getTaskDueState>[0] & { task_name: string }>(
  tasks: T[],
  currentMileage: number,
  today: Date
): { needsAttention: { task: T; dueState: TaskDueState }[]; healthy: { task: T; dueState: TaskDueState }[] } {
  const sorted = tasks
    .map((task) => ({ task, dueState: getTaskDueState(task, currentMileage, today) }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.dueState.status] - STATUS_RANK[b.dueState.status] ||
        (a.dueState.fractionRemaining ?? Number.POSITIVE_INFINITY) - (b.dueState.fractionRemaining ?? Number.POSITIVE_INFINITY) ||
        a.task.task_name.localeCompare(b.task.task_name)
    );

  return {
    needsAttention: sorted.filter((entry) => entry.dueState.status !== 'Healthy'),
    healthy: sorted.filter((entry) => entry.dueState.status === 'Healthy'),
  };
}

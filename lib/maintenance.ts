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

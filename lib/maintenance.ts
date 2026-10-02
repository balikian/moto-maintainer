import { addMonths, daysBetween, parseIsoDate } from './dates';
import type { MaintenanceTask, ModelSchedule } from './types';
import { fromDisplayDistance } from './units';

export type TaskDefaults = Pick<MaintenanceTask, 'task_name' | 'interval_mileage' | 'interval_months' | 'is_diy'>;

export type FinalDrive = 'chain' | 'belt' | 'shaft';
export type Cooling = 'liquid' | 'air';
/** What decides which generic tasks a bike needs. Asked when a bike is added. */
export type BikeSetup = { finalDrive: FinalDrive; cooling: Cooling };

export const DEFAULT_BIKE_SETUP: BikeSetup = { finalDrive: 'chain', cooling: 'liquid' };

type GenericTask = TaskDefaults & { only?: Partial<BikeSetup> };

/**
 * Starter tasks for bikes without a manufacturer schedule yet. Intervals are
 * on the cautious side of what most owner's manuals list; riders can edit
 * them, and importing the real schedule replaces the ones never logged.
 */
const GENERIC_TASKS: GenericTask[] = [
  { task_name: 'Replace engine oil and filter', interval_mileage: 4000, interval_months: 12, is_diy: true },
  { task_name: 'Check tire pressure and tread', interval_mileage: 0, interval_months: 1, is_diy: true },
  { task_name: 'Check brake pads and discs', interval_mileage: 4000, interval_months: 12, is_diy: true },
  { task_name: 'Replace brake fluid', interval_mileage: 0, interval_months: 24, is_diy: true },
  { task_name: 'Lubricate and adjust cables and controls', interval_mileage: 4000, interval_months: 12, is_diy: true },
  { task_name: 'Check battery and terminals', interval_mileage: 0, interval_months: 12, is_diy: true },
  { task_name: 'Replace air filter', interval_mileage: 8000, interval_months: 24, is_diy: true },
  { task_name: 'Replace spark plugs', interval_mileage: 12000, interval_months: 0, is_diy: true },
  { task_name: 'Check steering and wheel bearings', interval_mileage: 8000, interval_months: 24, is_diy: true },
  { task_name: 'Check valve clearance', interval_mileage: 15000, interval_months: 0, is_diy: false },
  { task_name: 'Clean, lube and adjust chain', interval_mileage: 500, interval_months: 1, is_diy: true, only: { finalDrive: 'chain' } },
  { task_name: 'Check drive belt', interval_mileage: 5000, interval_months: 12, is_diy: true, only: { finalDrive: 'belt' } },
  { task_name: 'Replace final drive oil', interval_mileage: 12000, interval_months: 24, is_diy: true, only: { finalDrive: 'shaft' } },
  { task_name: 'Replace coolant', interval_mileage: 0, interval_months: 24, is_diy: true, only: { cooling: 'liquid' } },
];

/** The starter tasks from before the list was expanded, still on older bikes' checklists. */
const LEGACY_GENERIC_TASKS: TaskDefaults[] = [
  { task_name: 'Engine Oil & Filter', interval_mileage: 5000, interval_months: 12, is_diy: true },
  { task_name: 'Chain Clean & Tension', interval_mileage: 500, interval_months: 1, is_diy: true },
  { task_name: 'Valve Clearance Check', interval_mileage: 15000, interval_months: 24, is_diy: false },
];

const toDefaults = ({ task_name, interval_mileage, interval_months, is_diy }: GenericTask): TaskDefaults => ({
  task_name,
  interval_mileage,
  interval_months,
  is_diy,
});

/** The generic starter tasks that apply to a bike with this drive and cooling. */
export function genericTasksFor(setup: BikeSetup): TaskDefaults[] {
  return GENERIC_TASKS.filter(
    ({ only }) =>
      (!only?.finalDrive || only.finalDrive === setup.finalDrive) && (!only?.cooling || only.cooling === setup.cooling)
  ).map(toDefaults);
}

/** Every generic task, whatever the bike's setup, plus the older ones. Used to recognise them by name. */
const ALL_GENERIC_TASKS: TaskDefaults[] = [...GENERIC_TASKS.map(toDefaults), ...LEGACY_GENERIC_TASKS];

const nameKey = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
const GENERIC_NAMES = new Set(ALL_GENERIC_TASKS.map((task) => nameKey(task.task_name)));

/** True for a generic starter task (current or older), as opposed to a manufacturer's or rider's task. */
export function isGenericTaskName(name: string): boolean {
  return GENERIC_NAMES.has(nameKey(name));
}

/**
 * The tasks a bike starts with: its manufacturer schedule (converted to miles)
 * if there is one, otherwise the generic tasks for its setup.
 */
export function getDefaultTasks(
  schedule: Pick<ModelSchedule, 'model_schedule_tasks'> | null,
  setup: BikeSetup = DEFAULT_BIKE_SETUP
): TaskDefaults[] {
  const tasks = schedule?.model_schedule_tasks ?? [];
  if (tasks.length === 0) return genericTasksFor(setup);

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
 * the same name as one of the schedule's, other than a generic name. A bike
 * still on the generic tasks shares none, so the rider can be offered it.
 */
export function scheduleOverlapsTasks(
  schedule: Pick<ModelSchedule, 'model_schedule_tasks'>,
  tasks: Pick<MaintenanceTask, 'task_name'>[]
): boolean {
  // Generic names like "Replace coolant" can match a manufacturer's task word for word, so they don't count.
  const names = new Set(tasks.map((task) => nameKey(task.task_name)));
  return schedule.model_schedule_tasks.some((task) => names.has(nameKey(task.task_name)) && !GENERIC_NAMES.has(nameKey(task.task_name)));
}

/** The default interval for one task by name, used by "Reset to default". */
export function findDefaultTask(
  schedule: Pick<ModelSchedule, 'model_schedule_tasks'> | null,
  taskName: string
): TaskDefaults | null {
  const name = nameKey(taskName);
  const matches = (task: TaskDefaults) => nameKey(task.task_name) === name;
  const fromSchedule = schedule?.model_schedule_tasks.length ? getDefaultTasks(schedule).find(matches) : undefined;
  return fromSchedule ?? ALL_GENERIC_TASKS.find(matches) ?? null;
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

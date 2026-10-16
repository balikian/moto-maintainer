import { daysBetween, parseIsoDate, toIsoDate } from './dates';
import { getTaskDueState, groupTasksByUrgency, type TaskDueState } from './maintenance';
import type { MaintenanceTask, UnitSystem } from './types';

// What the daily reminder job sends each rider. Pure: the job (lib/reminderJob.ts)
// feeds in what `reminder_job_data` returns and sends what comes out.
//
// Every reminder has a key, recorded in `notifications_sent` once sent, so it
// goes only once:
// - a task's "soon" and "overdue" emails, once each per service cycle (the
//   key includes the task's baseline, so logging service starts a new cycle);
// - a bike's odometer check-in, every 30 days the reading stays unchanged;
// - the monthly summary, once per month.

export type ReminderTask = Pick<
  MaintenanceTask,
  'id' | 'task_name' | 'interval_mileage' | 'interval_months' | 'last_performed_mileage' | 'last_performed_date'
>;

export type ReminderBike = {
  id: string;
  year: number;
  make: string;
  model: string;
  current_mileage: number;
  /** Timestamp of the last odometer entry or confirmation. */
  odometer_updated_at: string;
  tasks: ReminderTask[];
  /** Services and spending in the summary's month; null outside the monthly window. */
  spent: { services: number; total: number } | null;
};

export type ReminderRider = {
  user_id: string;
  email: string;
  email_token: string;
  unit_system: UnitSystem;
  task_reminders: boolean;
  odometer_reminders: boolean;
  monthly_summary: boolean;
  /** Keys of reminders already sent. */
  sent: string[];
  bikes: ReminderBike[];
};

export type TaskReminder = {
  key: string;
  kind: 'soon' | 'overdue';
  bike: ReminderBike;
  task: ReminderTask;
  dueState: TaskDueState;
};

export type OdometerReminder = { key: string; bike: ReminderBike; daysSince: number };

/** The daily email: tasks that just turned Soon/Urgent or Overdue, and stale odometers. */
export type DailyReminders = { tasks: TaskReminder[]; odometer: OdometerReminder[] };

export type MonthlySummaryBike = {
  bike: ReminderBike;
  services: number;
  spent: number;
  needsAttention: { task: ReminderTask; dueState: TaskDueState }[];
};

export type MonthlySummary = {
  key: string;
  /** The month summarized, "YYYY-MM". */
  month: string;
  bikes: MonthlySummaryBike[];
};

/** Days without an odometer update before the check-in, and between repeats. */
export const ODOMETER_CHECK_IN_DAYS = 30;

/** The monthly summary goes out on one of the month's first days (a missed run catches up). */
const MONTHLY_SUMMARY_LAST_DAY = 3;

function taskKey(task: ReminderTask, kind: TaskReminder['kind']): string {
  const baseline = `${task.last_performed_date ?? ''}@${task.last_performed_mileage}`;
  return `task:${task.id}:${baseline}:${kind}`;
}

/** The new task and odometer reminders for one rider today, or null if there are none. */
export function planDailyReminders(rider: ReminderRider, today: Date): DailyReminders | null {
  const sent = new Set(rider.sent);
  const tasks: TaskReminder[] = [];
  const odometer: OdometerReminder[] = [];

  for (const bike of rider.bikes) {
    if (rider.task_reminders) {
      for (const task of bike.tasks) {
        const dueState = getTaskDueState(task, bike.current_mileage, today);
        if (dueState.status === 'Healthy') continue;
        const kind = dueState.status === 'Overdue' ? 'overdue' : 'soon';
        const key = taskKey(task, kind);
        if (!sent.has(key)) tasks.push({ key, kind, bike, task, dueState });
      }
    }

    if (rider.odometer_reminders) {
      const updated = parseIsoDate(bike.odometer_updated_at);
      const daysSince = updated ? daysBetween(updated, today) : 0;
      const period = Math.floor(daysSince / ODOMETER_CHECK_IN_DAYS);
      const key = `odometer:${bike.id}:${bike.odometer_updated_at}:${period}`;
      if (period >= 1 && !sent.has(key)) odometer.push({ key, bike, daysSince });
    }
  }

  // Overdue first, then most due.
  tasks.sort(
    (a, b) =>
      Number(b.kind === 'overdue') - Number(a.kind === 'overdue') ||
      (a.dueState.fractionRemaining ?? 0) - (b.dueState.fractionRemaining ?? 0)
  );
  return tasks.length > 0 || odometer.length > 0 ? { tasks, odometer } : null;
}

/** The first day of last month and of this month, for `reminder_job_data`'s spending window. */
export function lastMonthRange(today: Date): { from: string; to: string; month: string } {
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { from: toIsoDate(lastMonth), to: toIsoDate(thisMonth), month: toIsoDate(lastMonth).slice(0, 7) };
}

/** Whether today is in the window when monthly summaries go out. */
export function isMonthlySummaryDay(today: Date): boolean {
  return today.getDate() <= MONTHLY_SUMMARY_LAST_DAY;
}

/** Last month's summary for one rider, or null if it isn't due, is off, or was sent. */
export function planMonthlySummary(rider: ReminderRider, today: Date): MonthlySummary | null {
  if (!rider.monthly_summary || !isMonthlySummaryDay(today) || rider.bikes.length === 0) return null;
  const { month } = lastMonthRange(today);
  const key = `monthly:${month}`;
  if (rider.sent.includes(key)) return null;

  return {
    key,
    month,
    bikes: rider.bikes.map((bike) => ({
      bike,
      services: bike.spent?.services ?? 0,
      spent: Number(bike.spent?.total ?? 0),
      needsAttention: groupTasksByUrgency(bike.tasks, bike.current_mileage, today).needsAttention,
    })),
  };
}

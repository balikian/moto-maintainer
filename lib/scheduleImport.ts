import { baselineFromLogs, isGenericTaskName, type TaskBaseline, type TaskDefaults } from './maintenance';
import { MAX_IMPORT_PAGES } from './pageRanges';
import type { ExtractedTask } from './scheduleExtraction';

// Pure helpers for the manual-schedule import, kept apart from the server
// actions and the Claude call so they can be unit tested.

/** Stays under the 10 MB server-action body limit in next.config.ts. */
export const MAX_UPLOAD_BYTES = 9 * 1024 * 1024;

/** Most tasks we keep from one extraction. */
export const MAX_EXTRACTED_TASKS = 80;

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Checks the uploaded page images. Returns an error message, or null if they're fine. */
export function validatePageImages(pages: Uint8Array[]): string | null {
  if (pages.length === 0) return 'No pages were uploaded.';
  if (pages.length > MAX_IMPORT_PAGES) return `Please send at most ${MAX_IMPORT_PAGES} pages.`;
  if (pages.reduce((total, page) => total + page.length, 0) > MAX_UPLOAD_BYTES) {
    return 'Those pages are too large to send. Try fewer pages.';
  }
  if (!pages.every(isJpeg)) return 'The uploaded pages weren’t valid images.';
  return null;
}

/** Trims names, rounds numbers, and drops empty or nonsensical rows. */
export function cleanTasks(tasks: ExtractedTask[]): ExtractedTask[] {
  return tasks
    .map((task) => ({
      task_name: task.task_name.replace(/\s+/g, ' ').trim().slice(0, 120),
      interval_distance: Number.isFinite(task.interval_distance) ? Math.max(0, Math.round(task.interval_distance)) : 0,
      distance_unit: task.distance_unit,
      interval_months: Number.isFinite(task.interval_months) ? Math.max(0, Math.round(task.interval_months)) : 0,
      is_diy: task.is_diy,
    }))
    .filter((task) => task.task_name && (task.interval_distance > 0 || task.interval_months > 0))
    .slice(0, MAX_EXTRACTED_TASKS);
}

/** How task names are compared: ignoring case and extra spaces. */
export const nameKey = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();

type LogForApply = { id: string; task_id: string | null; task_name: string; performed_at: string; odometer_at_service: number };

export type ScheduleApplyPlan = {
  updates: (Omit<TaskDefaults, 'task_name'> & { id: string })[];
  /** New tasks, counted from their latest matching service log or else from new. */
  additions: (TaskDefaults & TaskBaseline & { relinkLogIds: string[] })[];
  /** Ids of generic starter tasks to delete: not in the schedule and never logged. */
  removals: string[];
};

/**
 * Works out how to bring a bike's checklist in line with its schedule: tasks
 * with the same name (ignoring case and spacing) get the schedule's intervals,
 * missing ones are added, and the rider's own tasks are kept. If the schedule
 * lists a name twice, the first one wins.
 *
 * A task that was deleted and comes back picks up where its service records
 * left off: service logs with its name that aren't tied to a task set its
 * baseline and get linked to it again.
 *
 * Generic starter tasks the schedule doesn't keep are removed if no service
 * was ever logged for them; logged ones and the rider's own tasks stay.
 */
export function planScheduleApply(
  scheduleTasks: TaskDefaults[],
  existingTasks: { id: string; task_name: string }[],
  { bikeYear, logs }: { bikeYear: number; logs: LogForApply[] }
): ScheduleApplyPlan {
  const orphanLogsByName = new Map<string, LogForApply[]>();
  for (const log of logs) {
    if (log.task_id) continue;
    const key = nameKey(log.task_name);
    orphanLogsByName.set(key, [...(orphanLogsByName.get(key) ?? []), log]);
  }

  const existingByName = new Map<string, string>();
  for (const task of existingTasks) {
    const key = nameKey(task.task_name);
    if (!existingByName.has(key)) existingByName.set(key, task.id);
  }

  const plan: ScheduleApplyPlan = { updates: [], additions: [], removals: [] };
  const seen = new Set<string>();
  for (const task of scheduleTasks) {
    const key = nameKey(task.task_name);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const existingId = existingByName.get(key);
    const { task_name, ...intervals } = task;
    if (existingId) plan.updates.push({ id: existingId, ...intervals });
    else {
      const matchingLogs = orphanLogsByName.get(key) ?? [];
      plan.additions.push({
        ...intervals,
        task_name: task_name.trim(),
        ...baselineFromLogs(matchingLogs, bikeYear),
        relinkLogIds: matchingLogs.map((log) => log.id),
      });
    }
  }

  // Generic starter tasks the schedule replaces: not in the schedule and never logged.
  const loggedTaskIds = new Set(logs.flatMap((log) => (log.task_id ? [log.task_id] : [])));
  plan.removals = existingTasks
    .filter((task) => isGenericTaskName(task.task_name) && !seen.has(nameKey(task.task_name)) && !loggedTaskIds.has(task.id))
    .map((task) => task.id);
  return plan;
}

/** e.g. "3 updated, 30 added, 9 starter tasks removed", for the rider after Apply. */
export function applySummary({ updated, added, removed }: { updated: number; added: number; removed: number }): string {
  const parts = [`${updated} updated`, `${added} added`];
  if (removed > 0) parts.push(`${removed} starter task${removed === 1 ? '' : 's'} removed`);
  return parts.join(', ');
}

import { z } from 'zod';
import { isIsoDate } from './dates';
import { normalizeShop, SHOP_MAX_LENGTH } from './serviceVisits';
import { guessCategory, TASK_CATEGORIES, type TaskCategory } from './taskCategories';

// Reading a "Download my data" file (lib/accountExport.ts) back in. The file
// is untrusted: anyone can edit one or write it by hand, so every field is
// checked here, on the server as well as for the browser's preview. Ids and
// emails in the file are never used; imported bikes are always new rows owned
// by whoever imports them.

export const IMPORT_LIMITS = {
  /** Checked before parsing, in the browser and on the server. */
  fileChars: 5_000_000,
  bikes: 50,
  tasksPerBike: 200,
  logsPerBike: 2_000,
};

const SUPPORTED_FORMAT_VERSION = 1;
const EARLIEST_YEAR = 1885;
const MAX_MILES = 10_000_000;
// service_logs.cost is numeric(10,2).
const MAX_COST = 99_999_999.99;

const requiredText = (max: number) => z.string().trim().min(1, 'is empty').max(max, `is longer than ${max} characters`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `is longer than ${max} characters`)
    .nullish()
    .transform((value) => value || null);
const miles = z.number().min(0, "can't be negative").max(MAX_MILES, 'is too large').transform(Math.round);
const isoDate = z.string().refine(isIsoDate, 'is not a calendar date (YYYY-MM-DD)');

const taskSchema = z.object({
  name: requiredText(200),
  category: z.string().nullish(),
  every_miles: miles.nullish(),
  every_months: z.number().int('must be whole months').min(0).max(1200).nullish(),
  last_done_miles: miles.nullish(),
  last_done_on: isoDate.nullish(),
  do_it_yourself: z.boolean().nullish(),
  notes: optionalText(2000),
});

const logSchema = z.object({
  date: isoDate,
  service: requiredText(200),
  type: z.string().nullish(),
  odometer_miles: miles.nullish(),
  where: optionalText(SHOP_MAX_LENGTH),
  cost: z.number().min(0, "can't be negative").max(MAX_COST, 'is too large').nullish(),
  notes: optionalText(2000),
});

const bikeSchema = (maxYear: number) =>
  z.object({
    year: z.number().int('must be a whole year').min(EARLIEST_YEAR, 'is too early').max(maxYear, 'is in the future'),
    make: requiredText(100),
    model: requiredText(100),
    odometer_miles: miles.nullish(),
    maintenance_tasks: z.array(taskSchema).max(IMPORT_LIMITS.tasksPerBike, `has more than ${IMPORT_LIMITS.tasksPerBike} tasks`).default([]),
    service_history: z.array(logSchema).max(IMPORT_LIMITS.logsPerBike, `has more than ${IMPORT_LIMITS.logsPerBike} service records`).default([]),
  });

const fileSchema = (maxYear: number) =>
  z.object({
    exported_on: isoDate.nullish(),
    bikes: z.array(bikeSchema(maxYear)).min(1, 'has no bikes').max(IMPORT_LIMITS.bikes, `has more than ${IMPORT_LIMITS.bikes} bikes`),
  });

export type ImportTask = {
  taskName: string;
  category: TaskCategory;
  intervalMiles: number;
  intervalMonths: number;
  lastPerformedMiles: number | null;
  lastPerformedDate: string | null;
  isDiy: boolean;
  notes: string | null;
};

export type ImportLog = {
  taskName: string;
  /** Routine services are linked to the bike's task with the same name, if there is one. */
  routine: boolean;
  performedAt: string;
  /** Null when there was no reading. */
  odometerMiles: number | null;
  /** Where it was done; older files don't have it. */
  shop: string | null;
  cost: number | null;
  notes: string | null;
};

export type ImportBike = {
  year: number;
  make: string;
  model: string;
  /** Null when there was no reading. */
  odometerMiles: number | null;
  tasks: ImportTask[];
  logs: ImportLog[];
};

export type AccountImport = {
  exportedOn: string | null;
  bikes: ImportBike[];
};

/** A category from the file, which holds labels ("Wheels & tires"); unknown ones are guessed from the task's name. */
function categoryFromFile(value: string | null | undefined, taskName: string): TaskCategory {
  const wanted = value?.trim().toLowerCase();
  const match = TASK_CATEGORIES.find((category) => category.label.toLowerCase() === wanted || category.id === wanted);
  return match?.id ?? guessCategory(taskName);
}

/** "bikes.0.service_history.3.cost" → "Bike 1, service record 4, cost" */
function describePath(path: PropertyKey[]): string {
  const names: Record<string, string> = { bikes: 'Bike', maintenance_tasks: 'task', service_history: 'service record' };
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = String(path[i]);
    const next = path[i + 1];
    if (names[key] && typeof next === 'number') {
      parts.push(`${names[key]} ${next + 1}`);
      i++;
    } else {
      parts.push(names[key] ?? key.replace(/_/g, ' '));
    }
  }
  return parts.join(', ');
}

/**
 * Checks a parsed data file and turns it into rows ready to save. `today` is
 * "YYYY-MM-DD", for the latest allowed model year.
 */
export function parseAccountImport(raw: unknown, today: string): { data: AccountImport } | { error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as { app?: unknown }).app !== 'SwingArm') {
    return { error: 'This isn’t a SwingArm data file. Use the file from Download my data.' };
  }
  const version = (raw as { format_version?: unknown }).format_version;
  if (typeof version === 'number' && version > SUPPORTED_FORMAT_VERSION) {
    return { error: 'This file is from a newer version of SwingArm. Reload the page and try again.' };
  }
  if (version !== SUPPORTED_FORMAT_VERSION) {
    return { error: 'This file’s format isn’t one SwingArm can read.' };
  }

  const maxYear = Number(today.slice(0, 4)) + 2;
  const parsed = fileSchema(maxYear).safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = describePath(issue.path);
    return { error: `This file has a problem${where ? ` (${where})` : ''}: ${issue.message}.` };
  }

  return {
    data: {
      exportedOn: parsed.data.exported_on ?? null,
      bikes: parsed.data.bikes.map((bike) => ({
        year: bike.year,
        make: bike.make,
        model: bike.model,
        odometerMiles: bike.odometer_miles ?? null,
        tasks: bike.maintenance_tasks.map((task) => ({
          taskName: task.name,
          category: categoryFromFile(task.category, task.name),
          intervalMiles: task.every_miles ?? 0,
          intervalMonths: task.every_months ?? 0,
          // No miles in the file means the task had no start point yet.
          lastPerformedMiles: task.last_done_miles ?? null,
          lastPerformedDate: task.last_done_miles == null ? null : (task.last_done_on ?? null),
          isDiy: task.do_it_yourself ?? true,
          notes: task.notes,
        })),
        logs: bike.service_history.map((log) => ({
          taskName: log.service,
          routine: log.type?.trim().toLowerCase() === 'routine',
          performedAt: log.date,
          odometerMiles: log.odometer_miles ?? null,
          shop: normalizeShop(log.where),
          cost: log.cost ?? null,
          notes: log.notes,
        })),
      })),
    },
  };
}

/** Reads the file's text as JSON, then checks it. */
export function parseAccountImportText(text: string, today: string): { data: AccountImport } | { error: string } {
  if (text.length > IMPORT_LIMITS.fileChars) return { error: 'This file is too large to be a SwingArm data file.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'This file isn’t readable JSON. Use the file from Download my data.' };
  }
  return parseAccountImport(raw, today);
}

const bikeKey = (bike: { year: number; make: string; model: string }) =>
  `${bike.year}|${bike.make.trim().toLowerCase()}|${bike.model.trim().toLowerCase()}`;

/** For each bike in the file: is a bike with the same year, make and model already in the garage? */
export function findDuplicateBikes(
  bikes: Pick<ImportBike, 'year' | 'make' | 'model'>[],
  garage: { year: number; make: string; model: string }[]
): boolean[] {
  const existing = new Set(garage.map(bikeKey));
  return bikes.map((bike) => existing.has(bikeKey(bike)));
}

/** The task a routine service belongs to, matched by name (case-insensitive), or null for a one-off. */
export function taskIdForLog(log: Pick<ImportLog, 'taskName' | 'routine'>, taskIds: Map<string, string>): string | null {
  return log.routine ? (taskIds.get(log.taskName.trim().toLowerCase()) ?? null) : null;
}

/** Name → id for a bike's newly created tasks; the first task wins if two share a name. */
export function taskIdsByName(tasks: { id: string; task_name: string }[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const task of tasks) {
    const key = task.task_name.trim().toLowerCase();
    if (!ids.has(key)) ids.set(key, task.id);
  }
  return ids;
}

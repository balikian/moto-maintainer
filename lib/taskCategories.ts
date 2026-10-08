// Task categories, so related jobs can be done in one go: if you're bleeding
// the front brake anyway, the rear brake fluid that's due next month should
// come up too. Keep this list in sync with the check constraint in
// supabase/migrations/20261008000000_task_categories.sql.

export const TASK_CATEGORIES = [
  { id: 'engine', label: 'Engine' },
  { id: 'brakes', label: 'Brakes' },
  { id: 'drivetrain', label: 'Drivetrain' },
  { id: 'wheels', label: 'Wheels & tires' },
  { id: 'suspension', label: 'Suspension & steering' },
  { id: 'cooling', label: 'Cooling' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'controls', label: 'Controls & cables' },
  { id: 'other', label: 'Other' },
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number]['id'];

export const TASK_CATEGORY_IDS = TASK_CATEGORIES.map((category) => category.id) as [TaskCategory, ...TaskCategory[]];

export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === 'string' && (TASK_CATEGORY_IDS as string[]).includes(value);
}

export function categoryLabel(category: TaskCategory): string {
  return TASK_CATEGORIES.find((entry) => entry.id === category)?.label ?? 'Other';
}

// Checked in order, so more specific parts win: "final drive oil" is
// drivetrain and "fork oil" is suspension, not engine oil.
const KEYWORDS: [TaskCategory, RegExp][] = [
  ['cooling', /\b(coolant|radiator|antifreeze|water pump|thermostat)/],
  ['brakes', /\b(brake|caliper|abs\b)/],
  ['drivetrain', /\b(chain|sprocket|belt|final drive|drive shaft|shaft drive|clutch|gearbox|transmission)/],
  ['suspension', /\b(fork|shock|suspension|steering|swingarm|swing arm|link fork|linkage|frame)/],
  ['wheels', /\b(tire|tyre|wheel|rim|spoke)/],
  ['electrical', /\b(batter|electric|fuse|horn|fault memory|diagnos|sensor|ecu|starter|service display)|light/],
  ['controls', /\b(cable|lever|control|pedal|side ?stand|grease|lubricat)/],
  ['engine', /\b(oil|valve|spark|plug|air filter|fuel|throttle|exhaust|cam|idle|intake|engine|crankcase)/],
];

/** A best guess from the task's name, for tasks nobody has categorised. */
export function guessCategory(taskName: string): TaskCategory {
  const name = taskName.toLowerCase();
  return KEYWORDS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';
}

/** The task's category, or a guess from its name if it doesn't have one. */
export function taskCategory(task: { task_name: string; category?: string | null }): TaskCategory {
  return isTaskCategory(task.category) ? task.category : guessCategory(task.task_name);
}

/** Share of the interval left at which a related task is worth doing at the same time. */
export const BATCH_FRACTION = 0.5;

/**
 * Other tasks in the same category that are at least halfway to due, most
 * due first: the ones worth doing while you're working on this one.
 */
export function batchCandidates<T extends { id: string; task_name: string; category?: string | null }>(
  task: T,
  entries: { task: T; dueState: { fractionRemaining: number | null } }[],
  limit = 3
): T[] {
  const category = taskCategory(task);
  return entries
    .filter(
      ({ task: other, dueState }) =>
        other.id !== task.id &&
        taskCategory(other) === category &&
        dueState.fractionRemaining !== null &&
        dueState.fractionRemaining <= BATCH_FRACTION
    )
    .sort((a, b) => (a.dueState.fractionRemaining ?? 0) - (b.dueState.fractionRemaining ?? 0))
    .slice(0, limit)
    .map(({ task: other }) => other);
}

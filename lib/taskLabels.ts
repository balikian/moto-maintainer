import type { TaskDueState } from './maintenance';
import type { MaintenanceTask, UnitSystem } from './types';
import { formatDistance } from './units';

// Display text for a task card: how far it is from due, and its interval.

/** How far a task is from due, split into a big value and the word under it: "112 mi" / "overdue". */
export type DueLabel = { value: string; caption: string };

const DAYS_PER_MONTH = 30.44;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Days up to two months, whole months after that. */
function timeSpan(days: number): string {
  return days > 60 ? plural(Math.floor(days / DAYS_PER_MONTH), 'month') : plural(days, 'day');
}

export function dueLabel({ trigger, milesRemaining, daysRemaining }: TaskDueState, units: UnitSystem): DueLabel {
  if (trigger === 'time' && daysRemaining !== null) {
    if (daysRemaining === 0) return { value: 'Today', caption: 'due' };
    return daysRemaining < 0
      ? { value: timeSpan(-daysRemaining), caption: 'overdue' }
      : { value: timeSpan(daysRemaining), caption: 'left' };
  }
  if (milesRemaining !== null) {
    return milesRemaining < 0
      ? { value: formatDistance(-milesRemaining, units), caption: 'overdue' }
      : { value: formatDistance(milesRemaining, units), caption: 'left' };
  }
  return { value: 'No interval', caption: '' };
}

/** "Every 6,200 mi or 12 months". */
export function intervalLabel(task: Pick<MaintenanceTask, 'interval_mileage' | 'interval_months'>, units: UnitSystem): string {
  const parts: string[] = [];
  if (task.interval_mileage > 0) parts.push(formatDistance(task.interval_mileage, units));
  if ((task.interval_months ?? 0) > 0) parts.push(plural(task.interval_months, 'month'));
  return parts.length > 0 ? `Every ${parts.join(' or ')}` : 'No interval set';
}

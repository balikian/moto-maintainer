import { taskCategory, type TaskCategory } from './taskCategories';
import type { MaintenanceTask, ServiceLog } from './types';

// What a bike's maintenance has cost, from the costs entered when logging service.

type SpendLog = Pick<ServiceLog, 'task_id' | 'task_name' | 'performed_at' | 'cost'>;

export type SpendSummary = {
  total: number;
  /** Service records that had a cost. */
  paidServices: number;
  /** Largest first; categories with no spending are left out. */
  byCategory: { category: TaskCategory; total: number }[];
};

function costOf(log: SpendLog): number | null {
  const cost = Number(log.cost);
  return log.cost !== null && Number.isFinite(cost) && cost > 0 ? cost : null;
}

/**
 * Totals the logged costs, optionally for one calendar year only. Each record
 * counts toward its task's category; one-off jobs (or tasks since deleted)
 * are categorised from the job's name.
 */
export function summarizeSpend(
  logs: SpendLog[],
  tasks: Pick<MaintenanceTask, 'id' | 'task_name' | 'category'>[],
  year?: number
): SpendSummary {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const totals = new Map<TaskCategory, number>();
  let total = 0;
  let paidServices = 0;

  for (const log of logs) {
    const cost = costOf(log);
    if (cost === null) continue;
    if (year !== undefined && log.performed_at.slice(0, 4) !== String(year)) continue;

    const category = taskCategory((log.task_id && tasksById.get(log.task_id)) || { task_name: log.task_name });
    totals.set(category, (totals.get(category) ?? 0) + cost);
    total += cost;
    paidServices += 1;
  }

  const byCategory = [...totals.entries()]
    .map(([category, categoryTotal]) => ({ category, total: Math.round(categoryTotal * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
  return { total: Math.round(total * 100) / 100, paidServices, byCategory };
}

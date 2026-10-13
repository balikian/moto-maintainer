'use client';

import { BookOpen, CheckCircle, ChevronDown, Plus } from 'lucide-react';
import { groupTasksByUrgency, type TaskDueState } from '@/lib/maintenance';
import { batchCandidates, type TaskCategory } from '@/lib/taskCategories';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { useStoredToggle } from '../hooks/useStoredToggle';
import TaskCard from './TaskCard';
import { ui } from './ui';

type MaintenanceChecklistProps = {
  bike: Motorcycle;
  tasks: MaintenanceTask[];
  /** Ids of tasks that have at least one service logged. */
  loggedTaskIds: Set<string>;
  loading: boolean;
  unitSystem: UnitSystem;
  onAddTask: () => void;
  onOpenManual: () => void;
  onLogTask: (task: MaintenanceTask) => void;
  onSaveIntervals: (task: MaintenanceTask, intervals: { intervalMileage: number; intervalMonths: number; category: TaskCategory }) => Promise<string | null>;
  onResetTask: (task: MaintenanceTask) => void;
  onDeleteTask: (task: MaintenanceTask) => void;
};

/**
 * The bike's tasks, most due first. Anything overdue, urgent, or coming up
 * soon is a card; healthy tasks are compact rows in a collapsible "All good" list.
 */
export default function MaintenanceChecklist({
  bike,
  tasks,
  loggedTaskIds,
  loading,
  unitSystem,
  onAddTask,
  onOpenManual,
  onLogTask,
  onSaveIntervals,
  onResetTask,
  onDeleteTask,
}: MaintenanceChecklistProps) {
  const [healthyCollapsed, toggleHealthy] = useStoredToggle('moto-maintain:healthy-tasks-collapsed', true);
  const { needsAttention, healthy } = groupTasksByUrgency(tasks, bike.current_mileage, new Date());
  const allEntries = [...needsAttention, ...healthy];

  const renderTask = ({ task, dueState }: { task: MaintenanceTask; dueState: TaskDueState }, variant: 'card' | 'row') => (
    <TaskCard
      key={task.id}
      task={task}
      dueState={dueState}
      neverLogged={!loggedTaskIds.has(task.id)}
      unitSystem={unitSystem}
      variant={variant}
      onLog={() => onLogTask(task)}
      onSaveIntervals={(intervals) => onSaveIntervals(task, intervals)}
      alsoComingUp={dueState.status === 'Healthy' ? [] : batchCandidates(task, allEntries)}
      onReset={() => onResetTask(task)}
      onDelete={() => onDeleteTask(task)}
    />
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Needs attention</h2>
        <button type="button" onClick={onOpenManual} className={ui.chipButton}>
          <BookOpen size={15} />
          Manual &amp; schedule
        </button>
      </div>

      {loading ? (
        <div className={ui.emptyState}>Loading maintenance tasks…</div>
      ) : tasks.length === 0 ? (
        <div className={ui.emptyState}>No maintenance tasks for this bike yet. Add one to start tracking.</div>
      ) : (
        <div className="grid gap-2.5">
          {needsAttention.length > 0 ? (
            needsAttention.map((entry) => renderTask(entry, 'card'))
          ) : (
            <div className={`${ui.card} flex items-center gap-3 px-4 py-4 text-sm`}>
              <CheckCircle size={20} className="shrink-0 text-good" aria-hidden="true" />
              <span>
                <span className="font-bold">Nothing due soon.</span> <span className={ui.muted}>Go ride.</span>
              </span>
            </div>
          )}

          {healthy.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={toggleHealthy}
                aria-expanded={!healthyCollapsed}
                aria-controls="healthy-tasks"
                className="inline-flex min-h-11 items-center gap-2"
              >
                <ChevronDown size={16} className={`transition-transform ${healthyCollapsed ? '-rotate-90' : ''}`} aria-hidden="true" />
                <span className={ui.sectionTitle}>All good</span>
                <span className="rounded-md bg-raised px-2 py-0.5 text-xs font-extrabold text-muted">{healthy.length}</span>
              </button>
              <ul id="healthy-tasks" hidden={healthyCollapsed} className={`mt-1 divide-y divide-line ${ui.card}`}>
                {healthy.map((entry) => renderTask(entry, 'row'))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onAddTask}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm font-bold text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <Plus size={15} /> Add a custom task
      </button>
    </section>
  );
}

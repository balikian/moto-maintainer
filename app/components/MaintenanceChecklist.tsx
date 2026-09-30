'use client';

import { CheckCircle, ChevronDown, Plus } from 'lucide-react';
import { groupTasksByUrgency, type TaskDueState } from '@/lib/maintenance';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { useStoredToggle } from '../hooks/useStoredToggle';
import TaskCard from './TaskCard';
import { ui } from './ui';

type MaintenanceChecklistProps = {
  bike: Motorcycle;
  tasks: MaintenanceTask[];
  loading: boolean;
  unitSystem: UnitSystem;
  onAddTask: () => void;
  onLogTask: (task: MaintenanceTask) => void;
  onSaveIntervals: (task: MaintenanceTask, intervals: { intervalMileage: number; intervalMonths: number }) => Promise<string | null>;
  onResetTask: (task: MaintenanceTask) => void;
  onDeleteTask: (task: MaintenanceTask) => void;
};

/**
 * The bike's tasks, most due first. Anything overdue, urgent, or coming up
 * soon is always shown; healthy tasks sit in a collapsible "All good" group.
 */
export default function MaintenanceChecklist({
  bike,
  tasks,
  loading,
  unitSystem,
  onAddTask,
  onLogTask,
  onSaveIntervals,
  onResetTask,
  onDeleteTask,
}: MaintenanceChecklistProps) {
  const [healthyCollapsed, toggleHealthy] = useStoredToggle('moto-maintain:healthy-tasks-collapsed', true);
  const { needsAttention, healthy } = groupTasksByUrgency(tasks, bike.current_mileage, new Date());

  const renderCard = ({ task, dueState }: { task: MaintenanceTask; dueState: TaskDueState }) => (
    <TaskCard
      key={task.id}
      task={task}
      dueState={dueState}
      unitSystem={unitSystem}
      onLog={() => onLogTask(task)}
      onSaveIntervals={(intervals) => onSaveIntervals(task, intervals)}
      onReset={() => onResetTask(task)}
      onDelete={() => onDeleteTask(task)}
    />
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Maintenance Checklist</h2>
        <button type="button" onClick={onAddTask} className={ui.chipButton}>
          <Plus size={14} className="text-amber-500" />
          Add Task
        </button>
      </div>

      {loading ? (
        <div className={ui.emptyState}>Loading maintenance tasks…</div>
      ) : tasks.length === 0 ? (
        <div className={ui.emptyState}>No maintenance tasks for this bike yet. Add one to start tracking.</div>
      ) : (
        <div className="grid gap-3">
          {needsAttention.length > 0 ? (
            needsAttention.map(renderCard)
          ) : (
            <div className={`flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm ${ui.muted}`}>
              <CheckCircle size={16} className="shrink-0 text-emerald-500" />
              Nothing due soon. Everything on this bike is in good shape.
            </div>
          )}

          {healthy.length > 0 && (
            <div>
              <button
                type="button"
                onClick={toggleHealthy}
                aria-expanded={!healthyCollapsed}
                aria-controls="healthy-tasks"
                className={`inline-flex items-center gap-1.5 py-1 hover:text-slate-700 dark:hover:text-slate-300 ${ui.sectionTitle}`}
              >
                <ChevronDown size={14} className={`transition-transform ${healthyCollapsed ? '-rotate-90' : ''}`} />
                All good
                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {healthy.length}
                </span>
              </button>
              <div id="healthy-tasks" hidden={healthyCollapsed} className="mt-2">
                <div className="grid gap-3">{healthy.map(renderCard)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

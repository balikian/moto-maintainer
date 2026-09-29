'use client';

import { Plus } from 'lucide-react';
import { getTaskDueState } from '@/lib/maintenance';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
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
  const today = new Date();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Maintenance Checklist</h2>
        <button type="button" onClick={onAddTask} className={ui.chipButton}>
          <Plus size={14} className="text-amber-500" />
          Add Task
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className={ui.emptyState}>Loading maintenance tasks…</div>
        ) : tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dueState={getTaskDueState(task, bike.current_mileage, today)}
              unitSystem={unitSystem}
              onLog={() => onLogTask(task)}
              onSaveIntervals={(intervals) => onSaveIntervals(task, intervals)}
              onReset={() => onResetTask(task)}
              onDelete={() => onDeleteTask(task)}
            />
          ))
        ) : (
          <div className={ui.emptyState}>No maintenance tasks for this bike yet. Add one to start tracking.</div>
        )}
      </div>
    </section>
  );
}

'use client';

import { BookOpen, CheckCircle, ChevronDown, Plus } from 'lucide-react';
import { groupTasksByUrgency, type TaskDueState } from '@/lib/maintenance';
import { batchCandidates, type TaskCategory } from '@/lib/taskCategories';
import type { MaintenanceTask, Motorcycle, UnitSystem } from '@/lib/types';
import { distanceUnitLabel } from '@/lib/units';
import { useStoredToggle } from '../hooks/useStoredToggle';
import ConfirmPopover from './ConfirmPopover';
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
  /** Gives tasks without a start point one: today, or from when the bike was new. */
  onSetStart: (tasks: MaintenanceTask[], start: 'today' | 'new') => void;
};

/**
 * The bike's tasks, most due first. Tasks without a start point come first,
 * asking when they were last done; anything overdue, urgent, or coming up
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
  onSetStart,
}: MaintenanceChecklistProps) {
  const [healthyCollapsed, toggleHealthy] = useStoredToggle('moto-maintain:healthy-tasks-collapsed', true);
  const { needsAttention, healthy, noStart } = groupTasksByUrgency(tasks, bike.current_mileage, new Date());
  const allEntries = [...needsAttention, ...healthy];
  const noStartTasks = noStart.map(({ task }) => task);
  const count = noStartTasks.length;
  const these = count === 1 ? 'this task' : `all ${count}`;

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
      onSetStart={(start) => onSetStart([task], start)}
      bikeYear={bike.year}
    />
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Needs attention</h2>
        {/* Add task is here too, not only below a long list where it gets missed. */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAddTask} className={ui.chipButton}>
            <Plus size={15} />
            Add task
          </button>
          <button type="button" onClick={onOpenManual} className={ui.chipButton}>
            <BookOpen size={15} />
            Manual &amp; schedule
          </button>
        </div>
      </div>

      {loading ? (
        <div className={ui.emptyState}>Loading maintenance tasks…</div>
      ) : tasks.length === 0 ? (
        <div className={ui.emptyState}>No maintenance tasks for this bike yet. Add one to start tracking.</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {count > 0 && (
            <div className={ui.card}>
              <div className="space-y-3 px-4 py-4">
                <div>
                  <h3 className="text-base font-bold">When were these last done?</h3>
                  <p className="mt-1 text-sm text-muted">
                    {count === 1 ? 'This task' : `These ${count} tasks`} won&apos;t come due until they have a start point. Tap
                    one to log a past service. Don&apos;t know? Start counting today.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ConfirmPopover
                    align="left"
                    message={`Start counting ${these} today? You can still log past services for them later.`}
                    confirmLabel="Start today"
                    onConfirm={() => onSetStart(noStartTasks, 'today')}
                  >
                    {(openConfirm, popoverProps) => (
                      <button type="button" onClick={openConfirm} {...popoverProps} className={ui.secondaryButton}>
                        {count === 1 ? 'Start today' : 'Start all today'}
                      </button>
                    )}
                  </ConfirmPopover>
                  <ConfirmPopover
                    align="left"
                    message={`Mark ${these} as never done? ${count === 1 ? 'It' : 'They'}'ll count from when the bike was new (0 ${distanceUnitLabel(unitSystem)}, January ${bike.year}), so anything past its interval will show as overdue.`}
                    confirmLabel="Never done"
                    onConfirm={() => onSetStart(noStartTasks, 'new')}
                  >
                    {(openConfirm, popoverProps) => (
                      <button type="button" onClick={openConfirm} {...popoverProps} className={ui.secondaryButton}>
                        {count === 1 ? 'Never done' : 'None done yet'}
                      </button>
                    )}
                  </ConfirmPopover>
                </div>
              </div>
              <ul className="divide-y divide-line border-t border-line">{noStart.map((entry) => renderTask(entry, 'row'))}</ul>
            </div>
          )}

          {needsAttention.length > 0 ? (
            // Two across on desktop; an opened card grows without stretching its neighbor.
            <div className="grid grid-cols-1 items-start gap-2.5 lg:grid-cols-2 lg:gap-3">
              {needsAttention.map((entry) => renderTask(entry, 'card'))}
            </div>
          ) : count === 0 && (
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

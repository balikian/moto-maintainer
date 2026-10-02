'use client';

import { useState } from 'react';
import { addBikeAction, deleteBikeAction, updateBikeAction, updateOdometerAction } from '@/lib/actions/bikes';
import {
  completeTaskAction,
  createMaintenanceTaskAction,
  deleteServiceLogAction,
  deleteTaskAction,
  updateTaskIntervalsAction,
} from '@/lib/actions/tasks';
import type { CustomModel } from '@/lib/bikeCatalog';
import { findDefaultTask, scheduleOverlapsTasks } from '@/lib/maintenance';
import { fetchModelSchedule } from '@/lib/modelData';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceTask, ModelSchedule, Motorcycle, ServiceLog } from '@/lib/types';
import BikeFormModal, { type BikeFormValues } from './components/BikeFormModal';
import AddCustomTaskModal, { type NewTaskValues } from './components/AddCustomTaskModal';
import BikeManualPanel from './components/BikeManualPanel';
import ErrorList from './components/ErrorList';
import GarageHeader from './components/GarageHeader';
import LoginCard from './components/LoginCard';
import LogServiceModal, { type LogServiceValues } from './components/LogServiceModal';
import MaintenanceChecklist from './components/MaintenanceChecklist';
import ServiceHistoryView from './components/ServiceHistoryView';
import ShareHistoryModal from './components/ShareHistoryModal';
import { ui } from './components/ui';
import { useAuthUser } from './hooks/useAuthUser';
import { usePreferences } from './hooks/usePreferences';
import { useSupabaseQuery } from './hooks/useSupabaseQuery';

// Reads go straight from the browser to Supabase; writes go through the server
// actions in lib/actions. Row-level security keeps both scoped to the user.

const NO_CUSTOM_MODELS: CustomModel[] = [];

type OpenDialog =
  | { type: 'addBike' }
  | { type: 'editBike'; bike: Motorcycle }
  | { type: 'addTask' }
  | { type: 'logService'; task: MaintenanceTask | null }
  | { type: 'share' }
  | { type: 'manual' }
  | null;

export default function GarageDashboard() {
  const [supabase] = useState(createClient);
  const user = useAuthUser(supabase);
  const userId = user?.id ?? null;

  const [errors, setErrors] = useState<string[]>([]);
  const reportError = (message: string) => setErrors((previous) => [...previous, message]);

  const { preferences, updatePreferences } = usePreferences(supabase, userId, reportError);
  const { unitSystem, theme } = preferences;

  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<OpenDialog>(null);

  const bikesQuery = useSupabaseQuery<Motorcycle[]>(userId, () =>
    supabase.from('motorcycles').select('*').order('created_at', { ascending: true })
  );
  const bikes = bikesQuery.data ?? [];
  const activeBike = bikes.find((bike) => bike.id === selectedBikeId) ?? bikes[0] ?? null;
  const activeBikeId = activeBike?.id ?? null;

  const tasksQuery = useSupabaseQuery<MaintenanceTask[]>(activeBikeId, (bikeId) =>
    supabase.from('maintenance_tasks').select('*').eq('motorcycle_id', bikeId).order('interval_mileage', { ascending: true })
  );
  const tasks = tasksQuery.data ?? [];

  const logsQuery = useSupabaseQuery<ServiceLog[]>(activeBikeId, (bikeId) =>
    supabase
      .from('service_logs')
      .select('*')
      .eq('motorcycle_id', bikeId)
      .order('performed_at', { ascending: false })
      .order('created_at', { ascending: false })
  );
  const loggedTaskIds = new Set((logsQuery.data ?? []).flatMap((log) => (log.task_id ? [log.task_id] : [])));

  // Admins see a link to the review page. The page itself re-checks on the server.
  const adminQuery = useSupabaseQuery<boolean>(userId, () => supabase.rpc('is_app_admin'));
  const isAdmin = adminQuery.data === true;

  // Makes/models riders added; approved ones (and your own) join the bike form's lists.
  const customModelsQuery = useSupabaseQuery<CustomModel[]>(userId, () =>
    supabase.from('custom_models').select('make,model').neq('status', 'rejected')
  );
  const customModels = customModelsQuery.data ?? NO_CUSTOM_MODELS;

  // The bike's manufacturer schedule, to point out one that hasn't been applied yet.
  const scheduleKey = activeBike ? `${activeBike.id}|${activeBike.year}|${activeBike.make}|${activeBike.model}` : null;
  const scheduleQuery = useSupabaseQuery<ModelSchedule | null>(scheduleKey, () => fetchModelSchedule(supabase, activeBike!));
  const unappliedSchedule =
    scheduleQuery.data && !tasksQuery.loading && !scheduleOverlapsTasks(scheduleQuery.data, tasks) ? scheduleQuery.data : null;

  const loadErrors = [bikesQuery.error, tasksQuery.error, logsQuery.error]
    .filter((message): message is string => Boolean(message))
    .map((message) => `Couldn't load your garage: ${message}`);

  // --- Bikes ---------------------------------------------------------------

  const handleAddBike = async (values: BikeFormValues) => {
    const result = await addBikeAction(values);
    if (!result.data) return result.error ?? 'Unable to add this motorcycle right now.';

    // The bike was saved even if seeding its default tasks failed.
    if (result.error) reportError(result.error);
    setSelectedBikeId(result.data.id);
    setDialog(null);
    bikesQuery.reload();
    return null;
  };

  const handleEditBike = async (bike: Motorcycle, values: BikeFormValues) => {
    const result = await updateBikeAction(bike.id, { year: values.year, make: values.make, model: values.model });
    if (result.error) return result.error;
    setDialog(null);
    bikesQuery.reload();
    return null;
  };

  const handleRemoveBike = async (bike: Motorcycle) => {
    const name = `${bike.year} ${bike.make} ${bike.model}`;
    const result = await deleteBikeAction(bike.id);
    if (result.error) {
      reportError(`Unable to remove ${name}: ${result.error}`);
      return;
    }
    if (selectedBikeId === bike.id) setSelectedBikeId(null);
    bikesQuery.reload();
  };

  const handleUpdateOdometer = async (miles: number) => {
    if (!activeBike) return 'Select a bike first.';
    const result = await updateOdometerAction(activeBike.id, miles);
    if (result.error) return result.error;
    bikesQuery.reload();
    return null;
  };

  // --- Tasks ---------------------------------------------------------------

  const handleCreateTask = async (values: NewTaskValues) => {
    if (!activeBike) return 'Select a bike before adding a task.';
    const result = await createMaintenanceTaskAction({ motorcycleId: activeBike.id, ...values });
    if (result.error) return result.error;
    setDialog(null);
    tasksQuery.reload();
    return null;
  };

  const handleSaveIntervals = async (task: MaintenanceTask, intervals: { intervalMileage: number; intervalMonths: number }) => {
    const result = await updateTaskIntervalsAction(task.id, intervals);
    if (result.error) return result.error;
    tasksQuery.reload();
    return null;
  };

  const handleResetTask = async (task: MaintenanceTask) => {
    if (!activeBike) return;
    // If the schedule can't be loaded, fall back to the generic defaults.
    const schedule = await fetchModelSchedule(supabase, activeBike);
    const defaults = findDefaultTask(schedule.data, task.task_name);
    if (!defaults) {
      reportError(`"${task.task_name}" is a custom task, so it has no default interval to reset to.`);
      return;
    }

    const result = await updateTaskIntervalsAction(task.id, {
      intervalMileage: defaults.interval_mileage,
      intervalMonths: defaults.interval_months,
    });
    if (result.error) {
      reportError(`Unable to reset ${task.task_name}: ${result.error}`);
      return;
    }
    tasksQuery.reload();
  };

  const handleDeleteTask = async (task: MaintenanceTask) => {
    const result = await deleteTaskAction(task.id);
    if (result.error) {
      reportError(`Unable to delete ${task.task_name}: ${result.error}`);
      return;
    }
    tasksQuery.reload();
    logsQuery.reload();
  };

  // --- Service logs --------------------------------------------------------

  const handleLogService = async (values: LogServiceValues) => {
    if (!activeBike) return 'Select a bike before logging service.';
    const result = await completeTaskAction({
      motorcycleId: activeBike.id,
      taskId: values.taskId,
      taskName: values.taskName,
      performedAt: values.performedAt,
      odometerAtService: values.odometer,
      cost: values.cost,
      notes: values.notes,
    });
    if (result.error) return result.error;

    setDialog(null);
    bikesQuery.reload();
    tasksQuery.reload();
    logsQuery.reload();
    return null;
  };

  const handleDeleteLog = async (log: ServiceLog) => {
    const result = await deleteServiceLogAction(log.id);
    if (result.error) return result.error;
    tasksQuery.reload();
    logsQuery.reload();
    return null;
  };

  // --- Render --------------------------------------------------------------

  if (user === undefined || (userId && bikesQuery.loading)) {
    return (
      <div className={`flex items-center justify-center p-4 ${ui.page}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className={`text-sm ${ui.muted}`}>Checking your garage access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginCard />;
  }

  const avatarUrl = (user.user_metadata?.avatar_url || user.user_metadata?.picture || null) as string | null;

  return (
    <div className={`relative p-4 md:p-8 ${ui.page}`}>
      <GarageHeader
        avatarUrl={avatarUrl}
        bikes={bikes}
        activeBike={activeBike}
        unitSystem={unitSystem}
        theme={theme}
        isAdmin={isAdmin}
        onSelectBike={setSelectedBikeId}
        onAddBike={() => setDialog({ type: 'addBike' })}
        onEditBike={(bike) => setDialog({ type: 'editBike', bike })}
        onRemoveBike={(bike) => void handleRemoveBike(bike)}
        onUpdateOdometer={handleUpdateOdometer}
        onToggleUnits={() => void updatePreferences({ unitSystem: unitSystem === 'imperial' ? 'metric' : 'imperial' })}
        onToggleTheme={() => void updatePreferences({ theme: theme === 'dark' ? 'light' : 'dark' })}
      />

      <main className="mx-auto grid max-w-4xl gap-6">
        <ErrorList
          errors={[...loadErrors, ...errors]}
          onDismiss={(index) => {
            // Load errors clear themselves on the next successful load; only action errors are dismissible state.
            const actionIndex = index - loadErrors.length;
            if (actionIndex >= 0) setErrors((previous) => previous.filter((_, i) => i !== actionIndex));
          }}
        />

        {activeBike ? (
          <>
            {unappliedSchedule && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
                <span>
                  The manufacturer&apos;s maintenance schedule for your {activeBike.make} {activeBike.model} is available (
                  {unappliedSchedule.model_schedule_tasks.length} tasks). Your checklist doesn&apos;t use it yet.
                </span>
                <button type="button" onClick={() => setDialog({ type: 'manual' })} className={`${ui.primaryButton} px-3 py-1.5 text-xs`}>
                  Review &amp; apply
                </button>
              </div>
            )}

            <MaintenanceChecklist
              bike={activeBike}
              tasks={tasks}
              loggedTaskIds={loggedTaskIds}
              loading={tasksQuery.loading}
              unitSystem={unitSystem}
              onAddTask={() => setDialog({ type: 'addTask' })}
              onOpenManual={() => setDialog({ type: 'manual' })}
              onLogTask={(task) => setDialog({ type: 'logService', task })}
              onSaveIntervals={handleSaveIntervals}
              onResetTask={(task) => void handleResetTask(task)}
              onDeleteTask={(task) => void handleDeleteTask(task)}
            />

            <ServiceHistoryView
              bike={activeBike}
              logs={logsQuery.data ?? []}
              loading={logsQuery.loading}
              unitSystem={unitSystem}
              onAddLog={() => setDialog({ type: 'logService', task: null })}
              onDeleteLog={handleDeleteLog}
              onShare={() => setDialog({ type: 'share' })}
            />
          </>
        ) : (
          <div className={ui.emptyState}>
            Your garage is empty.{' '}
            <button type="button" onClick={() => setDialog({ type: 'addBike' })} className="font-semibold text-amber-600 hover:underline dark:text-amber-500">
              Add your first bike
            </button>{' '}
            to start tracking maintenance.
          </div>
        )}
      </main>

      {dialog?.type === 'addBike' && (
        <BikeFormModal customModels={customModels} unitSystem={unitSystem} onClose={() => setDialog(null)} onSubmit={handleAddBike} />
      )}

      {dialog?.type === 'editBike' && (
        <BikeFormModal
          bike={dialog.bike}
          customModels={customModels}
          unitSystem={unitSystem}
          onClose={() => setDialog(null)}
          onSubmit={(values) => handleEditBike(dialog.bike, values)}
        />
      )}

      {dialog?.type === 'addTask' && activeBike && (
        <AddCustomTaskModal
          unitSystem={unitSystem}
          currentOdometer={activeBike.current_mileage}
          onClose={() => setDialog(null)}
          onSubmit={handleCreateTask}
        />
      )}

      {dialog?.type === 'logService' && activeBike && (
        <LogServiceModal
          tasks={tasks}
          task={dialog.task}
          unitSystem={unitSystem}
          defaultOdometer={activeBike.current_mileage}
          onClose={() => setDialog(null)}
          onSubmit={handleLogService}
        />
      )}

      {dialog?.type === 'manual' && activeBike && (
        <BikeManualPanel
          supabase={supabase}
          bike={activeBike}
          currentUserId={user.id}
          isAdmin={isAdmin}
          onTasksChanged={() => {
            tasksQuery.reload();
            logsQuery.reload();
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'share' && activeBike && (
        <ShareHistoryModal supabase={supabase} bike={activeBike} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

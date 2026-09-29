'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../supabase/server';


type ActionResult<T = null> = {
  data?: T;
  error?: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CreateMaintenanceTaskInput = {
  motorcycleId: string;
  taskName: string;
  intervalMileage: number;
  intervalMonths: number;
  baselineOdometer: number;
  baselineDate: string;
  notes?: string;
};

async function insertServiceLogRecord(
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    motorcycleId: string;
    taskId: string | null;
    taskName: string;
    performedAt: string;
    odometerAtService: number;
    cost: number | null;
    notes: string | null;
  }
): Promise<ActionResult> {
  const { error } = await supabase.from('service_logs').insert({
    user_id: input.userId,
    motorcycle_id: input.motorcycleId,
    task_id: input.taskId,
    task_name: input.taskName,
    performed_at: input.performedAt,
    odometer_at_service: input.odometerAtService,
    cost: input.cost,
    notes: input.notes,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

type CompleteTaskActionInput = {
  motorcycle_id: string;
  task_id?: string | null;
  task_name: string;
  performed_at: string;
  odometer_at_service: number;
  cost?: number | null;
  notes?: string | null;
};

type CompleteTaskActionResult = {
  success: boolean;
  error: string | null;
};

async function updateTaskWithFallbackColumns(
  taskId: string,
  odometer: number,
  date: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const primaryAttempt = await supabase
    .from('maintenance_tasks')
    .update({
      last_performed_odometer: odometer,
      last_performed_date: date,
    })
    .eq('id', taskId);

  if (!primaryAttempt.error) {
    return {};
  }

  const fallbackAttempt = await supabase
    .from('maintenance_tasks')
    .update({
      last_performed_mileage: odometer,
      last_performed_date: date,
    })
    .eq('id', taskId);

  if (fallbackAttempt.error) {
    return { error: fallbackAttempt.error.message };
  }

  return {};
}

async function updateMotorcycleOdometerIfHigher(
  motorcycleId: string,
  loggedOdometer: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const currentReadAttempt = await supabase
    .from('motorcycles')
    .select('id,current_odometer')
    .eq('id', motorcycleId)
    .single();

  if (!currentReadAttempt.error && currentReadAttempt.data) {
    const current = Number(currentReadAttempt.data.current_odometer ?? 0);
    if (loggedOdometer > current) {
      const updateAttempt = await supabase
        .from('motorcycles')
        .update({ current_odometer: loggedOdometer })
        .eq('id', motorcycleId);

      if (updateAttempt.error) {
        return { error: updateAttempt.error.message };
      }
    }

    return {};
  }

  const fallbackReadAttempt = await supabase
    .from('motorcycles')
    .select('id,current_mileage')
    .eq('id', motorcycleId)
    .single();

  if (fallbackReadAttempt.error || !fallbackReadAttempt.data) {
    return {
      error: fallbackReadAttempt.error?.message ?? 'Unable to load current odometer.',
    };
  }

  const currentMileage = Number(fallbackReadAttempt.data.current_mileage ?? 0);
  if (loggedOdometer > currentMileage) {
    const fallbackUpdate = await supabase
      .from('motorcycles')
      .update({ current_mileage: loggedOdometer })
      .eq('id', motorcycleId);

    if (fallbackUpdate.error) {
      return { error: fallbackUpdate.error.message };
    }
  }

  return {};
}

export async function createMaintenanceTaskAction(
  input: CreateMaintenanceTaskInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'You must be signed in to add a custom task.' };
  }

  const taskName = input.taskName.trim();
  if (!taskName) {
    return { error: 'Task name is required.' };
  }

  const intervalMileage = Math.max(0, Math.round(input.intervalMileage || 0));
  const intervalMonths = Math.max(0, Math.round(input.intervalMonths || 0));
  const baselineOdometer = Math.max(0, Math.round(input.baselineOdometer || 0));

  if (!input.motorcycleId) {
    return { error: 'A motorcycle must be selected.' };
  }

  const baseInsert = {
    motorcycle_id: input.motorcycleId,
    user_id: user.id,
    task_name: taskName,
    interval_mileage: intervalMileage,
    interval_months: intervalMonths,
    last_performed_date: input.baselineDate,
    notes: input.notes?.trim() || null,
    is_diy: true,
  };

  const primaryAttempt = await supabase
    .from('maintenance_tasks')
    .insert({
      ...baseInsert,
      last_performed_odometer: baselineOdometer,
    })
    .select('id')
    .single();

  if (primaryAttempt.error) {
    const fallbackAttempt = await supabase
      .from('maintenance_tasks')
      .insert({
        ...baseInsert,
        last_performed_mileage: baselineOdometer,
      })
      .select('id')
      .single();

    if (fallbackAttempt.error || !fallbackAttempt.data) {
      return { error: fallbackAttempt.error?.message ?? 'Unable to create task.' };
    }

    revalidatePath('/');
    return { data: { id: fallbackAttempt.data.id as string } };
  }

  if (!primaryAttempt.data) {
    return { error: 'Unable to create task.' };
  }

  revalidatePath('/');
  return { data: { id: primaryAttempt.data.id as string } };
}

export async function completeTaskAction(
  input: CompleteTaskActionInput
): Promise<CompleteTaskActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to log service.' };
  }

  const motorcycleId = input.motorcycle_id;
  const taskId = input.task_id ?? null;
  const taskName = input.task_name.trim();
  const performedAt = input.performed_at;
  const normalizedOdometer = Math.max(0, Math.round(input.odometer_at_service || 0));
  const normalizedCost =
    typeof input.cost === 'number' && Number.isFinite(input.cost) ? Number(input.cost) : null;
  const normalizedNotes = input.notes?.trim() || null;

  if (!motorcycleId) {
    return { success: false, error: 'A motorcycle must be selected.' };
  }

  if (!taskName) {
    return { success: false, error: 'Task name is required.' };
  }

  if (!performedAt) {
    return { success: false, error: 'Date performed is required.' };
  }

  if (taskId) {
    const taskLookup = await supabase
      .from('maintenance_tasks')
      .select('id,user_id,motorcycle_id')
      .eq('id', taskId)
      .single();

    if (taskLookup.error || !taskLookup.data) {
      return { success: false, error: taskLookup.error?.message ?? 'Maintenance task not found.' };
    }

    if (taskLookup.data.user_id !== user.id || taskLookup.data.motorcycle_id !== motorcycleId) {
      return { success: false, error: 'You are not authorized to update this task.' };
    }

    const taskUpdate = await updateTaskWithFallbackColumns(taskId, normalizedOdometer, performedAt);
    if (taskUpdate.error) {
      return { success: false, error: taskUpdate.error };
    }
  }

  const serviceLogInsert = await insertServiceLogRecord(supabase, {
    userId: user.id,
    motorcycleId,
    taskId,
    taskName,
    performedAt,
    odometerAtService: normalizedOdometer,
    cost: normalizedCost,
    notes: normalizedNotes,
  });

  if (serviceLogInsert.error) {
    return { success: false, error: serviceLogInsert.error };
  }

  const odometerUpdate = await updateMotorcycleOdometerIfHigher(motorcycleId, normalizedOdometer);
  if (odometerUpdate.error) {
    return { success: false, error: odometerUpdate.error };
  }

  revalidatePath('/');
  return { success: true, error: null };
}

export async function deleteServiceLogAction(logId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'You must be signed in to delete service records.' };
  }

  const { error } = await supabase.from('service_logs').delete().eq('id', logId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  return {};
}

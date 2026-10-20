'use server';

import { parseAccountImportText, taskIdForLog, taskIdsByName, type ImportBike } from '../accountImport';
import { todayIsoDate } from '../dates';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

type SignedInClient = Awaited<ReturnType<typeof getSignedInClient>>['supabase'];

/** Saves one bike with its tasks and service history. Returns the new bike's id, or an error after saving the bike. */
async function saveBike(supabase: SignedInClient, userId: string, bike: ImportBike): Promise<{ id?: string; error?: string }> {
  const { data: saved, error } = await supabase
    .from('motorcycles')
    .insert({ user_id: userId, year: bike.year, make: bike.make, model: bike.model, current_mileage: bike.odometerMiles })
    .select('id')
    .single();
  if (error || !saved) return { error: error?.message ?? 'Couldn’t save a bike.' };

  let taskIds = new Map<string, string>();
  if (bike.tasks.length > 0) {
    const { data: tasks, error: taskError } = await supabase
      .from('maintenance_tasks')
      .insert(
        bike.tasks.map((task) => ({
          motorcycle_id: saved.id,
          user_id: userId,
          task_name: task.taskName,
          category: task.category,
          interval_mileage: task.intervalMiles,
          interval_months: task.intervalMonths,
          last_performed_mileage: task.lastPerformedMiles,
          last_performed_date: task.lastPerformedDate,
          is_diy: task.isDiy,
          notes: task.notes,
        }))
      )
      .select('id,task_name');
    if (taskError) return { id: saved.id, error: taskError.message };
    taskIds = taskIdsByName(tasks ?? []);
  }

  if (bike.logs.length > 0) {
    const { error: logError } = await supabase.from('service_logs').insert(
      bike.logs.map((log) => ({
        user_id: userId,
        motorcycle_id: saved.id,
        task_id: taskIdForLog(log, taskIds),
        task_name: log.taskName,
        performed_at: log.performedAt,
        odometer_at_service: log.odometerMiles,
        cost: log.cost,
        notes: log.notes,
      }))
    );
    if (logError) return { id: saved.id, error: logError.message };
  }

  return { id: saved.id };
}

/**
 * Adds the chosen bikes from a "Download my data" file to the signed-in
 * rider's garage, as new bikes with their tasks and service history. The file
 * is checked again here (never trust the browser's check), and nothing in it
 * decides who owns the rows. All or nothing: if any bike fails, the bikes
 * already added by this import are removed (their tasks and history cascade).
 */
export async function importAccountDataAction(
  fileText: string,
  bikeIndexes: number[]
): Promise<ActionResult<{ bikeIds: string[] }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  if (typeof fileText !== 'string') return { error: 'No file was sent.' };
  const parsed = parseAccountImportText(fileText, todayIsoDate());
  if ('error' in parsed) return { error: parsed.error };

  const { bikes } = parsed.data;
  const chosen = [...new Set(Array.isArray(bikeIndexes) ? bikeIndexes : [])]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < bikes.length)
    .sort((a, b) => a - b);
  if (chosen.length === 0) return { error: 'Choose at least one bike to import.' };

  const added: string[] = [];
  for (const index of chosen) {
    const result = await saveBike(supabase, user.id, bikes[index]);
    if (result.id) added.push(result.id);
    if (result.error) {
      if (added.length > 0) await supabase.from('motorcycles').delete().in('id', added);
      const bike = bikes[index];
      return { error: `Couldn’t import the ${bike.year} ${bike.make} ${bike.model}, so nothing was added: ${result.error}` };
    }
  }

  return { data: { bikeIds: added } };
}

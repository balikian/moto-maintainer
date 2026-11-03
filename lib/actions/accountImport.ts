'use server';

import { randomUUID } from 'node:crypto';
import { jobForEachLog, parseAccountImportText, taskIdForLog, taskIdsByName, type ImportBike } from '../accountImport';
import { todayIsoDate } from '../dates';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

type SignedInClient = Awaited<ReturnType<typeof getSignedInClient>>['supabase'];

/**
 * The rider's shop with this name, made from the file's if they don't have one.
 * New shops' ids go in `added`, so a failed import can remove them.
 */
async function shopIdFor(
  supabase: SignedInClient,
  userId: string,
  shop: NonNullable<ImportBike['shop']>,
  known: Map<string, string>,
  added: string[]
): Promise<{ id?: string; error?: string }> {
  const key = shop.name.toLowerCase();
  const existing = known.get(key);
  if (existing) return { id: existing };
  const { data, error } = await supabase.from('shops').insert({ user_id: userId, ...shop }).select('id').single();
  if (error || !data) return { error: error?.message ?? 'Couldn’t save a shop.' };
  known.set(key, data.id);
  added.push(data.id);
  return { id: data.id };
}

/** Saves one bike with its tasks, repairs and upgrades, and service history. Returns the new bike's id, or an error after saving the bike. */
async function saveBike(supabase: SignedInClient, userId: string, bike: ImportBike, shopId: string | null): Promise<{ id?: string; error?: string }> {
  const { data: saved, error } = await supabase
    .from('motorcycles')
    .insert({
      user_id: userId,
      year: bike.year,
      make: bike.make,
      model: bike.model,
      current_mileage: bike.odometerMiles,
      purchased_on: bike.purchase.purchasedOn,
      purchase_mileage: bike.purchase.purchaseMileage,
      specs: bike.specs,
      shop_id: shopId,
      stored_on: bike.storedOn,
      battery_type: bike.batteryType,
    })
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

  // Ids made here, so each finished record can point at its job.
  const jobIds = bike.jobs.map(() => randomUUID());
  if (bike.jobs.length > 0) {
    const { error: jobError } = await supabase.from('bike_jobs').insert(
      bike.jobs.map((job, index) => ({
        id: jobIds[index],
        user_id: userId,
        motorcycle_id: saved.id,
        kind: job.kind,
        name: job.name,
        notes: job.notes,
        estimated_cost: job.estimated_cost,
        links: job.links,
      }))
    );
    if (jobError) return { id: saved.id, error: jobError.message };
  }

  if (bike.logs.length > 0) {
    const logJobs = jobForEachLog(bike.logs, bike.jobs);
    const { error: logError } = await supabase.from('service_logs').insert(
      bike.logs.map((log, index) => ({
        user_id: userId,
        motorcycle_id: saved.id,
        task_id: log.jobKind ? null : taskIdForLog(log, taskIds),
        task_name: log.taskName,
        job_id: logJobs[index] === null ? null : jobIds[logJobs[index]],
        job_kind: log.jobKind,
        performed_at: log.performedAt,
        odometer_at_service: log.odometerMiles,
        shop: log.shop,
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
 * rider’s garage, as new bikes with their tasks, repairs and upgrades, service history and shop (one
 * of the rider's with the same name, or a new one). The file is checked again
 * here (never trust the browser's check), and nothing in it decides who owns
 * the rows. All or nothing: if any bike fails, the bikes and shops already
 * added by this import are removed (the bikes' tasks and history cascade).
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

  const { data: ownShops, error: shopsError } = await supabase.from('shops').select('id,name');
  if (shopsError) return { error: shopsError.message };
  const knownShops = new Map((ownShops ?? []).map((shop) => [String(shop.name).toLowerCase(), String(shop.id)]));

  const added: string[] = [];
  const addedShops: string[] = [];
  for (const index of chosen) {
    const bike = bikes[index];
    const shop: { id?: string; error?: string } = bike.shop ? await shopIdFor(supabase, user.id, bike.shop, knownShops, addedShops) : {};
    const result = shop.error ? shop : await saveBike(supabase, user.id, bike, shop.id ?? null);
    if (result.id) added.push(result.id);
    if (result.error) {
      if (added.length > 0) await supabase.from('motorcycles').delete().in('id', added);
      if (addedShops.length > 0) await supabase.from('shops').delete().in('id', addedShops);
      return { error: `Couldn’t import the ${bike.year} ${bike.make} ${bike.model}, so nothing was added: ${result.error}` };
    }
  }

  return { data: { bikeIds: added } };
}

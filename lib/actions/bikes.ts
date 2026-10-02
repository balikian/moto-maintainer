'use server';

import { BASE_CATALOG, isInCatalog } from '../bikeCatalog';
import { fromNewBaseline, getDefaultTasks } from '../maintenance';
import { fetchModelSchedule } from '../modelData';
import { getSignedInClient } from '../supabase/server';
import type { Motorcycle } from '../types';
import { normalizeMileage } from '../units';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Row-level security in Supabase limits every query here to the signed-in
// user's own rows (see supabase/migrations).

/**
 * Suggests a make/model the rider typed in for the shared bike list. An admin
 * approves it before others see it. Best effort: it never blocks saving the
 * bike, and a duplicate of an existing suggestion is simply skipped.
 */
async function suggestCustomModel(supabase: Awaited<ReturnType<typeof getSignedInClient>>['supabase'], make: string, model: string) {
  if (isInCatalog(BASE_CATALOG, make, model)) return;
  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  await supabase.from('custom_models').insert({
    make,
    model,
    status: isAdmin ? 'approved' : 'pending',
    reviewed_at: isAdmin ? new Date().toISOString() : null,
  });
}

type AddBikeInput = {
  year: number;
  make: string;
  model: string;
  currentMileage: number;
};

export async function addBikeAction(input: AddBikeInput): Promise<ActionResult<Motorcycle>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const make = input.make.trim();
  const model = input.model.trim();
  const year = Math.round(input.year);
  const currentMileage = normalizeMileage(input.currentMileage);

  if (!make || !model || !year) {
    return { error: 'Please choose a year, make, and model.' };
  }
  if (currentMileage === null) {
    return { error: 'Please enter a valid odometer reading.' };
  }

  const { data: bike, error } = await supabase
    .from('motorcycles')
    .insert({ user_id: user.id, year, make, model, current_mileage: currentMileage })
    .select()
    .single();

  if (error || !bike) {
    return { error: error?.message ?? 'Unable to add this motorcycle right now.' };
  }

  // The manufacturer's schedule if we have one for this model, else generic tasks.
  // A lookup failure shouldn't block adding the bike, so it falls back too.
  // Nothing has been logged yet, so each task counts from when the bike was new.
  const schedule = await fetchModelSchedule(supabase, { year, make, model });

  const { error: seedError } = await supabase.from('maintenance_tasks').insert(
    getDefaultTasks(schedule.data).map((task) => ({
      ...task,
      motorcycle_id: bike.id,
      user_id: user.id,
      ...fromNewBaseline(year),
    }))
  );

  if (seedError) {
    return {
      data: bike as Motorcycle,
      error: `Added ${make} ${model}, but couldn't create its default maintenance tasks: ${seedError.message}`,
    };
  }

  await suggestCustomModel(supabase, make, model);
  return { data: bike as Motorcycle };
}

/** Changes a bike's year, make, or model. Its tasks and service history are left as they are. */
export async function updateBikeAction(
  bikeId: string,
  input: { year: number; make: string; model: string }
): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const make = input.make.trim();
  const model = input.model.trim();
  const year = Math.round(input.year);
  if (!make || !model || !year) {
    return { error: 'Please choose a year, make, and model.' };
  }

  const { data, error } = await supabase
    .from('motorcycles')
    .update({ year, make, model })
    .eq('id', bikeId)
    .select('id');

  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Motorcycle not found.' };
  await suggestCustomModel(supabase, make, model);
  return {};
}

export async function updateOdometerAction(bikeId: string, mileage: number): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const currentMileage = normalizeMileage(mileage);
  if (currentMileage === null) {
    return { error: 'Please enter a valid odometer reading.' };
  }

  const { data, error } = await supabase
    .from('motorcycles')
    .update({ current_mileage: currentMileage })
    .eq('id', bikeId)
    .select('id');

  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Motorcycle not found.' };
  return {};
}

export async function deleteBikeAction(bikeId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  // Delete children first so this works whether or not the foreign keys cascade.
  for (const table of ['service_logs', 'maintenance_tasks'] as const) {
    const { error } = await supabase.from(table).delete().eq('motorcycle_id', bikeId);
    if (error) return { error: error.message };
  }

  const { error } = await supabase.from('motorcycles').delete().eq('id', bikeId);
  if (error) return { error: error.message };
  return {};
}

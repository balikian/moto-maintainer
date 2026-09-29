'use server';

import { isIsoDate } from '../dates';
import { getDefaultTasks } from '../maintenance';
import { getSignedInClient } from '../supabase/server';
import type { Motorcycle } from '../types';
import { normalizeMileage } from '../units';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Row-level security in Supabase limits every query here to the signed-in
// user's own rows (see supabase/migrations).

type AddBikeInput = {
  year: number;
  make: string;
  model: string;
  currentMileage: number;
  /** The user's local date, used as the baseline for the default tasks. */
  today: string;
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
  if (!isIsoDate(input.today)) {
    return { error: 'Invalid date.' };
  }

  const { data: bike, error } = await supabase
    .from('motorcycles')
    .insert({ user_id: user.id, year, make, model, current_mileage: currentMileage })
    .select()
    .single();

  if (error || !bike) {
    return { error: error?.message ?? 'Unable to add this motorcycle right now.' };
  }

  const { error: seedError } = await supabase.from('maintenance_tasks').insert(
    getDefaultTasks({ year, make, model }).map((task) => ({
      ...task,
      motorcycle_id: bike.id,
      user_id: user.id,
      last_performed_mileage: currentMileage,
      last_performed_date: input.today,
    }))
  );

  if (seedError) {
    return {
      data: bike as Motorcycle,
      error: `Added ${make} ${model}, but couldn't create its default maintenance tasks: ${seedError.message}`,
    };
  }

  return { data: bike as Motorcycle };
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

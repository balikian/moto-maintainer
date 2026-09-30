import type { SupabaseClient } from '@supabase/supabase-js';
import type { BikeManual, ModelEntry, ModelSchedule, Motorcycle } from './types';

// Lookups for the shared per-model tables (bike_manuals, model_schedules).
// Works with either the browser or the server Supabase client; row-level
// security decides what's visible (approved entries, plus your own submissions).

type BikeIdentity = Pick<Motorcycle, 'year' | 'make' | 'model'>;

/** Only plain web links; never javascript:, data:, etc. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && value.trim().length <= 2000;
  } catch {
    return false;
  }
}

/** Escapes % and _ so a make/model is matched literally by ilike (case-insensitive equals). */
function literal(value: string): string {
  return value.trim().replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Chooses which entries apply to a bike: rejected ones never do, approved ones
 * come before the rider's own pending ones, then the narrowest year range
 * (most specific) and the newest.
 */
export function rankMatches<T extends ModelEntry>(entries: T[], year: number): T[] {
  const statusRank = (entry: T) => (entry.status === 'approved' ? 0 : 1);
  return entries
    .filter((entry) => entry.status !== 'rejected' && entry.year_from <= year && year <= entry.year_to)
    .sort(
      (a, b) =>
        statusRank(a) - statusRank(b) ||
        a.year_to - a.year_from - (b.year_to - b.year_from) ||
        b.created_at.localeCompare(a.created_at)
    );
}

export async function fetchManuals(supabase: SupabaseClient, bike: BikeIdentity) {
  const { data, error } = await supabase
    .from('bike_manuals')
    .select('*')
    .ilike('make', literal(bike.make))
    .ilike('model', literal(bike.model))
    .lte('year_from', bike.year)
    .gte('year_to', bike.year);

  return { data: error ? null : rankMatches((data ?? []) as BikeManual[], bike.year), error };
}

/** The best manufacturer schedule for this bike, or null if there isn't one yet. */
export async function fetchModelSchedule(supabase: SupabaseClient, bike: BikeIdentity) {
  const { data, error } = await supabase
    .from('model_schedules')
    .select('*, model_schedule_tasks(*)')
    .ilike('make', literal(bike.make))
    .ilike('model', literal(bike.model))
    .lte('year_from', bike.year)
    .gte('year_to', bike.year);

  if (error) return { data: null, error };
  const best = rankMatches((data ?? []) as ModelSchedule[], bike.year)[0] ?? null;
  return { data: best, error: null };
}

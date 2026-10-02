import motorcyclesData from './data/motorcycles.json';
import type { ModelEntry } from './types';

// The make/model lists for the bike form: the NHTSA list in data/motorcycles.json
// plus makes and models riders added that an admin approved (custom_models).

export type BikeCatalog = Record<string, { years: number[]; models: string[] }>;
export type CustomModel = { make: string; model: string };

export const BASE_CATALOG = motorcyclesData as BikeCatalog;

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** True when this make and model are already in the catalog (ignoring case). */
export function isInCatalog(catalog: BikeCatalog, make: string, model: string): boolean {
  const knownMake = Object.keys(catalog).find((name) => sameName(name, make));
  return Boolean(knownMake && catalog[knownMake].models.some((name) => sameName(name, model)));
}

/** Adds riders' makes and models to the catalog, keeping the catalog's spelling where they overlap. */
export function mergeCatalog(base: BikeCatalog, custom: CustomModel[]): BikeCatalog {
  const merged: BikeCatalog = Object.fromEntries(
    Object.entries(base).map(([make, entry]) => [make, { years: entry.years, models: [...entry.models] }])
  );

  for (const { make, model } of custom) {
    const cleanMake = make.trim();
    const cleanModel = model.trim();
    if (!cleanMake || !cleanModel) continue;

    const key = Object.keys(merged).find((name) => sameName(name, cleanMake)) ?? cleanMake;
    const entry = (merged[key] ??= { years: [], models: [] });
    if (!entry.models.some((name) => sameName(name, cleanModel))) {
      entry.models.push(cleanModel);
      entry.models.sort((a, b) => a.localeCompare(b));
    }
  }
  return merged;
}

/**
 * Approved manuals that no schedule covers yet, so an admin knows which bikes
 * still need their schedule imported. A schedule covers a manual when the make
 * and model match (ignoring case) and their year ranges overlap.
 */
export function manualsWithoutSchedule<M extends ModelEntry>(manuals: M[], schedules: ModelEntry[]): M[] {
  return manuals.filter(
    (manual) =>
      manual.status === 'approved' &&
      !schedules.some(
        (schedule) =>
          schedule.status !== 'rejected' &&
          sameName(schedule.make, manual.make) &&
          sameName(schedule.model, manual.model) &&
          schedule.year_from <= manual.year_to &&
          manual.year_from <= schedule.year_to
      )
  );
}

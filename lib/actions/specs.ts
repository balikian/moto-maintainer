'use server';

import { literalPattern } from '../modelData';
import { modelsToSave } from '../scheduleImport';
import { cleanSpecValues, type SpecValues } from '../specs';
import { getSignedInClient } from '../supabase/server';
import type { ReviewStatus } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

type SaveSpecsInput = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  source: string;
  specs: SpecValues;
  /** Admins only: other models of the same make the manual covers, each saved a copy. */
  alsoModels?: string[];
};

/**
 * Saves reviewed manual specs as the shared specs for this model, and for any
 * other models an admin listed. Admins' saves are approved immediately, like
 * saveModelScheduleAction's. Bikes show them under their own values.
 */
export async function saveModelSpecsAction(
  input: SaveSpecsInput
): Promise<ActionResult<{ status: ReviewStatus; models: string[]; count: number }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const make = input.make.trim();
  const model = input.model.trim();
  const yearFrom = Math.round(input.yearFrom);
  const yearTo = Math.round(input.yearTo);
  if (!make || !model) return { error: 'Make and model are required.' };
  if (!Number.isInteger(yearFrom) || !Number.isInteger(yearTo) || yearFrom > yearTo || yearFrom < 1900 || yearTo > 2100) {
    return { error: 'Please enter a valid range of model years.' };
  }

  const specs = cleanSpecValues(input.specs);
  const count = Object.keys(specs).length;
  if (count === 0) return { error: 'Add at least one spec.' };

  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  const status: ReviewStatus = isAdmin ? 'approved' : 'pending';
  const source = input.source.trim().slice(0, 300) || null;
  const models = modelsToSave(model, input.alsoModels, Boolean(isAdmin));

  for (const [index, current] of models.entries()) {
    const { data: saved, error } = await supabase
      .from('model_specs')
      .insert({
        make,
        model: current,
        year_from: yearFrom,
        year_to: yearTo,
        specs,
        source,
        status,
        submitted_by: user.id,
        reviewed_at: isAdmin ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    const savedSoFar = models.slice(0, index).join(', ');
    const failed = (message: string) => ({ error: savedSoFar ? `Saved for ${savedSoFar}, but not ${current}: ${message}` : message });
    if (error || !saved) return failed(error?.message ?? 'Unable to save the specs.');

    // An admin's import replaces earlier specs for exactly this model and years.
    if (isAdmin) {
      const { error: cleanupError } = await supabase
        .from('model_specs')
        .delete()
        .ilike('make', literalPattern(make))
        .ilike('model', literalPattern(current))
        .eq('year_from', yearFrom)
        .eq('year_to', yearTo)
        .neq('id', saved.id);
      if (cleanupError) return failed(`Saved, but couldn’t remove the older copy: ${cleanupError.message}`);
    }
  }

  return { data: { status, models, count } };
}

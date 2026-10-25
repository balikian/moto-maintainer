'use server';

import { revalidatePath } from 'next/cache';
import { BASE_CATALOG, isInCatalog, mergeCatalog } from '../bikeCatalog';
import { isHttpUrl, literalPattern } from '../modelData';
import { getSignedInClient } from '../supabase/server';
import type { ReviewStatus } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Writes to the shared per-model tables. Row-level security enforces the
// rules: anyone signed in can submit (as pending), only admins can approve.

type ManualInput = {
  make: string;
  model: string;
  year: number;
  url: string;
  label?: string;
};

export async function submitManualAction(input: ManualInput): Promise<ActionResult<{ status: ReviewStatus }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const url = input.url.trim();
  if (!isHttpUrl(url)) return { error: 'Please paste a full web link, starting with https://' };

  const make = input.make.trim();
  const model = input.model.trim();
  const year = Math.round(input.year);
  if (!make || !model || !year) return { error: 'This bike is missing its make, model, or year.' };

  // Admins' links go live immediately; everyone else's wait for review.
  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  const status: ReviewStatus = isAdmin ? 'approved' : 'pending';

  const { error } = await supabase.from('bike_manuals').insert({
    make,
    model,
    year_from: year,
    year_to: year,
    url,
    label: input.label?.trim() || "Owner's manual",
    status,
    submitted_by: user.id,
    reviewed_at: isAdmin ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { data: { status } };
}

export async function deleteManualAction(manualId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data, error } = await supabase.from('bike_manuals').delete().eq('id', manualId).select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Only links that are still waiting for review can be removed.' };

  revalidatePath('/admin');
  return {};
}

/**
 * Approves or rejects a make/model riders typed in, from the admin page. The
 * admin can fix its spelling while approving.
 */
export async function reviewCustomModelAction(formData: FormData): Promise<void> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return;

  const id = String(formData.get('id') ?? '');
  const decision = formData.get('decision') === 'approve' ? 'approved' : 'rejected';
  const changes: Record<string, string> = { status: decision, reviewed_at: new Date().toISOString() };
  if (decision === 'approved') {
    const make = String(formData.get('make') ?? '').trim();
    const model = String(formData.get('model') ?? '').trim();
    if (make) changes.make = make;
    if (model) changes.model = model;
  }

  // Non-admins are refused by row-level security, so this is a no-op for them.
  await supabase.from('custom_models').update(changes).eq('id', id);
  revalidatePath('/admin');
}

/**
 * Approves or rejects a submitted manual link from the admin page. The admin
 * can also correct the model name and widen the year range while approving.
 */
export async function reviewManualAction(formData: FormData): Promise<void> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return;

  const id = String(formData.get('id') ?? '');
  const decision = formData.get('decision') === 'approve' ? 'approved' : 'rejected';
  const changes: Record<string, string | number> = { status: decision, reviewed_at: new Date().toISOString() };

  if (decision === 'approved') {
    const model = String(formData.get('model') ?? '').trim();
    const yearFrom = Number(formData.get('year_from'));
    const yearTo = Number(formData.get('year_to'));
    if (model) changes.model = model;
    if (Number.isInteger(yearFrom) && Number.isInteger(yearTo) && yearFrom <= yearTo) {
      changes.year_from = yearFrom;
      changes.year_to = yearTo;
    }
  }

  // Non-admins are refused by row-level security, so this is a no-op for them.
  await supabase.from('bike_manuals').update(changes).eq('id', id);
  revalidatePath('/admin');
}

type AdminManualInput = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  url: string;
};

/**
 * Admin-only, from the admin page's "Add a schedule": saves a manual link for
 * a model and range of years, approved at once, so the admin needn't add the
 * bike to a garage first. A make or model that isn't in the dropdown lists is
 * added to them, approved. The same link for the same model isn't saved twice.
 */
export async function addManualAsAdminAction(input: AdminManualInput): Promise<ActionResult<{ added: boolean }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };
  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  if (!isAdmin) return { error: 'Only admins can do this.' };

  const make = input.make.trim();
  const model = input.model.trim();
  const url = input.url.trim();
  const yearFrom = Math.round(input.yearFrom);
  const yearTo = Math.round(input.yearTo);
  if (!make || !model) return { error: 'Make and model are required.' };
  if (!Number.isInteger(yearFrom) || !Number.isInteger(yearTo) || yearFrom > yearTo || yearFrom < 1900 || yearTo > 2100) {
    return { error: 'Please enter a valid range of model years.' };
  }
  if (!isHttpUrl(url)) return { error: 'Please paste a full web link, starting with https://' };

  const now = new Date().toISOString();
  const { data: customModels, error: modelsError } = await supabase.from('custom_models').select('make,model').eq('status', 'approved');
  if (modelsError) return { error: modelsError.message };
  if (!isInCatalog(mergeCatalog(BASE_CATALOG, customModels ?? []), make, model)) {
    const { error } = await supabase
      .from('custom_models')
      .insert({ make, model, status: 'approved', submitted_by: user.id, reviewed_at: now });
    if (error) return { error: error.message };
  }

  const existing = await supabase
    .from('bike_manuals')
    .select('id')
    .ilike('make', literalPattern(make))
    .ilike('model', literalPattern(model))
    .eq('url', url)
    .neq('status', 'rejected')
    .limit(1);
  if (existing.error) return { error: existing.error.message };
  if ((existing.data ?? []).length > 0) return { data: { added: false } };

  const { error } = await supabase.from('bike_manuals').insert({
    make,
    model,
    year_from: yearFrom,
    year_to: yearTo,
    url,
    label: "Owner's manual",
    status: 'approved',
    submitted_by: user.id,
    reviewed_at: now,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { data: { added: true } };
}

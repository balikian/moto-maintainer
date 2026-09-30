'use server';

import { PDFDocument } from 'pdf-lib';
import { isIsoDate } from '../dates';
import { getDefaultTasks } from '../maintenance';
import { fetchModelSchedule } from '../modelData';
import { MAX_IMPORT_PAGES } from '../pageRanges';
import { extractScheduleFromPdf, ScheduleExtractionError, type ExtractedSchedule, type ExtractedTask } from '../scheduleExtraction';
import { getSignedInClient } from '../supabase/server';
import type { Motorcycle, ReviewStatus } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

const MAX_PDF_BYTES = 8 * 1024 * 1024;

/**
 * Reads the maintenance schedule from a few owner's-manual pages. The browser
 * sends only the pages the rider picked, so this stays small and cheap.
 * Admin-only for now, since every call is billed to the app's Anthropic key.
 */
export async function extractScheduleAction(formData: FormData): Promise<ActionResult<ExtractedSchedule>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  if (!isAdmin) return { error: 'Importing schedules from manuals is limited to admins for now.' };

  const file = formData.get('pdf');
  const bike = {
    year: Number(formData.get('year')),
    make: String(formData.get('make') ?? '').trim(),
    model: String(formData.get('model') ?? '').trim(),
  };
  if (!(file instanceof File)) return { error: 'No PDF was uploaded.' };
  if (file.size > MAX_PDF_BYTES) return { error: 'Those pages are too large to send. Try fewer pages.' };
  if (!bike.make || !bike.model || !bike.year) return { error: 'This bike is missing its make, model, or year.' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  let pageCount: number;
  try {
    pageCount = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
  } catch {
    return { error: 'That file isn’t a readable PDF.' };
  }
  if (pageCount > MAX_IMPORT_PAGES) return { error: `Please send at most ${MAX_IMPORT_PAGES} pages.` };

  try {
    const schedule = await extractScheduleFromPdf(Buffer.from(bytes).toString('base64'), bike);
    return { data: schedule };
  } catch (error) {
    if (error instanceof ScheduleExtractionError) return { error: error.message };
    throw error;
  }
}

type SaveScheduleInput = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  source: string;
  tasks: ExtractedTask[];
};

/** Saves a reviewed schedule as the shared schedule for this model. Admins' saves are approved immediately. */
export async function saveModelScheduleAction(
  input: SaveScheduleInput
): Promise<ActionResult<{ id: string; status: ReviewStatus }>> {
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

  const tasks = input.tasks
    .map((task, index) => ({
      task_name: task.task_name.trim().slice(0, 120),
      interval_distance: Math.max(0, Math.round(Number(task.interval_distance) || 0)),
      distance_unit: task.distance_unit === 'km' ? 'km' : 'mi',
      interval_months: Math.max(0, Math.round(Number(task.interval_months) || 0)),
      is_diy: Boolean(task.is_diy),
      sort_order: index,
    }))
    .filter((task) => task.task_name && (task.interval_distance > 0 || task.interval_months > 0));
  if (tasks.length === 0) return { error: 'Add at least one task with an interval.' };

  const { data: isAdmin } = await supabase.rpc('is_app_admin');
  const status: ReviewStatus = isAdmin ? 'approved' : 'pending';

  const { data: schedule, error } = await supabase
    .from('model_schedules')
    .insert({
      make,
      model,
      year_from: yearFrom,
      year_to: yearTo,
      source: input.source.trim().slice(0, 300) || null,
      status,
      submitted_by: user.id,
      reviewed_at: isAdmin ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !schedule) return { error: error?.message ?? 'Unable to save the schedule.' };

  const { error: tasksError } = await supabase
    .from('model_schedule_tasks')
    .insert(tasks.map((task) => ({ ...task, schedule_id: schedule.id })));
  if (tasksError) {
    // Don't leave an empty schedule behind.
    await supabase.from('model_schedules').delete().eq('id', schedule.id);
    return { error: tasksError.message };
  }

  return { data: { id: schedule.id as string, status } };
}

/**
 * Brings a bike's checklist in line with its manufacturer schedule: tasks with
 * the same name get the schedule's intervals, missing ones are added (counted
 * from the bike's current odometer and today), and anything else is kept.
 */
export async function applyModelScheduleAction(
  bikeId: string,
  today: string
): Promise<ActionResult<{ updated: number; added: number }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };
  if (!isIsoDate(today)) return { error: 'Invalid date.' };

  const bikeLookup = await supabase.from('motorcycles').select('*').eq('id', bikeId).maybeSingle();
  if (bikeLookup.error) return { error: bikeLookup.error.message };
  const bike = bikeLookup.data as Motorcycle | null;
  if (!bike) return { error: 'Motorcycle not found.' };

  const schedule = await fetchModelSchedule(supabase, bike);
  if (schedule.error) return { error: schedule.error.message };
  if (!schedule.data) return { error: `There's no manufacturer schedule for the ${bike.year} ${bike.make} ${bike.model} yet.` };

  const existing = await supabase.from('maintenance_tasks').select('id,task_name').eq('motorcycle_id', bike.id);
  if (existing.error) return { error: existing.error.message };
  const existingByName = new Map(
    (existing.data ?? []).map((task) => [String(task.task_name).trim().toLowerCase(), task.id as string])
  );

  let updated = 0;
  const toAdd = [];
  for (const task of getDefaultTasks(schedule.data)) {
    const existingId = existingByName.get(task.task_name.trim().toLowerCase());
    if (existingId) {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ interval_mileage: task.interval_mileage, interval_months: task.interval_months, is_diy: task.is_diy })
        .eq('id', existingId);
      if (error) return { error: error.message };
      updated += 1;
    } else {
      toAdd.push({
        ...task,
        motorcycle_id: bike.id,
        user_id: user.id,
        last_performed_mileage: bike.current_mileage,
        last_performed_date: today,
      });
    }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from('maintenance_tasks').insert(toAdd);
    if (error) return { error: error.message };
  }

  return { data: { updated, added: toAdd.length } };
}

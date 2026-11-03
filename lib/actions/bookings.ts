'use server';

import { cleanBooking, type BookingInput } from '../bookings';
import { getSignedInClient } from '../supabase/server';
import type { ServiceBooking } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Row-level security limits these to the signed-in rider's own bookings; the
// table's foreign keys keep each one on the rider's own bike and shop.

/** The database's message, or a plain one when the shop or bike is gone (removed in another tab). */
const saveError = (error: { code?: string; message: string }) =>
  error.code === '23503'
    ? error.message.includes('shop')
      ? 'That shop isn’t in your list anymore. Pick another one.'
      : 'Motorcycle not found.'
    : error.message;

/** Adds a booking for the bike, or changes one (`bookingId`). */
export async function saveBookingAction(
  input: BookingInput & { motorcycleId: string; bookingId?: string }
): Promise<ActionResult<ServiceBooking>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const cleaned = cleanBooking(input ?? {});
  if ('error' in cleaned) return cleaned;

  // Only the bike's own tasks.
  const { data: tasks, error: tasksError } = await supabase
    .from('maintenance_tasks')
    .select('id')
    .eq('motorcycle_id', input.motorcycleId)
    .in('id', cleaned.booking.task_ids.length > 0 ? cleaned.booking.task_ids : ['00000000-0000-0000-0000-000000000000']);
  if (tasksError) return { error: tasksError.message };
  const ownTaskIds = new Set((tasks ?? []).map((task) => String(task.id)));
  const booking = { ...cleaned.booking, task_ids: cleaned.booking.task_ids.filter((id) => ownTaskIds.has(id)) };

  const query = input.bookingId
    ? supabase.from('service_bookings').update(booking).eq('id', input.bookingId).eq('motorcycle_id', input.motorcycleId)
    : supabase.from('service_bookings').insert({ ...booking, user_id: user.id, motorcycle_id: input.motorcycleId });
  const { data, error } = await query.select().maybeSingle();
  if (error) return { error: saveError(error) };
  if (!data) return { error: 'Booking not found.' };
  return { data: data as ServiceBooking };
}

/** Removes a booking: cancelled, or logged as service. */
export async function deleteBookingAction(bookingId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.from('service_bookings').delete().eq('id', bookingId);
  if (error) return { error: error.message };
  return {};
}

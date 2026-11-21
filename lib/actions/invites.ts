'use server';

import { revalidatePath } from 'next/cache';
import { newInviteCode } from '../invites';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Admin page: invite links and founding riders
// (supabase/migrations/20261121120000_founding_riders.sql). Row-level
// security and the admin functions refuse anyone who isn't an admin.

export async function createInviteAction(note: string): Promise<ActionResult<{ code: string }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const code = newInviteCode();
  const { error } = await supabase.from('invites').insert({ code, note: note.trim().slice(0, 200) || null });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { data: { code } };
}

/** Turns an invite link off (no one new joins through it) or back on. */
export async function setInviteActiveAction(code: string, active: boolean): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data, error } = await supabase.from('invites').update({ active }).eq('code', code).select('code');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'That invite link wasn’t found.' };

  revalidatePath('/admin');
  return {};
}

/** Makes a rider a founding rider by their sign-in email, for riders who signed up without the link. */
export async function addFoundingRiderAction(email: string): Promise<ActionResult<{ status: 'added' | 'already' }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const address = email.trim();
  if (!address.includes('@')) return { error: 'Enter the email they sign in with.' };

  const { data, error } = await supabase.rpc('admin_add_founding_rider', { p_email: address });
  if (error) return { error: error.message };
  if (data === 'not_found') return { error: `No rider signs in as ${address}. They need to sign up first.` };

  revalidatePath('/admin');
  return { data: { status: data === 'already' ? 'already' : 'added' } };
}

export async function removeFoundingRiderAction(userId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data, error } = await supabase.from('founding_riders').delete().eq('user_id', userId).select('user_id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'That rider wasn’t a founding rider.' };

  revalidatePath('/admin');
  return {};
}

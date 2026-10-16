'use server';

import { redirect } from 'next/navigation';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

/** The word the rider types to confirm (see DeleteAccountModal); checked here too, so a stray call can't delete anything. */
const DELETE_CONFIRMATION = 'DELETE';

/**
 * Deletes the signed-in rider's account and everything they own (see the
 * `delete_my_account` database function), signs them out, and goes home.
 */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim() !== DELETE_CONFIRMATION) return { error: `Type ${DELETE_CONFIRMATION} to confirm.` };

  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: `Couldn't delete your account: ${error.message}` };

  // The account is gone; this clears the sign-in cookies. The home page
  // shows an "account deleted" note for ?deleted.
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}

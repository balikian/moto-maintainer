'use server';

import { randomBytes } from 'node:crypto';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

/** Returns the bike's active share token, creating one if it doesn't have one yet. */
export async function createShareLinkAction(bikeId: string): Promise<ActionResult<{ token: string }>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const existing = await supabase
    .from('history_shares')
    .select('token')
    .eq('motorcycle_id', bikeId)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle();
  if (existing.error) return { error: existing.error.message };
  if (existing.data) return { data: { token: existing.data.token as string } };

  // 24 random bytes → 32 URL-safe characters; not guessable.
  const token = randomBytes(24).toString('base64url');
  const { error } = await supabase
    .from('history_shares')
    .insert({ token, user_id: user.id, motorcycle_id: bikeId });
  if (error) return { error: error.message };

  return { data: { token } };
}

/** Turns off every active share link for the bike. Old links stop working immediately. */
export async function revokeShareLinkAction(bikeId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase
    .from('history_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('motorcycle_id', bikeId)
    .is('revoked_at', null);
  if (error) return { error: error.message };
  return {};
}

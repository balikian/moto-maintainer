'use server';

import { cleanShop, type ShopInput } from '../shops';
import { getSignedInClient } from '../supabase/server';
import type { Shop } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// Row-level security limits these to the signed-in rider's own shops.

export async function createShopAction(input: ShopInput): Promise<ActionResult<Shop>> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const cleaned = cleanShop(input ?? {});
  if ('error' in cleaned) return cleaned;

  const { data, error } = await supabase
    .from('shops')
    .insert({ user_id: user.id, ...cleaned.shop })
    .select()
    .single();
  if (error || !data) return { error: error?.message ?? 'Unable to save this shop right now.' };
  return { data: data as Shop };
}

export async function updateShopAction(shopId: string, input: ShopInput): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const cleaned = cleanShop(input ?? {});
  if ('error' in cleaned) return cleaned;

  const { data, error } = await supabase.from('shops').update(cleaned.shop).eq('id', shopId).select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Shop not found.' };
  return {};
}

/** Removes a shop. Bikes that used it are left with none; service records keep the name they were logged with. */
export async function deleteShopAction(shopId: string): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.from('shops').delete().eq('id', shopId);
  if (error) return { error: error.message };
  return {};
}

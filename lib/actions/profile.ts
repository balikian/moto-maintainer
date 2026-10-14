'use server';

import { getSignedInClient } from '../supabase/server';
import type { Theme, UnitSystem } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

export async function updatePreferencesAction(
  preferences: { unitSystem?: UnitSystem; theme?: Theme; activeBikeId?: string | null }
): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const changes: { unit_system?: UnitSystem; theme?: Theme; active_bike_id?: string | null } = {};
  if (preferences.activeBikeId === null) {
    changes.active_bike_id = null;
  } else if (typeof preferences.activeBikeId === 'string') {
    // Row-level security hides other riders' bikes, so this finds only the user's own.
    const bike = await supabase.from('motorcycles').select('id').eq('id', preferences.activeBikeId).maybeSingle();
    if (bike.error) return { error: `Couldn't save your settings: ${bike.error.message}` };
    if (!bike.data) return { error: 'That bike isn’t in your garage.' };
    changes.active_bike_id = preferences.activeBikeId;
  }
  if (preferences.unitSystem === 'imperial' || preferences.unitSystem === 'metric') {
    changes.unit_system = preferences.unitSystem;
  }
  if (preferences.theme === 'dark' || preferences.theme === 'light' || preferences.theme === 'system') {
    changes.theme = preferences.theme;
  }
  if (Object.keys(changes).length === 0) return {};

  // Update the existing profile row. Only create one if the user doesn't have
  // it yet, so saving a setting never touches the other profile columns.
  const updated = await supabase.from('profiles').update(changes).eq('id', user.id).select('id');
  if (updated.error) return { error: `Couldn't save your settings: ${updated.error.message}` };
  if (updated.data.length > 0) return {};

  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '';
  const inserted = await supabase.from('profiles').insert({ id: user.id, full_name: fullName, ...changes });
  if (inserted.error) return { error: `Couldn't save your settings: ${inserted.error.message}` };
  return {};
}

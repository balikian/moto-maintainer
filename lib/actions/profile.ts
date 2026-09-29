'use server';

import { getSignedInClient } from '../supabase/server';
import type { Theme, UnitSystem } from '../types';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

export async function updatePreferencesAction(
  preferences: { unitSystem?: UnitSystem; theme?: Theme }
): Promise<ActionResult> {
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const changes: { unit_system?: UnitSystem; theme?: Theme } = {};
  if (preferences.unitSystem === 'imperial' || preferences.unitSystem === 'metric') {
    changes.unit_system = preferences.unitSystem;
  }
  if (preferences.theme === 'dark' || preferences.theme === 'light') {
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

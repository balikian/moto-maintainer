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

  const { error } = await supabase.from('profiles').upsert({ id: user.id, ...changes });
  if (error) return { error: `Couldn't save your settings: ${error.message}` };
  return {};
}

'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updatePreferencesAction } from '@/lib/actions/profile';
import type { Theme, UnitSystem } from '@/lib/types';
import { useSupabaseQuery } from './useSupabaseQuery';

type Preferences = { unitSystem: UnitSystem; theme: Theme };

const DEFAULT_PREFERENCES: Preferences = { unitSystem: 'imperial', theme: 'dark' };

/** Units and theme, saved to the user's row in `profiles` so they survive reloads and devices. */
export function usePreferences(supabase: SupabaseClient, userId: string | null, onError: (message: string) => void) {
  const profile = useSupabaseQuery<Record<string, unknown>>(userId, (id) =>
    // select('*') so this still works before the `theme` column migration has been run.
    supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  );
  const [overrides, setOverrides] = useState<Partial<Preferences>>({});

  const saved = profile.data ?? {};
  const preferences: Preferences = {
    unitSystem: overrides.unitSystem
      ?? (saved.unit_system === 'metric' || saved.unit_system === 'km' ? 'metric' : DEFAULT_PREFERENCES.unitSystem),
    theme: overrides.theme ?? (saved.theme === 'light' ? 'light' : DEFAULT_PREFERENCES.theme),
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
  }, [preferences.theme]);

  const update = async (changes: Partial<Preferences>) => {
    setOverrides((previous) => ({ ...previous, ...changes }));
    const result = await updatePreferencesAction(changes);
    if (result.error) onError(result.error);
  };

  return { preferences, updatePreferences: update };
}

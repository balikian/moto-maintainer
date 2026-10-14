'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updatePreferencesAction } from '@/lib/actions/profile';
import { isDarkTheme, parseTheme, THEME_STORAGE_KEY } from '@/lib/theme';
import type { Theme, UnitSystem } from '@/lib/types';
import { useSupabaseQuery } from './useSupabaseQuery';

type Preferences = {
  unitSystem: UnitSystem;
  theme: Theme;
  /** The bike the rider last picked; null for "the first one". */
  activeBikeId: string | null;
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Units, theme and active bike, saved to the user's row in `profiles` so they follow the rider across reloads and devices. */
export function usePreferences(supabase: SupabaseClient, userId: string | null, onError: (message: string) => void) {
  const profile = useSupabaseQuery<Record<string, unknown>>(userId, (id) =>
    // select('*') so this still works before newer columns' migrations have been run.
    supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  );
  const [overrides, setOverrides] = useState<Partial<Preferences>>({});

  const saved = profile.data ?? {};
  const preferences: Preferences = {
    unitSystem: overrides.unitSystem ?? (saved.unit_system === 'metric' || saved.unit_system === 'km' ? 'metric' : 'imperial'),
    theme: overrides.theme ?? parseTheme(saved.theme),
    activeBikeId: overrides.activeBikeId !== undefined
      ? overrides.activeBikeId
      : typeof saved.active_bike_id === 'string' ? saved.active_bike_id : null,
  };
  // Until the profile loads, keep whatever the boot script in layout.tsx applied.
  const themeKnown = overrides.theme !== undefined || (userId !== null && !profile.loading);

  useEffect(() => {
    if (!themeKnown) return;
    const theme = preferences.theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable; the theme still applies for this visit.
    }

    const media = window.matchMedia(DARK_QUERY);
    const apply = () => document.documentElement.classList.toggle('dark', isDarkTheme(theme, media.matches));
    apply();
    if (theme !== 'system') return;
    // Auto: follow the device when it switches (e.g. at sunset).
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [themeKnown, preferences.theme]);

  const update = async (changes: Partial<Preferences>) => {
    setOverrides((previous) => ({ ...previous, ...changes }));
    const result = await updatePreferencesAction(changes);
    if (result.error) onError(result.error);
  };

  return { preferences, updatePreferences: update, loading: profile.loading };
}

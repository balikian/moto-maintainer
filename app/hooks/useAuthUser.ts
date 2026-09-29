'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/** The signed-in user: `undefined` while checking, `null` when signed out. */
export function useAuthUser(supabase: SupabaseClient) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // Fires once immediately with the current session, then on every change.
    // Supabase warns against awaiting other Supabase calls inside this
    // callback, so data loading happens in separate effects keyed on the user.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return user;
}

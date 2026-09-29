'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';

type QueryResponse<T> = { data: T | null; error: { message: string } | null };

/**
 * Loads data for `key` (e.g. a user id or bike id) and reloads whenever the
 * key changes or `reload()` is called. Pass `null` as the key to skip loading.
 * Results from a stale key are never shown for the current one.
 */
export function useSupabaseQuery<T>(
  key: string | null,
  fetcher: (key: string) => PromiseLike<QueryResponse<T>>
) {
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  const runFetcher = useEffectEvent((currentKey: string) => fetcher(currentKey));

  useEffect(() => {
    if (key === null) return;

    let active = true;
    runFetcher(key).then(({ data, error }) => {
      if (active) setResult({ key, data, error: error?.message ?? null });
    });

    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((previous) => previous + 1), []);
  const current = key !== null && result?.key === key ? result : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
    reload,
  };
}

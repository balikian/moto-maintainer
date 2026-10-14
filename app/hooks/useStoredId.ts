'use client';

import { useState } from 'react';

// An id remembered per browser (like "which bike was I looking at?"), so it
// survives reloads and signing out and back in. Like useStoredToggle, it
// lives in localStorage, which can be unavailable (e.g. private browsing);
// then it's remembered for this visit only.

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; keep the in-memory value only.
  }
}

export function useStoredId(key: string): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState(() => read(key));

  const update = (next: string | null) => {
    save(key, next);
    setValue(next);
  };

  return [value, update];
}

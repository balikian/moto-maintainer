'use client';

import { useState } from 'react';

// A true/false view preference (like "is this section collapsed?") remembered
// per browser. It isn't account data, so it lives in localStorage, which can be
// unavailable (e.g. private browsing); the toggle still works for that visit.

function read(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === 'true';
  } catch {
    return fallback;
  }
}

function save(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable; keep the in-memory value only.
  }
}

export function useStoredToggle(key: string, fallback: boolean): [boolean, () => void] {
  const [value, setValue] = useState(() => read(key, fallback));

  const toggle = () => {
    setValue((previous) => {
      save(key, !previous);
      return !previous;
    });
  };

  return [value, toggle];
}

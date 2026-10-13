import type { Theme } from './types';

// The rider's theme setting: Auto ('system') follows the phone or computer;
// Light and Dark override it. Saved to `profiles.theme`, and cached in this
// browser so the first paint already uses it (see THEME_BOOT_SCRIPT).

export const THEME_STORAGE_KEY = 'moto-maintain:theme';

/** A saved value, read leniently: anything unknown means Auto. */
export function parseTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function isDarkTheme(theme: Theme, systemPrefersDark: boolean): boolean {
  return theme === 'system' ? systemPrefersDark : theme === 'dark';
}

/**
 * Runs in <head> before the page paints: applies the cached theme, so riders
 * on a light phone don't see a dark flash while their profile loads.
 */
export const THEME_BOOT_SCRIPT = `(function () {
  try {
    var saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();`;

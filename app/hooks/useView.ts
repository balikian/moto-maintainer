'use client';

import { useSearchParams } from 'next/navigation';

/** The dashboard's screens, one per bottom-bar tab. */
export type View = 'tasks' | 'history' | 'garage' | 'more';

const VIEWS: readonly View[] = ['tasks', 'history', 'garage', 'more'];

export const viewHref = (view: View) => (view === 'tasks' ? '/' : `/?view=${view}`);

/**
 * The open screen, kept in the URL (`/?view=history`) so the back button,
 * reloads and links work. Switching uses pushState, which Next.js syncs with
 * useSearchParams without a server round trip.
 */
export function useView(): [View, (view: View) => void] {
  const param = useSearchParams().get('view');
  const view = VIEWS.find((candidate) => candidate === param) ?? 'tasks';

  const go = (next: View) => {
    if (next !== view) window.history.pushState(null, '', viewHref(next));
    window.scrollTo(0, 0);
  };

  return [view, go];
}

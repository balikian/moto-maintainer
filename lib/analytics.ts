import { track } from '@vercel/analytics';

// Vercel Web Analytics: page views and a few product events, production only
// (app/components/SiteAnalytics.tsx renders the script there, and track() does
// nothing without it). No cookies, and never names, emails or ids: event
// properties are counts, flags and bike makes and models.

/** Each event and its properties (Vercel's Pro plan keeps two per event). */
type AnalyticsEvents = {
  'Bike added': { make: string; model: string };
  'Service logged': { tasks: number; past: boolean };
  'Start points set': { start: 'today' | 'new'; tasks: number };
  'Schedule applied': Record<string, never>;
  'Custom task added': Record<string, never>;
  'Share link created': Record<string, never>;
  'Push turned on': Record<string, never>;
  'Backup imported': { bikes: number };
  'Getting started closed': Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  ...properties: AnalyticsEvents[Name] extends Record<string, never> ? [] : [AnalyticsEvents[Name]]
): void {
  try {
    track(name, properties[0]);
  } catch {
    // Analytics must never break the app.
  }
}

/** Path segments that are secrets or private ids, replaced by a placeholder. */
const PRIVATE_PATHS: [RegExp, string][] = [
  [/^\/share\/[^/]+/, '/share/[token]'],
  [/^\/history\/[^/]+/, '/history/[bike]'],
];

/** Query parameters worth keeping: which screen of the dashboard. */
const KEPT_PARAMS = ['view'];

/**
 * The address sent with a page view or event, without share tokens, bike ids,
 * unsubscribe tokens, sign-in codes or anything else in the query string.
 */
export function redactAnalyticsUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url.split(/[?#]/)[0];
  }
  for (const [pattern, placeholder] of PRIVATE_PATHS) {
    parsed.pathname = parsed.pathname.replace(pattern, placeholder);
  }
  const kept = KEPT_PARAMS.flatMap((name) => {
    const value = parsed.searchParams.get(name);
    return value ? [[name, value]] : [];
  });
  parsed.search = new URLSearchParams(kept).toString();
  parsed.hash = '';
  return decodeURI(parsed.toString());
}

import { createBrowserClient } from '@supabase/ssr';
import { SESSION_COOKIE_ROUTE } from '@/lib/authCookies';

let savingFromServer = false;

export function createClient() {
  // One client per browser tab (createBrowserClient keeps a single instance).
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // The client renews the session itself while a page is open, and saves it
  // with document.cookie, which Safari keeps for only 7 days. Have the server
  // send the same cookies back, so they last (lib/authCookies.ts).
  if (typeof window !== 'undefined' && !savingFromServer) {
    savingFromServer = true;
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void fetch(SESSION_COOKIE_ROUTE, { method: 'POST' }).catch(() => {});
      }
    });
  }

  return supabase;
}

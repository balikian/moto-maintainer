We are building a Next.js (App Router) motorcycle maintenance tracker ("MOTO_MAINTAIN") using Supabase for backend database and auth. 

Current Progress:
- We set up Supabase Auth using relative paths to bypass TS alias issues.
- We created lib/supabase/client.ts and lib/supabase/server.ts using @supabase/ssr.
- We created server actions in lib/actions/auth.ts to trigger signInWithGoogle and signInWithApple.
- app/page.tsx has a client-side useEffect session listener.
- If unauthenticated, page.tsx blocks the dashboard and renders an inline dark-themed Google/Apple OAuth card.
- If authenticated, it renders the mock garage dashboard normally.
- We configured a Google Cloud Developer project, set up the OAuth consent screen, generated a Web Client ID/Secret, added the Supabase callback redirect URI, and successfully enabled the Google Provider in the Supabase dashboard.

Next Steps:
1. Update the header user avatar to display the authenticated user's Google/Apple profile picture instead of the generic icon.
2. Configure Apple Auth.
3. Transition from mock garage data to actual PostgreSQL database queries.
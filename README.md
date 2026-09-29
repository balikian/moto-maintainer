# MOTO_MAINTAIN

A digital garage for motorcycle maintenance. Add your bikes, track service
tasks by mileage and time (whichever comes first), and keep a service history.

Built with Next.js (App Router), React, Tailwind CSS, and Supabase (auth + Postgres).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with your Supabase project's URL and publishable key
   (Supabase dashboard → Project Settings → API):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   # Optional; defaults to http://localhost:3000. Used for sign-in redirects.
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   The app never needs the secret (service-role) key. Don't put it here.

3. Apply the database migrations in `supabase/migrations/` (in order) using the
   Supabase SQL Editor.

4. Run the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the scheduling and date logic (`lib/**/*.test.ts`) |
| `npm run sync:bikes` | Refresh the make/model list in `lib/data/motorcycles.json` from the NHTSA vPIC API |

## How the code is organized

```
app/
  page.tsx              The garage dashboard: loads data, wires up handlers
  components/           UI pieces (header, task cards, modals, service history)
  hooks/                Auth state, preferences, and a small data-loading hook
  auth/callback/        OAuth / magic-link callback
lib/
  actions/              Server actions — every database write goes through here
  maintenance.ts        Due-date logic (getTaskDueState) and default task schedules
  dates.ts, units.ts    Calendar-day dates and mile/km conversion
  data/                 Motorcycle catalog and per-model service schedules
  supabase/             Browser and server Supabase clients
supabase/migrations/    SQL for columns and row-level security policies
```

A few conventions:

- **Distances are stored in miles** and converted for display in `lib/units.ts`.
- **Dates are stored as calendar days** (`YYYY-MM-DD`) and parsed in local time
  by `lib/dates.ts`, never with `new Date('YYYY-MM-DD')`.
- **Reads** go from the browser to Supabase; **writes** go through server actions.
  Row-level security keeps both limited to the signed-in user's own rows.

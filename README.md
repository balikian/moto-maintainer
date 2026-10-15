# SwingArm

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
   # Optional; enables "Import from manual" (reads maintenance schedules with Claude).
   # Server-only: never prefix it with NEXT_PUBLIC_.
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   The app never needs the Supabase secret (service-role) key. Don't put it here.

3. Apply the database migrations in `supabase/migrations/` with the Supabase
   CLI: `npx supabase login`, `npx supabase link --project-ref <project-ref>`,
   then `npx supabase db push`.

4. Run the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Environments and releases

| | Code | Address | Database |
| --- | --- | --- | --- |
| Local | your working copy | http://localhost:3000 | swingarm-test |
| Test | `develop` branch | https://test.swingarm.app | swingarm-test |
| Production | `main` branch | https://swingarm.app | moto_maintain (prod) |

Hosting is Vercel (project `swingarm`), databases are Supabase.

How a change goes live:

1. **Build it locally.** Code changes show up on localhost as soon as they're
   saved (with `npm run dev` running). Typecheck, lint and tests pass before a
   commit.
2. **Commit and push to `develop`.** Vercel builds the test site
   automatically, in about a minute.
3. **Try it on test.swingarm.app**, including on a phone. Two sign-ins: first
   Vercel's (your Vercel account; preview sites are private to the Vercel
   team), then SwingArm's own. Test and production have separate users, so
   your test account starts with an empty garage.
4. **Release:** merge `develop` into `main` and push `main`. Vercel builds
   production and swingarm.app switches over when the build finishes. Nothing
   to click in Vercel.
5. **If a release is broken:** Vercel → Deployments → the previous production
   deployment → Instant Rollback. Then fix it on `develop` and release again.

Database changes are migration files in `supabase/migrations/`. They're
pushed to swingarm-test first, and to production before the release whose
code needs them (`npx supabase link --project-ref <ref>`, `npx supabase db
push`, then link back to test). Project refs: test `hizfldkwauwhrgkmaphe`,
production `rybecfzjvkgfblbxcpct`.

Settings that differ per environment are Vercel environment variables
(Production or Preview) and Supabase's Authentication settings (each project
has its own sign-in providers and allowed redirect URLs).

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
supabase/migrations/    Database schema changes, applied with the Supabase CLI
                        (the first is a baseline of the whole schema)
```

A few conventions:

- **Distances are stored in miles** and converted for display in `lib/units.ts`.
- **Dates are stored as calendar days** (`YYYY-MM-DD`) and parsed in local time
  by `lib/dates.ts`, never with `new Date('YYYY-MM-DD')`.
- **Reads** go from the browser to Supabase; **writes** go through server actions.
  Row-level security keeps both limited to the signed-in user's own rows.

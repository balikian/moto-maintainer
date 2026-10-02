@AGENTS.md

# MOTO_MAINTAIN

A motorcycle maintenance tracker: riders add bikes, track maintenance tasks by distance and time (whichever comes first), log service, and export or share a bike's service history. Web app first; it will later be wrapped as a phone app with Capacitor.

Stack: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, Supabase (auth + Postgres), Anthropic SDK (schedule import). TypeScript throughout.

## Commands

Run Node commands in **PowerShell**: it has Node 22. Git Bash on this machine resolves an old Node 11 through nvm, which can't run the tooling.

- `npm run dev`: dev server on http://localhost:3000. The user usually has one running.
- `npm test`: unit tests (`lib/**/*.test.ts`, Node's test runner via tsx).
- `npx tsc --noEmit` and `npx eslint .`: typecheck and lint. Run both, plus tests, before committing.
- `npm run build`: production build. **Never run it while the dev server is running.** Both write `.next/`, and a concurrent build once corrupted the dev cache and hung the server. If the dev server ever hangs at high CPU: stop it, delete `.next/`, restart.
- `npm run sync:bikes`: refresh `lib/data/motorcycles.json` (makes and models) from the NHTSA API.
- `npm install` also runs `scripts/copy-pdf-worker.mjs`, which copies the pdf.js worker into `public/` (gitignored).

## Layout

- `app/page.tsx`: the dashboard. Loads data and wires handlers to the components.
- `app/components/`: UI. Shared Tailwind class strings live in `ui.ts`; modals use `Modal.tsx`.
- `app/hooks/`: `useSupabaseQuery` (keyed loading with `reload()`), `useAuthUser`, `usePreferences` (units and theme, saved to `profiles`), `useStoredToggle` (collapse state in localStorage).
- `app/history/[bikeId]`: owner-only printable history. `app/share/[token]`: public read-only shared history. `app/admin`: admin page: import schedules for bikes that have a manual but no schedule, and review submitted manual links and new makes/models.
- `lib/actions/`: server actions. Every database write goes through these, and each one checks the signed-in user.
- `lib/maintenance.ts`: due-state logic (`getTaskDueState`), urgency sorting, and default tasks: the manufacturer schedule if there is one, else generic starter tasks picked by final drive and cooling (`genericTasksFor`). Applying a schedule removes starter tasks that were never logged.
- `lib/modelData.ts`: lookups in the shared per-model tables (`bike_manuals`, `model_schedules`).
- `lib/bikeCatalog.ts`: the make/model dropdown lists: `lib/data/motorcycles.json` plus approved rider-added names from `custom_models`.
- `lib/scheduleExtraction.ts`: server-only Claude call that reads a maintenance schedule from manual page images.
- `supabase/migrations/`: SQL for the schema and row-level security.

## Conventions

- **Distances are stored in miles.** Convert only at display and input, with `lib/units.ts`. Exception: `model_schedule_tasks` keeps the manual's own unit (km or mi) and converts when tasks are created.
- **Dates are calendar days** (`YYYY-MM-DD`). Use `lib/dates.ts`, never `new Date('YYYY-MM-DD')`, which parses as UTC and shows the previous day in US time zones.
- **A task counts from new until service is logged.** Tasks created for a bike start at 0 miles and January 1 of the model year (`fromNewBaseline`); logging a service moves the baseline forward. Custom tasks are the exception: the rider picks their baseline.
- **Confirmations use `ConfirmPopover`**, a small box next to the button, never `window.confirm`.
- **Reads go from the browser to Supabase; writes go through server actions.** Row-level security limits both to the user's own rows, so every new table needs RLS policies.
- **Shared per-model data** (manuals, schedules) is submitted as `pending` and approved by an admin. Admins are listed in `app_admins`, which can only be changed in the Supabase SQL Editor.
- **Theme:** components use light classes plus `dark:` variants; dark mode follows the `dark` class on `<html>`.
- Pure logic goes in `lib/` with tests next to it.

## Database migrations

There's no Supabase CLI. The user applies each migration by pasting the file into the Supabase SQL Editor. Write migrations to be safe to re-run (`if not exists`, `drop policy if exists`), tell the user when a new one needs running, and don't assume it has run until they confirm.

## Secrets

`.env.local` (gitignored) holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key, safe in the browser) and `ANTHROPIC_API_KEY` (server-only; never prefix it with `NEXT_PUBLIC_`). The app never uses the Supabase secret or service-role key. Don't put secrets in files, commits or notes.

## Claude API

The schedule import uses `claude-opus-5-5` through `client.beta.messages.parse` with a Zod schema, plus `fallbacks: "default"` for refusals. Only the pages the user selects are sent, rendered to JPEG in the browser with pdf.js, because many manuals are encrypted PDFs. Import is admin-only for now, since every call is billed to the app's key.

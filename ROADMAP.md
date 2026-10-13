# Roadmap

The plan from here to launch. Claude reads this at the start of a session and
updates it when something is decided or finished. **Decisions** are settled;
**Open** items still need the owner's call.

Status key: ✅ done · 🔨 in progress · ⏳ next · 💤 later

---

## Where things stand (2026-10-08)

Working web app on the dev machine only: bikes, maintenance tasks (distance +
time), service log, export/share, owner's manual links, Claude schedule import
(admin-only), task categories with batching hints, spend summary. Supabase
project: one (used for everything so far). Git: commit straight to `main`.

---

## 1. Name and brand 🔨

- **Decided (2026-10-12):** the app is **SwingArm**. Domain **swingarm.app**,
  registered at GoDaddy (DNS gets pointed at the host in step 3; `.app`
  domains are HTTPS-only, which Vercel handles).
- ✅ **Logo (2026-10-12): "R4c".** A cream swingarm holding a dark-red rear
  wheel that runs off the edge of a deep-red rounded tile. The wordmark is
  SWINGARM in Big Shoulders Display Black, two-tone (cream SWING, red ARM on
  charcoal; charcoal SWING, red ARM on light backgrounds), with the tagline
  "Kick-start your service". Colors: deep red `#8f1f18`, tire red `#5e140f`,
  cream `#f2e4c9`, charcoal `#1c1f23`; ARM is `#d63a2c` on dark and `#b5281f`
  on light; tagline gray `#a39a8c` on dark, `#6b6460` on light. Files are in
  `public/brand/` (text is outlined, so no font is needed). Rejected: spark,
  cigar/whiskey and tank-badge themes, and a zigzag coil shock.
- ✅ Favicon and app icons: `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`.
- ✅ Rename in code (2026-10-12): page titles, README, CLAUDE.md, `package.json`
  name (`swingarm`), and the logo (`app/components/BrandLogo.tsx`) on the
  dashboard header, login card, sign-in error page, print/share history.
  The `moto-maintain:` localStorage keys stay (renaming them would reset
  riders' saved view settings). GitHub repo and folder rename are optional.
- ⏳ Outside the code:
  - Google OAuth consent screen: set the app name to SwingArm (Google Auth
    Platform → Branding). Add the logo, home page and privacy policy once
    the app is on swingarm.app (adding a logo can trigger Google's brand
    verification).
  - Supabase sign-in emails: later. The templates are Supabase's generic
    defaults (no old name in them) and are locked until custom SMTP is set
    up. Plan: Resend on `swingarm.app` (DNS records at GoDaddy), sender
    "SwingArm <noreply@swingarm.app>", then write branded Magic Link and
    Confirm signup templates. Needed before launch anyway: the built-in
    sender allows only a few emails an hour. Fits with step 3 or step 5.
  - Before launch, consider a Supabase custom domain (paid add-on, e.g.
    auth.swingarm.app) so Google's sign-in screen stops showing the
    `*.supabase.co` address.
- ✅ Store check (2026-10-12): neither "SwingArm" nor "Swing Arm" turned up
  on the App Store or Google Play.
- ✅ USPTO search (2026-10-12): every "SwingArm" record is dead or abandoned,
  and none were in the motorcycle space. "Swing Arm" has one live mark (serial
  86080260): Glenair's Swing-Arm, a cable strain-relief clamp for mil-spec
  connectors, sold for commercial and military aerospace. No motorcycle or
  consumer use, and different goods from an app (class 9/42), so we treat
  it as no conflict.
- **Open:** consider filing our own "SwingArm" mark in class 9 / class 42
  before launch.
- Step 2 has started (the app's amber UI doesn't match the red logo yet).

## 2. Design 🔨

- **Decided (2026-10-13):** direction **D** (below), all in Manrope; the
  logo's Big Shoulders font was cool but harder to read.
- 🔨 Phase 1, in code (2026-10-13): design tokens in `app/globals.css`
  (page/surface/raised backgrounds, fg/muted text, brand red, danger/warn/
  good/info, switching with the theme), Manrope instead of Geist, and
  `ui.ts` rebuilt on them; every component converted. D's task card
  (big number, segmented bar, tap to open its details and actions),
  healthy tasks as compact rows, "Add a custom task" at the bottom, the bike
  panel (name, odometer, status counts), the avatar menu showing the
  signed-in email, sentence-case labels, thin scrollbars. Print and share
  pages stay light via `.theme-light`.
- 🔨 Phase 2 (started 2026-10-13):
  - ✅ Phone layout, in code: a bottom bar (Tasks, History, raised red Log
    service, Garage, More). Each screen is kept in the URL (`/?view=garage`),
    so back, reload and links work. Tasks: logo, avatar, bike panel,
    checklist. History: the bike's service records, spend summary and
    Export (its own "Log service" button went; the bar has one). Garage:
    every bike with its odometer and "1 overdue · 2 soon", tap to open its
    tasks; edit and remove live here now, so the bike name's dropdown only
    switches, adds, or jumps to Garage. More: account (email, sign-in
    method), Distance (Miles/Kilometers), Theme (Auto/Light/Dark),
    reminders, help, privacy and terms (all "Coming soon" until they
    exist), admin review (admins only), sign out. The avatar menu is gone;
    the avatar opens More.
  - ✅ Auto theme: follows the device and switches when it does. The choice
    is cached in the browser so the first paint uses it (no dark flash on a
    light phone). Migration `20261013000000_theme_auto.sql` makes Auto the
    default for new profiles and adds a check constraint (needs running).
  - ⏳ Desktop layout: for now it's the phone layout in a centered column
    with the bar at the bottom. Two mockups (2026-10-13) on the design
    canvas, row "Desktop layout": **1 · Top bar:** logo, Tasks/History/
    Garage tabs, a red Log service button and the avatar (which opens More)
    across the top; the bike panel and a "Your bikes" list in a left
    column, task cards two across on the right. **2 · Side menu:** a left
    menu with the logo, Log service, the four screens, a bikes list with
    status dots, and the account at the bottom; the bike panel runs across
    the top of a single column of wide task cards (bar in the middle).
    **Open:** which one. Phones keep the bottom bar either way.
- 🔨 Mockups (2026-10-12): three directions, each as a phone dashboard
  (clickable: open a task, collapse "All good", switch light/dark) and a task
  card in all its states, on the design canvas
  https://claude.ai/artifact/VJHjZaSSBij1EuBpdyJgQb. **A · Workshop:** dark
  charcoal and cream, Big Shoulders headings, a segmented tach bar; only tasks
  that need you get color. **B · Logbook:** cream paper service book, red bike
  band, odometer digit wheels, rubber-stamp statuses, ruled rows instead of
  cards. **C · Instrument:** neutral modern app, ring gauges, big numbers, a
  floating tab bar with Reset/Delete behind a "More" menu. All three try out a
  phone bottom nav (Tasks, History, Garage, More) and a big Log service button.
- 🔨 Leaning (2026-10-12): **D**, which is A's look, bike panel and bottom nav
  with C's font (Manrope), which reads better. D also: sentence-case labels
  instead of spaced capitals, brighter gray text, no theme button in the
  header (theme moves to More, with Auto/Light/Dark, Auto following the
  phone), the center nav button labeled "Log service" (logging is the common
  action), and "Add a custom task" moved to a quiet button at the bottom of
  the list. More holds account, units, theme, reminders (step 4), help,
  privacy policy and terms, admin review (admins only) and sign out.
  Owner likes D. Added: an avatar at top right showing who's signed in (taps
  through to More; the email shows on hover and at the top of More), and
  thin scrollbars in the theme's colors (phones already hide theirs).
  Bike name: Manrope (decided 2026-10-13).
- Approach: Claude produces 2–3 contrasting directions as clickable mockups of
  the same two screens (dashboard and a task card), the owner picks or mixes,
  then it becomes a small design system (colors, type, spacing, components)
  that `app/components/ui.ts` is rebuilt on. Do this after the name, so the
  logo and color can match it.
- Includes: logo/app icon, splash screen, empty states, phone-first layouts.

## 3. Hosting: test and production 💤 (before notifications and payments)

- Proposed: **Vercel** for the Next.js app (made by the Next.js team; server
  actions and cron work without extra setup) and **two Supabase projects**:
  `test` and `prod`.
- Proposed flow: work on a `develop` branch → auto-deploys to the test site
  (e.g. `test.<domain>`) on the test database; merge to `main` → production
  (`<domain>`) on the prod database. Vercel also gives every branch a preview
  URL. This replaces "commit straight to main".
- Move migrations to the **Supabase CLI** so the same files apply to both
  databases in order (no more pasting into the SQL Editor twice).
- Secrets per environment in Vercel (Supabase URL/key, `ANTHROPIC_API_KEY`).
- Also: custom domain, Google (and Apple) sign-in redirect URLs for both
  sites, error monitoring (e.g. Sentry), database backups on prod.

## 4. Settings and communication preferences 💤

- A Settings page: units, theme (both exist, now in a menu), notification
  preferences, account deletion (**required by Apple** for apps with sign-up).
- Preferences per channel (email, push) and per type:
  - task coming due / overdue
  - odometer reminder ("update your mileage", e.g. if not updated in 30 days)
  - optional: monthly summary, recall alerts (if built)
- Needs a `notification_preferences` table (or columns on `profiles`).

## 5. Notifications 💤

- A daily scheduled job (Vercel Cron or Supabase `pg_cron` + Edge Function)
  finds tasks that just turned Soon/Urgent/Overdue and stale odometers, checks
  each user's preferences, and sends — once per task per state, never daily
  nagging (needs a `notifications_sent` log).
- Channels, in order: **email** first (works everywhere; e.g. Resend), then
  **web push** (browsers and installed web app), then **native push** in the
  phone apps (Firebase Cloud Messaging for Android, APNs for iOS).
- Time-based due dates don't change with riding, so reminders work even when
  the odometer is stale — which is exactly why the odometer reminder matters.

## 6. Paid tiers 💤

- **Proposed tiers:**
  - **Free:** 1 bike, starter checklist, applying already-approved
    manufacturer schedules (open: or not?), service log, spend summary.
  - **Pro:** multiple bikes, importing a schedule from your own manual (with a
    monthly limit to cap API cost), export/share (open), priority features.
- **Open:** price (monthly/yearly), whether existing users get grandfathered,
  free trial length.
- Technical: an `entitlements`/`subscriptions` table checked by server actions
  (never only in the UI). Payments: **Stripe** on the web. Apps sold through
  the App Store/Play must use their in-app purchase for digital subscriptions;
  **RevenueCat** can unify Stripe + Apple + Google into one "is Pro" status.
- Opening manual import to non-admins happens here (pending review stays).

## 7. Phone apps (iOS and Android) 💤

- Wrap the web app with **Capacitor** (already the plan). The app loads the
  hosted site, plus native push, app icon, splash screen, and deep links.
- Apple rejects apps that are "just a website", so native push and a
  phone-first layout matter for approval.
- Needs: Apple Developer account ($99/year), Google Play Console ($25 once),
  **Sign in with Apple** (required when Google sign-in is offered; never
  finished), privacy policy and terms URLs, in-app account deletion, store
  screenshots and descriptions, and in-app purchase if Pro is sold in-app.

## After launch 💤

Ideas from the owner (2026-10-13), with first thoughts. Nothing decided yet.

- **Joined garages (families).** The owner's case: he tracks 2 bikes, his
  wife tracks her 4, and they join garages so each sees the other's bikes
  that need service, and either can log service on any of them.
  Proposed model: everyone keeps their own garage and bikes; a
  `households` table plus `household_members` joins them. Joining by invite
  link or email, and either person can leave. Members can see every bike and
  log service on it. Only the bike's owner can edit or remove the bike,
  change its tasks, or share its history (open: let members edit tasks too?).
  The dashboard and bike switcher show the household's bikes, grouped by
  rider ("Your bikes", then each member's).
  Reminders go to the owner (open: also to whoever usually does the work).
  - Data: bikes stay owned by one user, so no ownership migration is
    needed. RLS read policies widen from "my rows" to "my rows or my
    household's". Service logs get a `logged_by` column, so history shows
    who logged each service. That column is cheap to add before launch (it
    defaults to the bike's owner).
  - Fits a Pro "family" plan (open: does one Pro subscription cover the
    household?).
- **Preferred shop / mechanic.** A `service_providers` table (name, phone,
  address, website, notes), a garage-wide default, and an optional override
  per bike. Also record the shop on each service log, so the shared history
  shows who did the work (useful at resale). Typed in by hand first; looking
  shops up (Google Places) costs money per search.
- **Scheduling service.** Options, cheapest first:
  1. A planned date on a task ("booked for Oct 20"), shown on the card and
     used by reminders.
  2. "Add to calendar" (an .ics file or a Google Calendar link). No
     integration needed.
  3. "Contact the shop": call, text or email with a ready-made message
     listing the bike, odometer and what's due.
  4. Real online booking. Every shop system (dealer software and so on) is
     different, so this is a per-vendor integration; much later, if ever.
  Suggested: 1–3 together.
- **How-to for each task.** Options:
  - The owner's manual: we already keep manual links. The schedule import
    could also note the page with the procedure, and PDF links can open at a
    page (`#page=112`).
  - YouTube: a search link for the exact bike and job costs nothing and
    never goes stale. Curated videos could be submitted and reviewed like
    manual links.
  - "Ask your AI": a button that opens ChatGPT or Claude with the question
    already typed in (bike, job, manual link). Free for us; check that each
    app's prefill link works.
  - An in-app AI chat: the best answers, since it can read the manual and the
    bike's history, but every message costs us. Safety matters (torque specs,
    brakes): it must cite the manual and say when to see a shop. A Pro
    feature with a monthly limit.
  Suggested: manual page, YouTube search and "Ask your AI" first; in-app chat
  later, for Pro.
- **Affiliate links for supplies** (oil, filters, chain lube, brake fluid):
  e.g. Amazon Associates, RevZilla / Cycle Gear, OEM parts sites. Show them
  on the task card and when logging service. Needs an affiliate disclosure.
  Apple allows links to buy physical goods outside in-app purchase. Exact
  parts are the hard part: the schedule import could capture specs like
  "10W-50, 1.7 L" so the links can match.
- **International support.** Spanish, European languages and Asia.
  - Translation: **next-intl** (works with the App Router), one message file
    per language. Claude can draft the translations; a native speaker should
    check each before release. Spanish: open: Latin American, Spain, or both.
    Asia: open: which languages. The biggest motorcycle markets are
    Indonesia, India, Vietnam, Thailand, the Philippines, Japan and Taiwan.
  - Units from rough location, with no location prompt: the hosting
    platform tells the server the visitor's country (Vercel sends an
    `x-vercel-ip-country` header), with the browser's language as a
    fallback. Miles for the US and the UK (UK roads use miles), km
    everywhere else. Set once at sign-up; the rider can change it.
  - Also needed: dates (`lib/dates.ts` is hard-coded to US English), currency
    (spending is hard-coded to US dollars; needs a currency setting), the
    starter task names, and the make/model list, which comes from the US
    government's vehicle database (NHTSA) and is missing many Asian and
    European models.
  - Cheap prep before launch: keep number, date and currency formatting
    going through the helpers in `lib/`, so there's one place to change.
- **Auto-odometer.** Pick the bike, tap "Start ride", and GPS adds up the
  distance and updates the odometer.
  - Needs the phone apps (step 7): a web page stops tracking when the screen
    locks or you switch apps. In the native app it takes a background
    location plugin and the "Always" location permission. Apple reviews that
    permission closely, and GPS drains the battery.
  - GPS distance runs slightly off a real odometer (tunnels, twisty roads),
    so treat it as an estimate: "Odometer about 8,554 mi (142 mi from rides
    since you last checked)". Ask now and then for a real reading, which
    resets the count. Store rides separately (bike, date, distance) from
    the confirmed odometer readings.
  - Privacy: store only the distance, not the route, unless we later add
    ride logs on purpose. Say so in the privacy policy.
  - Later ideas: start automatically when the phone connects to the
    helmet's Bluetooth headset (Cardo, Sena); pull mileage from bike makers'
    apps where they allow it (most don't).
- **Battery reminder when the bike sits.** "Your Norden hasn't been ridden
  in 3 weeks. Is it on the trickle charger?"
  - "Not riding" is guessed from the odometer not changing for a while
    (open: how long; 2–3 weeks?), so it works better with fuel logs or the
    auto-odometer feeding readings. A seasonal "Put in storage" switch on
    the bike could also turn on a storage checklist: battery on the charger,
    fuel stabilizer, tire pressure, cover. Turning it off brings up a
    "back on the road" checklist. (The owner likes both switches.)
  - Insurance during storage: many insurers offer cheaper storage
    ("lay-up", or comprehensive-only) coverage while a bike is put away. The
    app can't change a policy, but the storage checklist can suggest calling
    the insurer, with the rider's insurer and policy number saved on the bike.
    The "back on the road" checklist must then say to restore full coverage
    before riding. Later, maybe: insurance partners or affiliate quotes.
  - Lithium batteries need a lithium-safe charger; the reminder could say
    so if the bike has one (a battery-type field on the bike).
  - Built on notifications (step 5).
- **Fuel costs and mileage.** A fill-up log: date, odometer, amount
  (gallons or liters), price or total, and "filled the tank?".
  - Economy is worked out between two full fill-ups, in the rider's units:
    mpg (US or UK gallons, which differ), L/100 km, or km/L (common in Asia).
    Also cost per mile/km, and fuel shown next to maintenance in the
    spending summary.
  - Every fill-up is also an odometer reading, so logging fuel keeps the
    odometer, due dates and the "bike is sitting" check up to date.
  - A sudden drop in economy can hint at a problem (tire pressure, a
    dragging brake, a clogged air filter) and could be pointed out.
  - Later: snap a photo of the pump or receipt and let Claude fill in the
    form.

## Smaller items and ideas

- ⏳ Re-test: Norden set to 2023 should show no schedule in Manual & schedule.
- 💤 Save final drive / cooling on the bike so Edit Bike can change them.
- 💤 NHTSA recall alerts per bike (free data; fits the notifications work).
- 💤 Offline use of manuals in the phone app.

## Suggested order

1. Name → 2. design direction (can overlap) → 3. hosting with test + prod →
4. settings + preferences → 5. email notifications → 6. paid tiers →
7. phone apps (push, Apple sign-in, store submission).

Hosting comes before notifications and payments because both need a public
URL, scheduled jobs, and webhooks, and should be tried on the test site first.

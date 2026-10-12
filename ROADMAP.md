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
- 🔨 Logo and app icon: owner is finalizing them.
- ⏳ Rename in code: page titles and metadata, the `MOTO_MAINTAIN` header and
  login card, README, CLAUDE.md, `package.json` name, export/print/share
  headings. Keep the `moto-maintain:` localStorage keys (renaming them would
  reset riders' saved view settings). GitHub repo rename is optional.
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
- Once the logo is final: favicon and app icons, then into step 2.

## 2. Design ⏳

- **Open:** a visual direction. Current look is a dark slate + amber dashboard.
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

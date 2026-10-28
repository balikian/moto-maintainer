# Roadmap

The plan from here to launch. Claude reads this at the start of a session and
updates it when something is decided or finished. **Decisions** are settled;
**Open** items still need the owner's call.

Status key: ✅ done · 🔨 in progress · ⏳ next · 💤 later

---

## Launch checklist (2026-10-23)

Two phases: get the web app ready, then the phone apps; the public
announcement waits for both (decided 2026-10-27, below). Owner = only the owner can
do it; Claude = code or setup Claude can do.

**Web launch**
1. ✅ Vercel Pro continues after the trial (Vercel's email, 2026-10-24:
   the trial ends in 3 days, then $20+ a month).
2. ✅ Owner + Claude: import manufacturer schedules for the most popular
   bikes (admin page), so most new riders get a real schedule instead of
   starter tasks. Testers didn't know what their list should be.
   ✅ Made easier (2026-10-25; owner checked on test; released 2026-10-26
   with the editions picker, More's collapsible groups, the dropdown arrows
   and the admin page's bottom bar): **Add a schedule** on the
   admin page takes a make and model (from the riders' lists), the years and
   the manual's link, saves the link as an approved manual (a new make or
   model joins the lists), and the import reads the PDF straight from the
   link: no second account, no download and upload. "Manual but no
   schedule" rows and Manual & schedule (for admins) prefill the link too.
   The fetch goes through `app/api/admin/manual-pdf`: admins only, public
   addresses only (checked again on every redirect, `lib/manualUrl.ts`),
   streamed (Vercel's 4.5 MB limit doesn't apply to streams), 150 MB cap,
   always served as a downloadable PDF. The link must be the PDF itself;
   choosing a file still works. Owner's first try (2026-10-25): the make
   field didn't act like the bike form's (a typed list that only offered
   the current make), so the form now uses the bike form's own dropdowns
   (shared `MakeModelFields`, with Other / Not Listed) and year dropdowns.
   Also (owner, 2026-10-25): More's groups open and close, closed by default
   with a one-line summary ("Miles · Auto theme", "All on", "On for this
   device"), remembered per browser.
   **Editions (owner, 2026-10-26):** the import's review step has "Also
   use this schedule for" (admins), a dropdown of the make's other models
   (Norden 901 → Norden 901 Expedition). **Decided:** copies, not linked
   models: each model gets its own schedule rows (and the manual link), so
   no database change and no change to how schedules are looked up;
   re-importing with the same models replaces every copy.
   **The list (2026-10-26):** `docs/schedule-imports.md`, 30 popular US
   models with manual links where public ones exist (19 of 30; Kawasaki,
   Suzuki, Harley, Tiger 900 and Indian Scout need a downloaded PDF).
   The owner imported those 30 on production, maybe missing one or two
   (2026-10-27). Added 23
   adventure bikes (#31–53, 2026-10-27): 15 with checked links, 2 Honda
   links found by search, 6 need a downloaded PDF.
   ✅ Done enough for launch (owner, 2026-10-27); more easy ones get added
   along the way.
3. ✅ Supabase production: Authentication → Rate Limits, "Rate limit for
   sending emails" raised to 60 an hour (owner, 2026-10-24; other limits
   left at their defaults). ⏳ Resend's free plan is 100 emails a day, shared
   by sign-in codes and reminders (the reminder run stops at 80): switch to
   Pro ($20 a month, no daily cap) the day before announcing; drop back if
   sign-ups stay low.
4. ✅ Claude: link previews and search basics: an Open Graph image and
   description (what a link shows in texts and Facebook groups), a sitemap
   and robots file; owner submits the sitemap in Search Console (swingarm.app
   is verified there).
   ✅ Released 2026-10-26: `app/opengraph-image.tsx` draws the
   picture at build time (dark theme, logo, the home page's headline in
   Manrope from `assets/fonts/`); the root layout sets the description,
   Open Graph and Twitter card tags; pages with their own title (help,
   privacy, terms) spread `OPEN_GRAPH` from `lib/site.ts` so they keep the
   picture. Share links preview as "<year make model> service history" with
   the record count. `app/robots.ts` and `app/sitemap.ts` (/, /help,
   /privacy, /terms; /about names / as canonical). Only production is
   indexable: the test site and local dev say noindex on every page.
   ✅ Owner checked the Facebook preview and submitted
   `https://swingarm.app/sitemap.xml` in Search Console (2026-10-27).
5. ✅ Claude: database cleanup migration (unused `bikes` table,
   `profiles.is_dark_mode`, a fixed `search_path` on `handle_new_user()`).
   ✅ `20261026120000_cleanup.sql` on test and production (2026-10-26): drops `bikes`
   (stops instead if it has any rows), rewrites `handle_new_user()` without
   `is_dark_mode` and with `search_path` '', drops the column. Checked on
   test: a sign-up in a rolled-back transaction still gets its profile.
   Production's `bikes` was empty too (the guard let it through).
6. ✅ Owner: the push checks still open (a tap opens SwingArm, signing out
   turns push off on that device, a real reminder on the iPhone).
   ✅ Changed (owner, 2026-10-25; released 2026-10-26): signing out still turns push
   off on the device (so the next rider there doesn't get your reminders),
   but the device remembers whose push was on (localStorage, last rider
   only) and `restorePushAfterSignIn` turns it back on when that rider signs
   in there again, without asking (permission is still granted). Turning
   push off in More forgets it. If a browser won't subscribe without a tap
   (possibly iPhone), it stays off until turned on in More: check on the
   iPhone. Help and privacy policy (dated 2026-10-25) say so.
   ✅ All working on Android (owner, 2026-10-26) and iPhone (owner,
   2026-10-27), including push coming back on after signing in again.
7. 💤 Optional: error alerts (Sentry's free plan), an off-site `pg_dump` of
   production now and then (Supabase keeps 7 days of backups).
8. ⏳ Owner + Claude: an announcing strategy: where (riding forums,
   Facebook groups, Reddit, friends' clubs), in what order, and the posts.
   Claude can draft them.

**Decided (owner, 2026-10-27): announce after the phone apps and Sign in
with Apple**, not before as first planned, so riders who hear about it can
get the app from the stores straight away. Sign in with Apple must work at
launch, so riders who want it never have to move their data to a new
account later. (Supabase can also add a sign-in method to an existing
account, so "Add Sign in with Apple" on More could cover riders who
signed up another way.)

**Phone apps** (step 7 below)
1. ✅ D-U-N-S number for Cheese and Beer LLC: **025614636** (2026-10-23).
   Apple can take up to 2 business days to see a new number.
   ⏳ Blocked (2026-10-27): the D-U-N-S record shows an old,
   out-of-business company of the same name (the LLC reuses an old
   business name). The owner has a case open with Dun & Bradstreet to fix
   it. No Apple Developer account until then; Google Play's organization
   account checks the D-U-N-S too.
2. Owner: Apple Developer Program as the LLC ($99 a year) and a Google Play
   organization account ($25 once). Organization accounts skip Google's
   12-tester, 14-day closed test.
3. Claude: wrap the app with Capacitor (icon, splash screen, deep links,
   Google sign-in through the system browser and back), native push through
   the existing reminder job, Sign in with Apple (required on iPhone when
   Google sign-in is offered).
4. Owner + Claude: store listings (screenshots, description, privacy labels
   including analytics, age rating), privacy policy updates (Apple and
   Google push, Sign in with Apple), then review.
5. Check before enrolling: the business address on the D-U-N-S record, and
   whether Apple (EU trader status) or Google show the developer's address
   publicly. Use the LLC's registered address, not a home address.

---

## Where things stand (2026-10-15)

Live at https://swingarm.app (production database) with a test site at
https://test.swingarm.app (swingarm-test database). Work goes to `develop`
(test site); merging to `main` releases. Features: bikes, maintenance tasks
(distance + time), service log, export/share, owner's manual links, Claude
schedule import (admin-only), task categories, spend summary, the SwingArm
design (phone and desktop layouts, Auto/Light/Dark theme), a public home
page, branded sign-in emails through Resend.

Released 2026-10-17: step 4 (settings, account deletion), the
instructions page (/help) and reminder emails (step 5, email part).
The first reminder runs checked out (2026-10-19).
✅ Privacy policy and terms of use (written and reviewed by the owner
2026-10-19; released 2026-10-19): **/privacy** and **/terms**,
public pages like /help, linked
from the footer, More (replacing "Coming soon") and the sign-in card ("By
signing in, you agree to…"). Plain language; not lawyer-reviewed.
**Decided:** SwingArm is a brand of **Cheese and Beer LLC** (`COMPANY_NAME`
in `lib/site.ts`), registered in **Washington State**, whose law governs
the terms. "Advance notice" in the terms means closing SwingArm for good;
maintenance and outages can happen without warning. Added at the owner's
request: a business-transfer section in the privacy policy, a note that
Anthropic doesn't train on API data (its commercial terms), and in the
terms a copyright reporting section, a "claims caused by your use"
(indemnification) section, and General (whole agreement, severability, no
waiver, assignment). **Decided (2026-10-19):** no DMCA designated agent
for now (it needs a public postal address, and the owner has no PO box
and won't publish a home address). The copyright section is just "email
support@ and we'll look into it". Later, if wanted: register an agent
(copyright.gov/dmca-directory, $6, renew every 3 years) using a virtual
mailbox or a registered-agent service's address, and add the formal
notice requirements back. **Decided (owner, 2026-10-23):** no lawyer
review before launch (cost); the plain-language policy and terms stand. ✅ Google's OAuth consent screen (Branding → App domain) has the
home page, privacy and terms URLs (2026-10-19).
✅ Download my data on More, the admin review badge and Import a backup
(owner checked on test; released 2026-10-20).
✅ Add to Home Screen (manifest, install row on More; owner checked on
an iPhone; released 2026-10-20). ✅ **Web push** (step 5; owner checked
on Android and iPhone; released 2026-10-20). Also suggested: join the Apple
Developer Program as Cheese and Beer LLC (D-U-N-S number first) for Sign
in with Apple (step 7).

User testing with friends (2026-10-19): the invite and feedback texts are
in `docs/user-testing.md`. Testers' notes are in `docs/bugs.md` and
`docs/Feedback.md` (owner's files).

✅ **Task start points** (built and released 2026-10-20). Testers' biggest
complaint: adding a used bike showed nearly every task overdue (counting
from new), in hundreds of months. **Decided (owner, 2026-10-20):** a new
bike's tasks start with **no start point** (`last_performed_mileage` and
date null; status `NoStart`): not due, not counted as due, no reminders.
They're listed under "When were these last done?" at the top of Tasks;
each one offers **Log a past service**, **Start today** (a full interval
from today's odometer) or **Never done** (counts from 0 miles and January
of the model year), and the group has **Start all today** / **None done
yet** (with a confirm). **Decided (owner):** not "Count from new", which
confused him. A guessed start point (today, never done) is replaced by
the task's first logged service,
however old. Deleting a task's last log takes it back to no start point;
applying a schedule adds tasks without one. The bike panel says "N tasks
need a start point"; Garage says "N to set up". Time overdue past two
years shows in years. Migration `20261020180000_task_start_point.sql`
(pushed to test) makes the column nullable and **clears the automatic
from-new start on existing tasks never logged** (105 of 108 on test;
**decided:** production's existing bikes get the same change).
✅ Released 2026-10-20: migration on production first (checked: column
nullable with no default, the check constraint, 339 of 409 tasks
cleared, as counted beforehand), then `main`.

✅ **Testers' quick fixes** (built 2026-10-21; owner checked on test; from `docs/bugs.md`
and `docs/Feedback.md`):
- **Odometer optional** when adding a bike and when logging service.
  **Decided (owner, 2026-10-21):** a bike added without a reading has
  `current_mileage` null: the bike panel says "No reading yet" with **Add
  reading**, tasks count by time only (a mileage-only task shows "No
  odometer reading yet"), **Start today** asks for a reading first, and the
  odometer check-in says to add one. A service logged without a reading
  keeps `odometer_at_service` null, and its task's miles count from the
  bike's odometer at the time (exact for today's service; an older one may
  come due a little late by miles, and time still catches it). A bike with
  no reading needs one to log service. "Log a past service" starts with the
  odometer blank instead of today's reading. History, the printout and CSV
  leave the mileage out; backup files may hold null. Migration
  `20261021120000_optional_odometer.sql` (pushed to test) makes both
  columns nullable.
- The page behind an open dialog no longer scrolls on phones.
- Signed-in riders get the bottom bar on About, Help, Privacy and Terms
  (More shows as current; Log service links to `/?log=service`, which
  opens it on the dashboard).
- The bike's name wraps instead of being cut off, and "2 bikes" moved up to
  the year/make line. With one bike there's no menu, and the menu lost
  "Manage garage" (Garage is in the bar), so Garage has one way in.
- **Add task** at the top of Tasks, next to Manual & schedule (the bottom
  button stays).
Help page updated. ✅ Released 2026-10-21: migration on production first
(checked: both columns nullable, no default), then `main`.

✅ **Sign-in code** (built 2026-10-21; owner checked on test, templates and
Email OTP Length 6 set there; released 2026-10-21 after the owner set up
production the same way): the iPhone Home
Screen app couldn't sign in by email, because the link opens in Safari,
which doesn't share its sign-in. The sign-in email now has a code
(`{{ .Token }}`) above the link, and after sending, the sign-in card asks
for it (`verifyEmailCode`, Supabase `verifyOtp` with type `email`). The
link still works in the same browser. The error page for a failed link
says to send a new code and type it in. Templates in `supabase/templates/`
(subjects changed too) must be pasted into each project: test first, then
production at release. Set each project's **Email OTP Length** to 6
(the card takes up to 10 digits) and keep Email OTP Expiration at 3600
(the emails say an hour).
✅ **QA pass fixes** (2026-10-21; released 2026-10-22): from the
tester agent's regression pass. A custom task's blank "last done at" saved
as 0 mi (overdue once a no-reading bike got its odometer); blank now means
the current odometer, required when there's none. Service and "last done
on" dates can't be in the future (`isFutureEverywhere`). "-500" no longer
saves as 500. An odometer below a task's start point no longer shows more
than the full interval left. **Decided (owner):** a service logged without
a reading saves the odometer its task counted from in
`service_logs.baseline_mileage` (migration
`20261021200000_service_log_baseline_mileage.sql`, pushed to test), so
deleting a newer service falls back to the right miles. **Decided
(owner): leave km rounding alone** (distances are whole miles, so a
1,000 km interval shows 999 km and a typed km reading can come back 1 km
lower).

✅ **Daily admin review email** (owner, 2026-10-22; checked on test with a
real send and a repeat run that sent nothing; released 2026-10-22, both
migrations on production first, checked): the daily reminder run also
emails each admin when manual links
or makes/models are pending (what the review badge counts), once a day per
admin (`admin-review:<date>` claim), before the riders' emails so the
80-email cap can't skip it. Manual links show only their site, never a
clickable link (they're unreviewed). Migration
`20261022120000_admin_review_digest.sql` (pushed to test; checked: security
definer, a wrong job secret is refused). Code: `adminReviewEmail` in
`lib/reminderEmail.ts`, `runReminderJob`. Off production, a real run needs
`?only=<admin email>` as before; `?dry-run` previews it.

✅ **Testers' feedback, round 2** (built 2026-10-23; owner checked on test;
released 2026-10-23, migration on production first; from
`docs/Feedback.md`):
- **Service visits.** Log service is a checklist: tick any tasks plus an
  optional one-off job; they share the date, odometer, cost and a new
  **Where** ("Home", a shop's name; Home and earlier places are one-tap
  choices). Tasks needing attention are listed first, a task card's related
  jobs say "Do it with this", the rest are behind Show all tasks. The visit's
  cost and notes are saved on its first record. **Decided (Claude; owner can
  change):** no visit id. History, the printout and the share page group
  records on the same day, odometer and place into one visit, so services
  logged separately that day group too. "When were these last done?" has
  **Log a past service** for any of its tasks, and the next past service
  starts on the last one's date (until reload). Where is in the CSV,
  Download my data and Import a backup. Migration
  `20261023120000_service_log_shop.sql` (on test and production; checked on
  production: nullable text, the 80-character check, `get_shared_history`
  returns `shop` and keeps its grants) adds
  `service_logs.shop` and returns it from `get_shared_history`. Privacy
  policy (dated 2026-10-23), help and share wording mention "where it was
  done".
- **Share 404.** A tester sent the printable page's address instead of a
  share link. **Share** is now its own button on History (Export keeps CSV
  and Print); the print page has a Share link button and says only the
  owner can open it; anyone else gets "This page is private" with how to
  ask for a share link, instead of a 404 (signed out: no more redirect to
  sign-in).
- **Email autofill on iPhone (John).** The field already had
  `type="email"` and `autoComplete="email"`. Now it also reads its own
  value on submit (in case AutoFill fills it without React noticing) and
  turns off autocapitalize and autocorrect. Ask John: Safari or the Home
  Screen app, and what happened when he tapped the suggestion?
- **Getting started** card at the top of Tasks (three steps, a link to
  help), hidden for good on that browser by Got it or X.
- Help explains when Soon and Urgent start, with an example (Feedback #6).
- 💤 **Overdue cards** ("somewhat overwhelming"): four options on the canvas
  https://claude.ai/artifact/3DgbY84PudX9M3xdG4JczD (A today's, B dot and
  bigger title, C status tag and thin line, D grouped rows). **On hold**
  (owner, 2026-10-23); today's cards stay.
- 💤 A purchase date on the bike (John): post-launch, below.

Discussed (2026-10-21), nothing decided: other sign-in options. Passkeys
are the most secure and quickest but Supabase's support is limited (check
first); Sign in with Apple needs the developer account (step 7); passwords
and text-message codes aren't worth it. Google + email code is a good pair
for now.

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
  - ✅ Google OAuth consent screen: app name set to SwingArm (Google Auth
    Platform → Branding; done 2026-10-15). Add the logo, home page and
    privacy policy once the app is on swingarm.app (adding a logo can trigger Google's brand
    verification).
  - ✅ Supabase sign-in emails (done 2026-10-15, below). The templates were Supabase's generic
    defaults (no old name in them) and are locked until custom SMTP is set
    up. Plan: Resend on `swingarm.app` (DNS records at GoDaddy), sender
    "SwingArm <noreply@swingarm.app>", then write branded Magic Link and
    Confirm signup templates. **Required before launch** (checked in
    Supabase's docs, 2026-10-15): the built-in sender delivers only to
    members of the Supabase team and only 2 emails an hour, so magic-link
    sign-in doesn't work for real riders yet (Google sign-in does). With
    custom SMTP, Supabase starts at 30 emails an hour, adjustable under
    Authentication → Rate Limits. Set it up on both projects.
    Fits with step 3 or step 5.
    Resend limits (checked by the owner, 2026-10-15): only the free plan
    has a daily cap: **100 emails a day and 3,000 a month**. Sent and
    received emails both count toward the daily cap, which resets at
    midnight UTC. Pro has no daily cap: 50,000 emails a month for $20, or
    100,000 for $35. Sign-in links alone fit the free plan early on;
    reminder emails (step 5) will likely need Pro.
    ✅ Done 2026-10-15: Resend domain verified, SMTP and the templates
    from `supabase/templates/` on both projects (one Resend API key each),
    sender "SwingArm <noreply@swingarm.app>". Branded emails arrive on
    test and production. (Production first sent an old copy; a fresh
    link was fine, likely sent before the save took effect.) The icon is
    a hosted PNG, so mail apps that block images show an empty box.
    2026-10-17: templates resized to match the reminder emails (32px
    logo, 14px text, less padding), pasted into both projects. Again the
    first emails after saving used the old template for a few minutes:
    **after changing a template, wait a few minutes before testing.**
  - ✅ Google's sign-in screen showed the `*.supabase.co` address. Fixed
    for free (2026-10-23) with Google **brand verification** instead of a
    Supabase custom domain ($10 a month extra on top of Pro; **decided:**
    not needed). swingarm.app was verified in Google Search Console (Domain
    property, TXT record `google-site-verification=…` on `@` at GoDaddy,
    next to the SPF record), the app was published (Audience → In
    production; only the basic sign-in scopes, so no further review), and
    branding verified. The account chooser now says "to continue to
    SwingArm" with the logo.
- ✅ Store check (2026-10-12): neither "SwingArm" nor "Swing Arm" turned up
  on the App Store or Google Play.
- ✅ USPTO search (2026-10-12): every "SwingArm" record is dead or abandoned,
  and none were in the motorcycle space. "Swing Arm" has one live mark (serial
  86080260): Glenair's Swing-Arm, a cable strain-relief clamp for mil-spec
  connectors, sold for commercial and military aerospace. No motorcycle or
  consumer use, and different goods from an app (class 9/42), so we treat
  it as no conflict.
- **Decided (owner, 2026-10-23):** no trademark filing for now (cost).
  Using the name builds common-law rights in the US, and "SwingArm™" can be
  used without registering (® can't). Revisit if SwingArm takes off.
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
  - ✅ Desktop layout (decided and built 2026-10-13): **Desktop 1 · Top
    bar** from the canvas. From `lg` (1024px) up: a sticky bar with the
    logo, Tasks/History/Garage, a red Log service button and the avatar
    (opens More); Tasks puts the bike panel and a "Your bikes" list in a
    left column that stays put, with cards needing attention two across.
    History, Garage and More are centered columns; Garage shows bikes two
    across. Phones keep the bottom bar. Rejected: a side menu.
    "All good" stays one column (rows open in place, which two columns
    would make jumpy).
  - ✅ No sideways shift when a scrollbar appears: `html` reserves the
    scrollbar's space (`scrollbar-gutter: stable`), and the bottom bar is
    `sticky`, not `fixed` (fixed elements span the gutter, so their
    centered buttons still moved). Phones show the logo on every screen.
  - ✅ Public home page (built 2026-10-13, from the canvas mockup):
    signed-out visitors at `/` get it, rendered on the server; sign-in
    moved to `/login`; signed-in riders reach it at `/about` (More →
    About SwingArm). What the app does, four features, pricing as **"Free
    during early access"** (no Pro yet; "paid plans may come later, you'll
    hear before anything changes"), "Coming soon" App Store and Google
    Play tiles, a short FAQ, and contact **support@swingarm.app** (also
    More → Help and feedback). ✅ Privacy and terms pages (drafted
    2026-10-19, see "Where things stand").
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

## 3. Hosting: test and production 🔨 (before notifications and payments)

- 🔨 Started 2026-10-13: owner signed up for Vercel (Pro trial). Plan: first
  deploy `main` with the existing Supabase project as production, on a
  `*.vercel.app` address, then add swingarm.app, then the test setup below.
  Done in code: sign-in redirects use the site the rider is on (no
  `NEXT_PUBLIC_SITE_URL`); a clean production build passes.
- ✅ Live at **https://swingarm.app** (2026-10-13): Vercel project
  `swingarm`, deploying `main` with the existing Supabase project; GoDaddy
  DNS A record `@` → Vercel; `www` redirects to the bare domain. Supabase
  Auth URL Configuration: Site URL `https://swingarm.app`; redirect URLs
  for swingarm.app, www.swingarm.app, the vercel.app address and
  localhost:3000. The Vercel Supabase integration was skipped on purpose
  (it would add a new database and the service-role key).
  Watch for: Vercel caps a request at 4.5 MB, which a schedule import with
  many manual pages can exceed (fix: upload pages to Supabase Storage
  first); Claude calls must finish within the function time limit.

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
- ✅ Test site + test database (2026-10-14):
  1. ✅ Supabase project **swingarm-test** created (2026-10-14; free plan,
     ref `hizfldkwauwhrgkmaphe`). It landed in **us-east-1**; prod is in
     us-west-2. Fine for testing; recreate it only if the test site feels
     slow.
  2. ✅ Baseline schema (2026-10-14): the core tables were made in the
     dashboard before migrations were kept, so the files couldn't build a
     fresh database. Prod's schema was dumped with `pg_dump` (PostgreSQL 17
     command-line tools; `supabase db dump` needs Docker) into
     `supabase/migrations/20261014100000_baseline.sql`, plus the
     `on_auth_user_created` trigger on `auth.users`. The old migrations
     moved to `supabase/archive/`. ✅ Pushed to swingarm-test with the CLI;
     a dump of test matches prod exactly. ✅ Marked applied on prod
     (`migration repair`). From now on, migrations apply to test first,
     then prod, with the CLI (see CLAUDE.md).
     Cleanup: prod still had an unused `bikes` table and
     `profiles.is_dark_mode`, and `handle_new_user()` was security definer
     without a fixed `search_path`; `20261026120000_cleanup.sql` fixes all
     three (launch checklist item 5).
  3. ✅ Test project setup (2026-10-14): Google sign-in with prod's Google
     client (the test callback URL added in Google Cloud, and a second
     client secret for test). Auth URL Configuration: Site URL
     `https://test.swingarm.app`; redirect URLs for test.swingarm.app and
     localhost:3000. Optional, for signing in on a deployment's own
     `.vercel.app` address: add `https://swingarm-*-swing-arm.vercel.app/**`
     (only this project's previews, not all of `*.vercel.app`). The owner
     is in `app_admins` on test.
     ⏳ Optional: copy the shared reference data (approved manuals,
     schedules, custom models) from prod; `submitted_by` must be cleared,
     since those users don't exist on test.
  4. ✅ Git (2026-10-14): `develop` branch. Work lands there and deploys to
     the test site; merging to `main` releases to swingarm.app.
  5. ✅ Vercel (2026-10-14): `NEXT_PUBLIC_SUPABASE_URL` and
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` per environment (Production → prod,
     Preview → swingarm-test; type Config, since Secret can't change
     environments and warns on `NEXT_PUBLIC_` names).
     `ANTHROPIC_API_KEY` is shared. **test.swingarm.app** is connected to
     the `develop` branch (CNAME `test` in GoDaddy). Preview sites,
     test.swingarm.app included, sit behind Vercel's login (Deployment
     Protection), so only the Vercel team can open them. Checked: signing
     in on test.swingarm.app gives an empty garage on the test database.
     ✅ First release since the split (2026-10-15): swingarm.app reads the
     production database (owner checked).
     ✅ Function region (2026-10-15): `vercel.json` sets `pdx1`, next to
     prod's us-west-2 database (the default was Washington, `iad1`); the
     `x-vercel-id` header confirms it. It overrides the dashboard setting
     and covers the whole project, so the test site runs there too, far
     from its us-east-1 database.
  6. ✅ Local dev (`.env.local`) points at swingarm-test (2026-10-14), so
     trying things on the computer never touches real data.
- 🔨 Email for **support@swingarm.app** (set up 2026-10-14; the home page
  and More → Help and feedback link to it). A real mailbox at **DreamHost**
  (where the owner's other email lives), read and answered in Thunderbird
  as its own account.
  - DreamHost: swingarm.app added via Add Website → Reroute or manage DNS
    → Set up DNS (no hosting). Its "use DreamHost nameservers" warning is
    expected and ignored: DNS stays at GoDaddy.
  - GoDaddy DNS: MX `@` → `mx1.dreamhost.com` and `mx2.dreamhost.com`
    (priority 0); TXT `@` → `v=spf1 mx include:netblocks.dreamhost.com
    include:relay.mailchannels.net -all`; TXT `dreamhost._domainkey` →
    DreamHost's DKIM key. Only one SPF record allowed on `@`: anything
    else that sends as swingarm.app must be added to it, or send from a
    subdomain (as Resend does).
  - ✅ Sending and receiving at support@ work (confirmed 2026-10-15).
  - Tried first and dropped: ImprovMX forwarding to frito@cheeseandbeer.com.
    DreamHost's inbound filter (MailChannels) rejected the forwarded mail
    ("[S10] Blocked").
  - Later: Resend sends the app's own emails (Supabase sign-in links, then
    reminders) as noreply@swingarm.app, with its records on a `send`
    subdomain so they don't touch the SPF record above.
- Also: custom domain, Google (and Apple) sign-in redirect URLs for both
  sites, error monitoring (e.g. Sentry), database backups on prod.
- 2026-10-17: the production Supabase project is renamed
  **swingarm-prod** (was moto_maintain; display name only, the ref and URL
  are unchanged). ✅ Backups (2026-10-19): the organization holding
  swingarm-prod is on **Pro** (about $25 a month; automatic daily backups
  kept 7 days, restored from Database → Backups; no pausing). Point-in-Time
  Recovery (~$100 a month) skipped for now. Backups don't include Storage,
  which the app doesn't use, and can't be downloaded; for an off-site copy,
  `pg_dump` the data now and then. swingarm-test was transferred to its own
  **free** organization (same ref, URL and settings; the CLI still reaches
  it), since each project in a Pro organization adds compute. Free projects
  pause after about a week without activity: restore it from the dashboard.
  This was the prerequisite for inviting friends to test the app.

## 4. Settings and communication preferences ✅

- A Settings page: units, theme (both exist, now in a menu), notification
  preferences, account deletion (**required by Apple** for apps with sign-up).
- Preferences per channel (email, push) and per type:
  - task coming due / overdue
  - odometer reminder ("update your mileage", e.g. if not updated in 30 days)
  - optional: monthly summary, recall alerts (if built)
- **Decided (2026-10-16):** settings stay on the More screen (no separate
  page). Preferences are columns on `profiles`, email only for now
  (`email_task_reminders`, `email_odometer_reminders`,
  `email_monthly_summary`); push gets its own columns in step 5 or 7.
  Task and odometer reminders are **on by default** (every email will carry
  an unsubscribe link); the monthly summary is off. The odometer check-in
  is fixed at 30 days for now. Deleting an account takes typing DELETE in
  a dialog (X-only).
- 🔨 Built 2026-10-16, on test: migration
  `20261016120000_reminders_and_account_deletion.sql` (the columns, and
  `delete_my_account()`, a security definer function that deletes the
  signed-in rider from `auth.users`, so the app still never uses the
  service-role key). Everything the rider owns cascades away; manuals,
  schedules and models they submitted stay, with `submitted_by` cleared
  (checked with a rolled-back dry run on test). More has a "Reminder
  emails" section with three switches ("Reminder emails start soon") and
  a Delete account button under Sign out.
  ✅ Released 2026-10-16: migration on production (checked: columns, and
  the function callable only by signed-in riders), then `main`.
  Also (decided and built 2026-10-16): after deleting, the home page shows
  "Your account has been deleted" (`/?deleted=1`, dismissable); the delete
  dialog offers **Download my data**, one JSON file with the account's
  settings and every bike's tasks and service history
  (`lib/accountExport.ts`). Owner checked the rest of step 4 on test.

## 5. Notifications ✅ (email ✅, web push ✅; native push comes with the phone apps)

- **Decided (2026-10-16):** email first. A **Vercel Cron** (`vercel.json`,
  daily at 15:00 UTC: 8 am Pacific in summer, 7 am in winter) calls
  `/api/cron/reminders`. Task emails at **Soon** (Urgent counts as Soon if
  Soon was skipped) and **Overdue**, once each per service cycle. Odometer
  check-in **every 30 days** the reading stays unchanged (saving the same
  reading counts as an update). Monthly summary on the 1st–3rd, about the
  month before. **No task reminders for a bike's first 7 days** (owner,
  2026-10-16), so riders can log past service or apply a schedule first;
  the odometer check-in already waits 30 days. At most one daily email per
  rider; the monthly summary is
  its own email.
- **Decided:** the job reads every rider's data through security definer
  functions (`reminder_job_data`, `claim_reminders`, `release_reminders`)
  that need a **job secret** kept in Supabase Vault
  (`reminder_job_secret`, made by the migration, one per database). The app
  has it as `CRON_SECRET`, which is also what Vercel Cron sends. The app
  still never holds the service-role key.
- 🔨 Built 2026-10-16, on test: migration
  `20261016200000_reminder_emails.sql` (`motorcycles.odometer_updated_at`
  plus a trigger, `profiles.email_token` for unsubscribe links,
  `notifications_sent`, the job functions, `unsubscribe_reminders`). Code:
  `lib/reminders.ts` (what to send, tested), `lib/reminderEmail.ts`
  (templates, tested; lists cap at 8 tasks + "and N more"),
  `lib/reminderJob.ts` (the run; claims before sending, releases on
  failure, stops at 80 emails a run for Resend's free plan), `lib/email.ts`
  (Resend API). Unsubscribe: a link to `/unsubscribe` (asks first) and
  one-click `List-Unsubscribe` → `/api/unsubscribe`. Manual runs:
  `?dry-run` previews; off production a real send needs `?only=<email>`
  (the test database has friends' real addresses). Checked on test: dry
  run, the guard, and the database functions (rolled-back test).
  ✅ 2026-10-17: Resend keys (swingarm-app-test, swingarm-app-prod) in
  `.env.local` and Vercel (type **Secret**; saved as Config first, which
  Vercel flags "Needs Attention"). Real test sends to the owner: within
  the first week nothing sent, after it one email, a repeat run nothing.
  Email resized for phones after the first one. ✅ Both reminder
  migrations on production (checked: Vault secret, grants, RLS on
  `notifications_sent`, trigger, every profile has a token).
  ✅ Released 2026-10-17: `CRON_SECRET` in Vercel as a Secret (Production
  = prod Vault's secret, read in prod's SQL Editor; Preview = test's), then
  `main` (16:00 UTC). First daily run 2026-10-18 at 15:00 UTC; on release day 3 riders
  had bikes past their first week. The first production run emails every
  rider with reminders on about everything already due.
  ✅ Checked 2026-10-19: the first two daily runs (10-18, 10-19) finished
  without errors in Vercel's Cron Jobs logs, and the emails arrived.
- **Decided (2026-10-20, owner): web push stays in.** If SwingArm launches
  as a web app only (store apps undecided, step 7), riders should still
  get push. The preference and job parts carry over to native push if the
  store apps happen. First step, **Add to Home Screen** (released
  2026-10-20, below). ✅ **Web push, released 2026-10-20.**
  - Migration `20261020120000_web_push.sql` (pushed to test; checked with
    a rolled-back test: the job sees a device, RLS hides it from other
    riders, a second account signing in on the same browser takes it over,
    removal works): `profiles.push_task_reminders` and
    `push_odometer_reminders` (default on), `push_subscriptions` (one row
    per device; riders read and delete their own; saved through
    `save_push_subscription`, a security definer function, because an
    endpoint may still be another account's), `remove_push_subscriptions`
    for the job, and `reminder_job_data` with each rider's push switches
    and devices (riders with only push count too).
  - **Decided (Claude, 2026-10-20; owner can change):** push carries the
    daily reminders (tasks coming due, odometer check-in), not the monthly
    summary. Its switches are separate from the email ones, so
    unsubscribing from email leaves push alone. Keys are the email's with
    `push:` in front, so each reminder goes once per channel. At most one
    push a day, to every device the rider turned on. Signing out turns
    push off on that device.
  - Code: `lib/reminders.ts` (`planPushReminders`), `lib/pushMessage.ts`
    (the notification text, tested), `lib/push.ts` (web-push library;
    404/410 → the device is deleted), `lib/reminderJob.ts` (push before
    email, not under the 80-email cap; `push` counts in the result and the
    dry run), `lib/actions/push.ts` (save, remove, send a test),
    `app/hooks/usePush.ts`, `public/sw.js` (shows the notification, a tap
    opens or focuses SwingArm; no caching; served no-cache from
    `next.config.ts`), `public/icons/badge-96.png` (Android's status bar
    icon). More → **Push notifications**: "On this device" switch, Send a
    test, and the two type switches once any device has push; on iPhone
    in Safari it says to add SwingArm to the Home Screen first. Privacy
    policy (push addresses, push services, service worker; dated
    2026-10-20), help page and Download my data updated.
  - **VAPID keys:** devices subscribe to one key pair, so environments on
    the same database share one: local and Preview use test's pair (in
    `.env.local`), Production gets its own. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
    and `VAPID_PRIVATE_KEY` (type Secret). The public key is built into
    the page, so add it before the deploy or redeploy after.
  - ✅ Preview keys in Vercel (2026-10-20; a variable's environments are
    behind a click on "Environments", and the build needs a fresh
    deploy). Checked on test 2026-10-20: Test arrived on Android (Chrome)
    and the iPhone Home Screen app (Apple's push service); a real run
    (from the local server, same database and keys) pushed "10
    maintenance tasks need attention" to Android, and a repeat run found
    nothing to send. ✅ Checked (Android 2026-10-26, iPhone 2026-10-27): a
    tap opens SwingArm, sign out turns push off on that device, a real
    reminder arrives.
  - ✅ Released 2026-10-20: production VAPID pair in Vercel Production
    (generated by the owner, never in a file), migration on production
    (checked: RLS and 2 policies, the columns, function grants,
    `reminder_job_data` returns push data), then `main`. The first daily
    run with push is 2026-10-21 at 15:00 UTC; riders get push only after
    turning it on in More.
  - Details of Add to Home Screen: A web app manifest (`app/manifest.ts`; icons in
  `public/icons/`, rendered from `public/brand/`, the maskable one zoomed
  out so Android's circle crop keeps the swingarm), iPhone Home Screen
  tags and theme colors in `app/layout.tsx`. More → SwingArm shows
  **Install SwingArm** where the browser offers an install prompt (Chrome,
  Edge, Android; `useInstallPrompt`), the Share-menu steps on iPhone and
  iPad, and nothing once installed or where the browser can't. To check
  on a real iPhone: the status bar color, and whether sign-in carries over
  to the Home Screen app (iOS may keep its storage apart from Safari's, and
  magic links open in Safari). If it doesn't, consider a 6-digit sign-in
  code in the email as well as the link, typed into the app.

- A daily scheduled job (Vercel Cron or Supabase `pg_cron` + Edge Function)
  finds tasks that just turned Soon/Urgent/Overdue and stale odometers, checks
  each user's preferences, and sends — once per task per state, never daily
  nagging (needs a `notifications_sent` log).
- Channels, in order: **email** first (works everywhere; e.g. Resend), then
  **web push** (browsers and installed web app), then **native push** in the
  phone apps (Firebase Cloud Messaging for Android, APNs for iOS).
- Time-based due dates don't change with riding, so reminders work even when
  the odometer is stale — which is exactly why the odometer reminder matters.
- Email cost (discussed 2026-10-15): keep Resend's free plan (100 a day,
  3,000 a month) until reminders outgrow it. Send one daily summary per
  rider ("2 tasks due on your Norden"), not one email per task, to keep
  the count low. When it's outgrown, compare Resend Pro ($20 a month for
  50,000) with Amazon SES (about $0.10 per 1,000, more setup); check
  current prices then. Not DreamHost: low hourly sending cap, terms meant
  for personal mailboxes, no delivery log, and app mail flagged as spam
  would hurt support@ on the same domain. Templates stay in our code and
  `supabase/templates/`, so switching providers is a settings change.

## 6. Paid tiers 💤

- **Proposed tiers:**
  - **Free:** 1 bike, starter checklist, applying already-approved
    manufacturer schedules (open: or not?), service log, spend summary.
  - **Pro:** multiple bikes, importing a schedule from your own manual (with a
    monthly limit to cap API cost), export/share (open), priority features.
- **Decided (2026-10-13):** free during early access until paid tiers are
  built. The home page says so.
- Owner's first idea for Pro (2026-10-13): **$3.95/month or $25/year**.
  Notes for when this is decided:
  - Store fees (check current terms before deciding): Apple takes 30%, or
    15% in its Small Business Program (under $1M a year) and on
    subscriptions after a subscriber's first year; Google Play takes 15% on
    subscriptions. Stripe on the web is about 2.9% + $0.30 per charge (US
    cards), so small monthly charges lose more to the fixed fee. Rules on
    linking from the iPhone app to web purchase have been changing (US
    court rulings in 2025); check what's allowed then.
  - Rough take-home per subscriber: $3.95/month → about $3.36 via Apple or
    Google at 15%, about $3.54 via Stripe. $25/year → about $21.25 via the
    stores at 15%, about $23.98 via Stripe. Before any income tax, sales tax
    or VAT.
  - App Store prices come in fixed steps that mostly end in .99, so
    $3.95 would likely be $3.99 there.
  - $25/year is about 6 months of the monthly price (47% off). A common
    yearly discount is about 2 months free, which would be about $39.
- **Open:** final prices, whether early riders get grandfathered, free trial
  length.
- Technical: an `entitlements`/`subscriptions` table checked by server actions
  (never only in the UI). Payments: **Stripe** on the web. Apps sold through
  the App Store/Play must use their in-app purchase for digital subscriptions;
  **RevenueCat** can unify Stripe + Apple + Google into one "is Pro" status.
- Opening manual import to non-admins happens here (pending review stays).
- Any bike limit (e.g. Free = 1 bike) must also be checked in
  `importAccountDataAction`, which adds bikes without going through
  `addBikeAction`.

## 7. Phone apps (iOS and Android) 🔨

- ✅ **Released 2026-10-28** (all of `develop`, owner's go-ahead): the
  security update (Next.js 16.4.3, Zod 4.6.7; Next 16.2.9 had critical
  advisories) with the app work below. The site changes are invisible in
  browsers; the app-only code switches on inside the app. Checked: pages
  load, the sign-in callback redirects to swingarm.app.
- 🔨 **Started 2026-10-27** (store accounts wait on the D-U-N-S fix, so
  Android first): Capacitor 8.5.3, app id `app.swingarm`,
  `capacitor.config.ts` loads swingarm.app (`CAPACITOR_SERVER_URL` points
  a build at the test site), an offline page (`mobile/offline.html`, "Can't
  reach SwingArm"), the user agent ends in `SwingArmApp`. `android/`
  generated; icons and splash from SVGs in `assets/app/` (`npm run
  app:icons`; Android's adaptive icon zooms the artwork out to fit the
  round crop). Capacitor's docs say a remote `server.url` is "not intended
  for production"; it's still the plan, since the site needs its server
  (server actions) and can't be bundled into the app.
  Next:
  1. ⏳ Owner: install Android Studio (it brings Java and the Android SDK),
     then a first build on the owner's Android phone, pointed at the test
     site.
  2. ✅ Splash on Android 12+ (2026-10-28): the icon on the page color for
     the phone's light or dark mode (`windowSplashScreenBackground`,
     `page_background` in `values/` and `values-night/`), and the web view
     shows the same color until the site paints (MainActivity), so light
     mode no longer flashes dark. Both follow the phone, not the rider's
     theme, which is only known once the site loads. Checked dark on the
     Pixel. Android 11 and older still show the light splash image.
  3. 🔨 Sign-in in the app (built 2026-10-28): Google opens in an in-app
     browser tab (`@capacitor/browser`; Google blocks sign-in inside web
     views) and returns to `app.swingarm://auth/callback`
     (`app.swingarm.dev://` for development builds), which Android hands to
     the app (`NativeAppLinks`, `lib/appLinks.ts`) and the web view finishes
     at /auth/callback, where the sign-in cookie waits. The email code works
     as before. Checked with a test link (lands in the app, fake code
     rejected). The callback now redirects to the address it was reached on
     (the dev server said localhost). ⏳ Owner: add `app.swingarm.dev://auth/callback`
     and `app.swingarm://auth/callback` to swingarm-test's Redirect URLs
     (Authentication → URL Configuration), then try Google in the app.
     ✅ Owner added both (2026-10-28).
     Production gets `app.swingarm://auth/callback` with the store build.
     The email's link still opens the browser (needs Android App Links,
     below).
  4. Links that open the app (Android App Links: `assetlinks.json` on
     swingarm.app), e.g. the sign-in email's link and share links.
     💤 Waits for the Play account (Claude, 2026-10-28): Android checks
     `assetlinks.json` against the store build's signing key, which Play
     makes. A development build can't really try it: it loads the dev
     server (test database), so swingarm.app links would open it on pages
     that don't exist there, and the test site's Vercel login keeps Android
     from checking a test.swingarm.app file. The sign-in email's link goes
     through Supabase's address first, so it also needs the templates to
     link to swingarm.app (`/auth/confirm` with `{{ .TokenHash }}`, which
     works in any browser, no sign-in cookie needed). Meanwhile the app
     signs in with the email's code or Google.
  5. 🔨 Native push (built 2026-10-28): Firebase Cloud Messaging. ✅ Owner
     made the Firebase project `swingarm-e40d2` (Analytics off) with both
     app ids, and downloaded `android/app/google-services.json`
     (gitignored: the repo is public and GitHub flags its API key).
     `@capacitor/push-notifications` registers with Firebase; the token is
     saved in `push_subscriptions` as kind `fcm` (migration
     `20261028120000_app_push.sql` and `20261028130000_app_push_token_check.sql`
     (Postgres caps regex repeat counts at 255), ✅ pushed to test and
     production (2026-10-28, owner's go-ahead). ✅ Released 2026-10-28
     (all of `develop`, with print and the status bar; pages checked):
     `save_app_push_device`, `reminder_job_data` with each device's kind).
     The job and Test send through FCM's HTTP v1 API (`lib/fcm.ts`, signed
     in as the service account with a JWT, no extra library; UNREGISTERED
     and SENDER_ID_MISMATCH delete the device). Android: the
     POST_NOTIFICATIONS permission, a one-color swingarm icon
     (`ic_stat_swingarm`), accent color, a "Maintenance reminders" channel,
     notifications shown while the app is open too, and a tap opens the
     notification's page. More's switch works the same as in a browser
     (signing out turns it off, signing back in turns it on); "Coming
     soon" is gone. Privacy policy (Google sees the notification text, it
     isn't end-to-end encrypted like web push) and help updated.
     ⏳ Owner: the service account key in `.env.local` and Vercel
     (`FIREBASE_SERVICE_ACCOUNT`), then try it on the phone.
     ✅ Key in `.env.local`; turning on and Test work on the Pixel (owner,
     2026-10-28), from the shade with the app closed too, and a tap opens
     the notification's page. ✅ Key in Vercel (Production and Preview).
     Known gap: if Firebase ever changes an install's token, push stops on
     that phone until the rider turns it off and on (rare: tokens change on
     reinstall or clearing the app's data, which start fresh anyway).
  6. ✅ Inside the app (2026-10-28, owner testing on a Pixel): no Add to
     Home Screen; push on More said "Coming soon to the app" (until item 5); Download my
     data and the CSV go to the phone's share sheet (`@capacitor/filesystem`
     and `@capacitor/share`, since the web view can't download), and so does
     the share link. Also: the page starts below the status bar, a
     page-colored strip covers it when scrolling, the bottom bar hides while
     a text field has focus (the app shrinks the page for the keyboard, so
     the bar sat over forms' buttons), dialogs clear both system bars.
     Development builds are "SwingArm Dev" (`app.swingarm.dev`); the test
     site's Home Screen app is named "SwingArm Test".
     ✅ Print / Save as PDF in the app (2026-10-28): web views ignore
     window.print(), so `PrintPlugin` (the app's own) opens Android's print
     screen, which has Save as PDF. Print styles now drop the status bar
     space and strip, print on white with a light color scheme, and set
     12 mm margins (`@page`; Android's print screen has none); the web view's
     background is white while printing, or the margins print dark. Checked
     on the Pixel in the dark theme: one clean page.
     ✅ Status bar icons follow SwingArm's theme (2026-10-28,
     `NativeSystemBars`: watches the `dark` class, `SystemBars.setStyle`).
     Checked on the Pixel: light icons on dark, dark icons on light with the
     phone in dark mode.
     Found (owner, 2026-10-28): Excel on Android says any of our CSVs is
     corrupted, Chrome's download too, with or without the UTF-8 marker, so
     it's Excel's phone app, not SwingArm. Google Sheets on the phone opens
     it but shows the marker as "ï»¿" before "Date". 💤 Maybe an `.xlsx`
     export later.
  7. iPhone once Apple approves: `ios/`, Sign in with Apple (web too),
     Apple's push key. Building needs a Mac (Xcode) or a cloud build.
- Wrap the web app with **Capacitor** (already the plan). The app loads the
  hosted site, plus native push, app icon, splash screen, and deep links.
- Apple rejects apps that are "just a website", so native push and a
  phone-first layout matter for approval.
- Needs: Apple Developer account ($99/year), Google Play Console ($25 once),
  **Sign in with Apple** (required when Google sign-in is offered; never
  finished), privacy policy and terms URLs, in-app account deletion, store
  screenshots and descriptions, and in-app purchase if Pro is sold in-app.
- **Decided (owner, 2026-10-23): yes, store apps**, as Cheese and Beer LLC
  (organization accounts, which need a free D-U-N-S number; see the launch
  checklist). Earlier question (2026-10-20): are the store apps worth it if
  the web app (with Add to Home Screen) is enough? Discussed: the stores bring
  discoverability, trust and native push on iPhone, and are needed for the
  auto-odometer and offline manuals ideas; the cost is $99 a year (Apple)
  plus $25 once (Google), the Capacitor work, sign-in inside the app
  (Google blocks its sign-in in embedded web views, so it needs the
  system browser and a link back into the app), store review and
  listings, and Apple's cut of in-app Pro sales. Google Play makes new
  personal accounts run a closed test with testers for two weeks before
  release; organization accounts (Cheese and Beer LLC, which needs a free
  D-U-N-S number, as Apple's organization enrollment does) skip it. Check
  current rules when starting.
- **Sign in with Apple** needs the Apple Developer Program ($99 a year)
  even on the web, so it can come before the apps. Notes: Supabase
  supports it; the web client secret is a signed key that expires every 6
  months and must be renewed; riders can hide their email behind Apple's
  relay address, and reminder emails only reach those if swingarm.app's
  sending domain is registered with Apple's private email relay.

## 8. Analytics 🔨 (before launch)

**Decided (owner, 2026-10-23): Vercel Web Analytics**, not GA4 + GTM (for
now). It's billed per event out of Vercel Pro's monthly usage credit
($0.03 per 1,000 events, checked 2026-10-23), uses no cookies (no consent
banner, EU and UK included), and keeps 12 months. Pro allows two
properties per custom event; Web Analytics Plus ($10 a month) isn't
needed. GA4 can come later if funnels or retention reports are wanted.

✅ Built and released 2026-10-23:
`@vercel/analytics` 2.0.1. `app/layout.tsx` renders `SiteAnalytics` only
when `VERCEL_ENV` is production, so test and local send nothing (`track()`
does nothing without the script). Before sending, `redactAnalyticsUrl`
(`lib/analytics.ts`, tested) replaces share tokens and bike ids in the path
and drops every query parameter but `view` (unsubscribe tokens, sign-in
codes). Events through `trackEvent`: Bike added (make, model), Service
logged (tasks, past), Start points set (start, tasks), Schedule applied,
Custom task added, Share link created, Push turned on, Backup imported
(bikes), Getting started closed. Never names, emails, notes or ids. Privacy
policy updated (usage statistics, Vercel's role, the cookies section).
✅ Web Analytics was already on for the project (Vercel serves
`/_vercel/insights/script.js`; its Analytics tab shows "Get Started" until
the first visit). First data arrived 2026-10-23 (owner checked). Riders
with ad or content blockers aren't counted. ⏳ Owner: check that Vercel Pro
continues after the trial.

Earlier thoughts (2026-10-15):

- Two kinds, possibly both:
  - **Site traffic:** visits, pages, where visitors come from, on the
    home page and the app. **Vercel Web Analytics** is built into the host,
    uses no cookies, and is one component in `app/layout.tsx`.
  - **Product use:** what signed-in riders do (add a bike, log service,
    apply a schedule, share a history), sign-up to first-service rates,
    who comes back. Needs custom events: e.g. **PostHog** (generous free
    tier; also does feature flags) or Vercel's custom events.
- Privacy: send no names, emails or bike details, only anonymous IDs and
  event names. The privacy policy (needed before launch anyway) must say
  what's collected. Cookieless tools avoid a cookie banner in the EU and UK.
- Works in the phone apps too, since they load the hosted site.
- Track only on production, so the test site and local dev don't skew the
  numbers.
- **Leaning (2026-10-15): GA4 through Google Tag Manager.** The owner has
  used both, which counts for more than the differences between tools. Free,
  with funnels and retention reports, and GTM lets the owner add or change
  tags without a code release. Notes for building it:
  - Next.js has `GoogleTagManager` and `sendGTMEvent` in
    `@next/third-parties/google` (still marked experimental; see
    `node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md`).
    The container goes in `app/layout.tsx`; app events are pushed to the
    `dataLayer` from the handlers (bike added, service logged, schedule
    applied, history shared), and GTM turns them into GA4 events.
  - The GTM ID goes in an environment variable set only for Production in
    Vercel, so test and local send nothing.
  - GA4's user ID can be the Supabase user ID (a random UUID, allowed);
    never the email, which Google's terms forbid.
  - GA4 sets cookies, so riders in the EU and UK need a consent banner and
    Consent Mode before tracking. Possible: launch US-first and add consent
    before marketing there.
  - Ad blockers block GA, so numbers will run low, more so for tech-minded
    riders.
  - The phone apps' store privacy labels must list analytics. Apple's
    tracking prompt (ATT) isn't needed as long as GA4's ads features
    (Google signals, ads linking) stay off.
- ~~Open: confirm GA4 + GTM~~ Vercel Web Analytics chosen instead (above).

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
- **Purchase date on the bike** (tester John, 2026-10-23; owner: after
  launch). So "Never done" and time-based tasks on a used bike count from
  when the rider bought it, not January of the model year. Start points
  (Start today, Log a past service) cover most of this already.
- **Upgrade wish list** (owner, 2026-10-14). Mods and accessories the rider
  is thinking about for a bike: a different exhaust, hand guards, crash
  bars, and so on. Each item has a name, an estimated cost, and links to
  the products being considered (several per item, to compare).
  - First thoughts: a per-bike list beside the maintenance tasks, but
    separate from them (no intervals or due dates). Maybe a priority or
    "next up" order, notes, and a total of the estimated costs.
  - When an upgrade is done, mark it installed with the date, odometer and
    actual cost, so it lands in the service history and the spending
    summary (and the shared history, which helps at resale). Some upgrades
    bring their own maintenance (a new chain, an aftermarket air filter),
    which could become a task.
  - Fits with the affiliate links idea above: a product link could carry an
    affiliate tag. That needs a disclosure.
  - Open: just links typed in by hand, or a preview (title, image, price)
    fetched from the link? Fetching is nicer, but sites block it and
    prices go stale.
- **Bike specs** (owner, 2026-10-19). The numbers a rider looks up again
  and again, saved on the bike: fuel grade (octane, ethanol limit) and tank
  size, tire sizes and pressures (front and rear, solo and with a passenger
  or load), engine oil grade and capacity (with and without a filter
  change), oil filter part number, coolant, brake fluid (DOT 4 etc.), fork
  oil, final drive (chain size and length, sprockets, or shaft oil), spark
  plugs and gap, battery type, bulbs.
  - First thoughts: a "Specs" card on the bike in Garage, quick to pull up
    on a phone at the pump or the air hose. Common fields with suggested
    labels, plus free-form rows (label + value) for anything else.
  - Prefill from the manual: shared per-model specs, submitted `pending`
    and approved like manuals and schedules, which the rider can override
    per bike (different tires after a mod). The schedule import could read
    the manual's specifications page at the same time.
  - Units: tire pressure in psi, bar or kPa and capacities in quarts or
    liters, so units need more settings. Store one unit and convert at
    display, like distances.
  - Use them elsewhere: show the oil spec on the oil-change task and when
    logging it ("10W-40, 3.2 L with filter"), include specs in the shared
    history (useful for a shop or a buyer), match affiliate links to the
    exact part, and feed the battery-type field in the battery reminder idea.
  - Torque values are tempting but safety-critical: only from the manual,
    with the source shown.
  - Open: Free or Pro.

## Smaller items and ideas

- ✅ Re-test: Norden set to 2023 shows no schedule in Manual & schedule
  (confirmed 2026-10-15).
- ✅ Fixed (2026-10-15): a make or model typed into the bike form was saved
  but didn't appear in the form's lists until the page was reloaded.
- ✅ Admin review badge (owner, 2026-10-15; built 2026-10-20, on test):
  for admins, a red count on the bottom right of the avatar (phone and
  desktop) and next to "Review submissions" in More: pending manual links
  plus pending makes/models, the things on the review page. **Decided:**
  approved manuals still needing a schedule don't count (the owner's to-do,
  nobody waiting; a rider's bike saves either way), and pending schedules
  don't either (import is admin-only, so they're approved on save). The
  count reloads when the dashboard loads, e.g. back from the review page.
- ✅ Click or tap outside to close (owner, 2026-10-15; done 2026-10-16).
  The bike switcher, the Export menu and `ConfirmPopover` close on a click
  or tap outside, or Escape (shared hook `useDismiss`). Dialogs opt in with
  `Modal`'s `closeOnOutsideClick`; only Share service history does.
  **Decided:** forms stay X-only (and Escape), so a stray tap doesn't throw
  away what was typed: add and edit bike, log service, custom task, the
  schedule import, and Manual & schedule (a rider reaching for Save link
  could miss and close it).
- ✅ Hand cursor on every button (2026-10-15). Tailwind 4 gives buttons
  the arrow cursor, so a base rule in `globals.css` sets the pointer
  (reported on Sign out and the login page's buttons).
- ⏳ Help pages for signed-in riders (owner, 2026-10-15):
  - **About:** `/about` already shows the home page to signed-in riders
    (More → About SwingArm). Open: is that enough, or should it be its own
    page?
  - ✅ **Instructions** (built 2026-10-16): **/help**, "How SwingArm
    works", public and server-rendered. Sections: add your bike, how tasks
    come due (statuses, counting from new, keeping the odometer current),
    log service, change your checklist, manual and schedule, history and
    sharing, settings. Linked from More (its own row above Help and
    feedback), the home page's Questions section and the footer. The
    public pages share `SiteChrome.tsx` (header and footer). **Keep it in
    step with the app** when buttons or behavior change.
  - **FAQ:** TBD. The home page has a short FAQ that could grow into its
    own page.
- ✅ Import data (owner, 2026-10-16; built 2026-10-20, on test): load a
  "Download my data" file back in, e.g. to restore after deleting or to
  move between accounts. More has a **Your data** group: "Download a
  copy" (the delete dialog's export, shared as `DownloadDataButton`) and
  "Import a backup" (`ImportDataModal`). **Decided:** import always adds
  bikes as new ones with their tasks and history, never overwriting; a
  preview lists each bike ("12 tasks · 31 service records") with a
  checkbox, and bikes already in the garage (same year, make and model)
  start unticked (owner's pick over skipping them). Settings in the file
  are ignored. Routine services link to the imported task with the same
  name. All or nothing: if a bike fails, the bikes this import added are
  removed. Imported bikes are new, so reminders wait their first 7 days.
  Security (discussed 2026-10-20): the file is untrusted, so
  `lib/accountImport.ts` checks it in the browser and again on the server
  (Zod; `format_version: 1` only; years, distances, dates, categories and
  text lengths; at most 50 bikes, 200 tasks and 2,000 service records a
  bike, 5 MB). Ids, owners and emails in the file are never used, and
  import never touches the shared make/model, manual or schedule lists.
  The CSV export now neutralizes spreadsheet formulas (a leading `'` on
  text starting with = + - @). Later, maybe: import from a spreadsheet or
  other apps.
- 💤 Announcements (2026-10-19): the privacy policy and terms promise
  notice "by email or in the app" before significant changes, and notice
  before closing SwingArm for good. Build when first needed: a
  dismissible banner in the app (one stored message, plus who dismissed
  it), and for big changes an email to every rider (an admin-only send
  through Resend; reaching every address needs a security definer
  function like the reminder job's). It's a service email, so it goes to
  riders with reminders off too. Resend's free plan sends 100 a day.
- 💤 Save final drive / cooling on the bike so Edit Bike can change them.
- 💤 NHTSA recall alerts per bike (free data; fits the notifications work).
- 💤 Offline use of manuals in the phone app.

## Suggested order

1. Name → 2. design direction (can overlap) → 3. hosting with test + prod →
4. settings + preferences → 5. email notifications → 6. paid tiers →
7. phone apps (push, Apple sign-in, store submission). 8. Analytics can
go in any time before launch, ideally before the first public riders.

Hosting comes before notifications and payments because both need a public
URL, scheduled jobs, and webhooks, and should be tried on the test site first.

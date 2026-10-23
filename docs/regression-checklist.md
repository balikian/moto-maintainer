# Regression checklist

The core flows the QA tester walks on every pass, by tracing each one from the
screen through the server action and database and back. One line per flow;
add a line when a feature ships. Main code paths are in brackets.

## Sign-in and account

- Sign in with Google: lands on the garage; `next` can only be a path on this site. [`lib/actions/auth.ts`, `app/auth/callback`]
- Sign in by email: the email has a code and a link; the code typed into the card signs in anywhere (iPhone Home Screen app too), the link on the same browser. [`sendMagicLink`, `verifyEmailCode`, `supabase/templates/magic-link.html`]
- Sign out: push is turned off on this device first, then back to the home page. [`MoreView`, `turnOffPushOnThisDevice`, `logout`]
- Delete account: only after typing DELETE; everything the rider owns is gone, submitted manuals stay; home shows "account deleted". [`deleteAccountAction`, `delete_my_account`]
- Signed-out visitors get the home page at `/`; signed-in riders get it at `/about`. [`app/page.tsx`, `HomePage`]

## Tasks

- New bike's tasks: the manufacturer schedule if there is one, else generic tasks by final drive and cooling, all without a start point. [`addBikeAction`, `getDefaultTasks`, `genericTasksFor`]
- "When were these last done?": Log a past service (any of these tasks, the next one starts on the same date), Start today, Never done, and Start all today / None done yet, each with a confirm. [`MaintenanceChecklist`, `setTaskStartAction`]
- Start today needs an odometer reading; Never done counts from 0 and January 1 of the model year. [`setTaskStartAction`, `fromNewBaseline`]
- Due states: distance or time, whichever comes first; Soon at 25% left, Urgent at 10%, Overdue past due; no-interval and no-start tasks. [`getTaskDueState`]
- Sorting: no-start group first, then cards most due first, then "All good" rows; ties by name. [`groupTasksByUrgency`]
- Odometer update: saves in miles, the same reading counts as a check-in, no reading shows Add reading. [`OdometerControl`, `updateOdometerAction`]
- Edit a task's intervals and category; Reset to default; Delete a task keeps its service records as one-offs. [`TaskCard`, `updateTaskIntervalsAction`, `deleteTaskAction`]
- Add a custom task: name, intervals, last done at (blank = current odometer; required when the bike has no reading) and on (not in the future), category. [`AddCustomTaskModal`, `createMaintenanceTaskAction`]
- Manual and schedule: submit a manual link (pending for riders), apply a schedule (updates, additions, starter tasks removed if never logged). [`BikeManualPanel`, `submitManualAction`, `applyModelScheduleAction`, `planScheduleApply`]
- Bike panel status counts and "N tasks need a start point". [`BikePanel`, `countTasksByStatus`]

## Log service (bottom bar and task cards)

- Log service from the bar or a task card: tick any tasks plus an optional one-off, date (not in the future), optional odometer, where (Home and earlier places as choices), cost for the visit, notes; each task's baseline moves only if this is its newest service. [`LogServiceModal`, `logServiceAction`]
- The first logged service replaces a guessed start point (today, never done), however old. [`logServiceAction`]
- A task card's related jobs say "Do it with this" at the top of the list; tasks needing attention come next, the rest behind Show all tasks. [`batchCandidates`, `LogServiceModal`]
- Logging with a higher odometer raises the bike's odometer; a lower one never lowers it. [`logServiceAction`]
- Log service from pages outside the dashboard (`/?log=service`) opens the dialog once. [`AppNav`, `GarageApp`]

## History

- Service records newest first, grouped into visits (same day, odometer and place), with odometer (when there is one), where, cost and notes; delete a record with a confirm. [`ServiceHistoryView`, `groupServiceVisits`, `deleteServiceLogAction`]
- Deleting the record a task counts from moves the task back to its latest remaining record, or to no start point. [`rewindTaskIfNeeded`, `baselineFromLogs`]
- Spending: this year or all time, by category. [`SpendSummary`, `summarizeSpend`]
- Share button, and Export: CSV (with Where; formulas neutralized), printable page (owner only; anyone else gets "This page is private"). [`ExportMenu`, `ShareButton`, `buildServiceHistoryCsv`]

## Garage

- Add a bike (year, make, model, optional odometer, drive, cooling); typed-in make/model joins the lists at once and goes for review. [`BikeFormModal`, `addBikeAction`, `suggestCustomModel`]
- Edit a bike's year, make or model; tasks and history stay. [`updateBikeAction`]
- Remove a bike with a confirm; its tasks, records and share links go; if it was active, the first bike becomes active. [`deleteBikeAction`, `GarageApp`]
- Switch the active bike (Garage, the bike name with 2+ bikes, desktop list); saved to the profile. [`BikeSwitcher`, `updatePreferencesAction`]
- Each bike shows its odometer and "1 overdue · 2 soon · N to set up". [`GarageView`, `BikeStatusLine`]

## More

- Distance units (miles or km) change every distance shown and typed; stored values stay in miles. [`usePreferences`, `lib/units.ts`]
- Theme Auto/Light/Dark, cached so the first paint matches. [`usePreferences`, `THEME_BOOT_SCRIPT`]
- Reminder email switches (tasks, odometer, monthly summary). [`updatePreferencesAction`]
- Push: turn on for this device, send a test, the two type switches; iPhone Safari asks for Add to Home Screen first. [`usePush`, `lib/actions/push.ts`]
- Download my data (JSON); Import a backup adds bikes as new, all or nothing, duplicates unticked. [`buildAccountExport`, `importAccountDataAction`, `parseAccountImport`]
- Install SwingArm row where the browser offers it. [`useInstallPrompt`]
- `?view=` with a junk value falls back to Tasks. [`useView`]

## Public pages

- Home, `/help`, `/privacy`, `/terms` render signed out; signed-in riders on a phone also get the bottom bar. [`SiteChrome`, `AppNav`]
- `/help` matches what the app does (update it when buttons or behavior change). [`app/help/page.tsx`]

## Share and print pages

- Printable history `/history/<bikeId>`: owner only (others get 404), light theme, prints cleanly. [`app/history/[bikeId]`]
- Shared history `/share/<token>`: read-only for anyone with an active token; revoked or short tokens show "isn't available"; no email shown. [`app/share/[token]`, `get_shared_history`]
- Revoke a share link: the old link stops at once; a new one gets a new token. [`revokeShareLinkAction`, `createShareLinkAction`]

## Admin

- `/admin` is 404 for non-admins; admins see manuals without a schedule, new makes/models and manual links to review. [`app/admin/page.tsx`, `is_app_admin`]
- Import a schedule from manual pages (admin-only Claude call), review, save as approved; older copies for the same model and years are replaced. [`extractScheduleAction`, `saveModelScheduleAction`]
- Approve or reject manual links and makes/models; review badge on the avatar and in More. [`reviewManualAction`, `reviewCustomModelAction`, `CountBadge`]

## Reminders and push

- Daily job (15:00 UTC): only with the cron secret; off production needs `?only=` or `?dry-run`. [`app/api/cron/reminders`]
- Task reminders at Soon and Overdue, once each per service cycle, not in a bike's first 7 days, never for tasks without a start point. [`planDailyReminders`]
- Odometer check-in every 30 days the reading stays the same. [`planDaily`]
- Monthly summary on the 1st to 3rd, about last month, if turned on. [`planMonthlySummary`]
- Push: same reminders under `push:` keys, one push a day to every device, gone devices deleted, failures released for the next run. [`planPushReminders`, `runReminderJob`, `lib/push.ts`]
- Email cap of 80 a run; claims before sending, releases on failure. [`runReminderJob`]
- Admin review email: once a day to each admin while manual links or makes/models are pending; manual links show the site only, never a clickable link; a wrong job secret is refused. [`admin_review_digest`, `adminReviewEmail`, `runReminderJob`]

## Unsubscribe

- The email's "Turn off these emails" asks first, then turns off that kind; push is left alone. [`app/unsubscribe`, `unsubscribe_reminders`]
- One-click List-Unsubscribe POST works without signing in; a bad token is refused. [`app/api/unsubscribe`]

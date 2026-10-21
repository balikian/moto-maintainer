import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/site';
import { getSignedInClient } from '@/lib/supabase/server';
import { SITE_WRAP, SiteFooter, SiteHeader } from '../components/SiteChrome';
import { ui } from '../components/ui';

export const metadata: Metadata = {
  title: 'How SwingArm works',
  description: 'Add your bike, see what’s due, log service, and share your bike’s history: SwingArm step by step.',
};

// The how-to, public so it can be linked from anywhere (More → How SwingArm
// works, the home page). Keep it in step with the app when features change.

const SECTIONS = [
  { id: 'add-a-bike', title: 'Add your bike' },
  { id: 'what-is-due', title: 'How tasks come due' },
  { id: 'log-service', title: 'Log service' },
  { id: 'your-checklist', title: 'Change your checklist' },
  { id: 'manual-and-schedule', title: 'Manual and manufacturer schedule' },
  { id: 'history', title: 'History, spending and sharing' },
  { id: 'settings', title: 'Settings and your account' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find((section) => section.id === id)?.title;
  return (
    <section id={id} className="scroll-mt-6 space-y-3 border-t border-line pt-8">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-6 marker:font-bold marker:text-accent">{children}</ol>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 marker:text-muted">{children}</ul>;
}

/** A button or label as it appears in the app. */
function Ui({ children }: { children: ReactNode }) {
  return <strong className="font-bold">{children}</strong>;
}

const STATUSES = [
  { name: 'Soon', color: 'text-warn', meaning: 'the last quarter of the interval' },
  { name: 'Urgent', color: 'text-danger', meaning: 'the last tenth of the interval' },
  { name: 'Overdue', color: 'text-danger', meaning: 'past the interval' },
];

export default async function HelpPage() {
  const { user } = await getSignedInClient();

  return (
    <div className={ui.page}>
      <SiteHeader signedIn={user !== null} />

      <main className={`${SITE_WRAP} max-w-[760px] space-y-8 py-12 text-[16px] leading-relaxed sm:py-16`}>
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">How SwingArm works</h1>
          <p className="text-lg text-muted">
            SwingArm keeps a checklist of maintenance jobs for each of your bikes and tells you when each one is due, by
            distance or by time, whichever comes first.
          </p>
          <p className="text-muted">
            On a phone, the navigation bar at the bottom has links to <Ui>Tasks</Ui>, <Ui>History</Ui>,{' '}
            <Ui>Garage</Ui> and <Ui>More</Ui>, with the red <Ui>Log service</Ui> button in the middle. On a computer
            they’re in the navigation bar at the top. Your avatar at the top right opens the <Ui>More</Ui> page.
          </p>
        </div>

        <nav aria-label="On this page" className={`${ui.card} p-4`}>
          <h2 className="mb-2 text-sm font-bold text-muted">On this page</h2>
          <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="font-bold text-accent hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="add-a-bike">
          <Steps>
            <li>
              Open <Ui>Garage</Ui> and tap <Ui>Add bike</Ui>. (On Tasks you can also tap the bike’s name, then{' '}
              <Ui>Add bike</Ui>.)
            </li>
            <li>
              Pick the year, make and model. If yours isn’t listed, choose <Ui>Other / Not Listed</Ui> and type it in.
            </li>
            <li>Enter the odometer reading.</li>
            <li>
              Choose the final drive (chain, belt or shaft) and the engine cooling (liquid or air/oil). These pick the
              starter checklist, so a shaft-drive bike doesn’t get chain jobs.
            </li>
            <li>
              Tap <Ui>Add to garage</Ui>.
            </li>
          </Steps>
          <p>
            If we have the manufacturer’s maintenance schedule for your model, the checklist starts from it. Otherwise it
            starts with a sensible set of common jobs, which you can change any time. Then tell SwingArm when each job
            was last done (see <a href="#what-is-due" className="font-bold text-accent hover:underline">how tasks come due</a>).
          </p>
          <p>
            With more than one bike, tap the bike’s name on Tasks to switch between them, or pick one in Garage. Garage is
            also where you edit or remove a bike.
          </p>
        </Section>

        <Section id="what-is-due">
          <p>
            Each task has a distance interval (“every 4,000 miles”), a time interval (“every 12 months”), or both.
            Whichever runs out first decides when it’s due, so a bike that sits all winter still gets its brake fluid
            changed.
          </p>
          <p>As a task gets close, it changes status:</p>
          <ul className="space-y-1.5 pl-1">
            {STATUSES.map((status) => (
              <li key={status.name}>
                <span className={`font-extrabold ${status.color}`}>{status.name}</span>: {status.meaning}
              </li>
            ))}
          </ul>
          <p>
            Tasks that need attention are shown as cards at the top of Tasks, most due first. Everything else is under{' '}
            <Ui>All good</Ui>. Tap any task to see its interval and when it was last done.
          </p>
          <p>
            <Ui>Each task needs a start point.</Ui> A new bike’s tasks are listed under{' '}
            <Ui>When were these last done?</Ui> at the top of Tasks, and they won’t come due until you choose one of
            these for each task:
          </p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>
              <Ui>Log a past service</Ui>: the last time you know it was done (an old receipt or a dealer stamp is fine).
              The task counts from that date and odometer reading.
            </li>
            <li>
              <Ui>Start today</Ui>: if you don’t know, the task counts a full interval from today’s odometer reading.
              If you find an old receipt later, log it and the task counts from that instead.
            </li>
            <li>
              <Ui>Count from new</Ui>: if it’s never been done, the task counts from 0 miles and January 1 of the bike’s
              model year. On a used bike, this can show it as overdue.
            </li>
          </ul>
          <p>
            Open a task to choose for that task, or use <Ui>Start all today</Ui> or <Ui>Count all from new</Ui> for
            all of them at once.
          </p>
          <p>
            <Ui>Keep the odometer up to date.</Ui> Distance-based tasks can only count miles you’ve told SwingArm
            about. On Tasks, tap <Ui>Update</Ui> next to the odometer and enter the new reading.
          </p>
        </Section>

        <Section id="log-service">
          <Steps>
            <li>
              Tap <Ui>Log service</Ui> in the bar, or open a task and tap its <Ui>Log service</Ui> button.
            </li>
            <li>
              Pick the task, or <Ui>+ Something else (one-off job)</Ui> for work that isn’t on your checklist, like a
              new tire or fork seals.
            </li>
            <li>Enter the date and the odometer reading when it was done. Cost and notes (oil type, parts) are optional.</li>
            <li>
              Under <Ui>While you’re at it</Ui>, SwingArm lists related jobs that are coming up too, like the air filter
              with the oil change. Tick any you did, and they’re logged with the same date and odometer.
            </li>
            <li>
              Tap <Ui>Save service</Ui>.
            </li>
          </Steps>
          <p>The task’s countdown starts again from that date and reading.</p>
        </Section>

        <Section id="your-checklist">
          <p>Tap a task to open it. Its buttons:</p>
          <Bullets>
            <li>
              <Ui>Edit interval</Ui> (pencil): change the distance, the months, or the category. Set either one to 0 if
              it doesn’t apply.
            </li>
            <li>
              <Ui>Reset to default interval</Ui> (circular arrow): go back to the manufacturer’s interval, or the
              starter one.
            </li>
            <li>
              <Ui>Delete task</Ui> (trash can): take it off the checklist. Service you already logged for it stays in
              your history.
            </li>
          </Bullets>
          <p>
            To track something else, tap <Ui>Add a custom task</Ui> at the bottom of Tasks. Give it a name, an interval,
            and when it was last done, so it counts from the right place.
          </p>
        </Section>

        <Section id="manual-and-schedule">
          <p>
            Tap <Ui>Manual &amp; schedule</Ui> on Tasks to open your bike’s owner’s manual and see whether we have its
            manufacturer schedule.
          </p>
          <Bullets>
            <li>
              <Ui>No manual yet?</Ui> Use the links there to find it on the maker’s site, then paste the link and tap{' '}
              <Ui>Save link</Ui>. You can use it right away; we review links before sharing them with other riders.
            </li>
            <li>
              <Ui>Schedule available?</Ui> Tasks shows a banner with <Ui>Review &amp; apply</Ui>. Applying it gives
              matching tasks the manufacturer’s intervals and adds the ones you’re missing. Starter tasks it replaces are
              removed, unless you’ve logged service for them. Tasks you added yourself are kept.
            </li>
          </Bullets>
          <p>Schedules are added model by model, from the manuals riders send in.</p>
        </Section>

        <Section id="history">
          <p>
            <Ui>History</Ui> lists every service you’ve logged for the bike, newest first, with a spending summary by
            category.
          </p>
          <p>
            <Ui>Export</Ui> on History gives you:
          </p>
          <Bullets>
            <li>
              <Ui>Download spreadsheet (CSV)</Ui>, for Excel, Numbers or Google Sheets
            </li>
            <li>
              <Ui>Print / Save as PDF</Ui>, a clean printable history
            </li>
            <li>
              <Ui>Share link…</Ui>, then <Ui>Create share link</Ui>: a read-only page anyone with the link can open,
              handy when you sell the bike. It shows dates, odometer readings, costs and notes, never your email.{' '}
              <Ui>Turn off link</Ui> stops it working.
            </li>
          </Bullets>
        </Section>

        <Section id="settings">
          <p>
            <Ui>More</Ui> has your settings:
          </p>
          <Bullets>
            <li>
              <Ui>Distance</Ui>: miles or kilometers. Everything converts, history included.
            </li>
            <li>
              <Ui>Theme</Ui>: Auto follows your device’s light or dark mode, or pick Light or Dark.
            </li>
            <li>
              <Ui>Reminder emails</Ui>: tasks coming due, an odometer check-in when a bike’s reading hasn’t changed in 30
              days, and a monthly summary. Turn each on or off.
            </li>
            <li>
              <Ui>Push notifications</Ui>: the same task and odometer reminders as notifications on your phone or
              computer. Turn them on for each device under <Ui>On this device</Ui>, and use <Ui>Test</Ui> to check one
              arrives. On an iPhone or iPad, add SwingArm to your Home Screen first and turn them on from the Home Screen
              app. Signing out turns them off on that device.
            </li>
            <li>
              <Ui>Add to Home Screen</Ui>: SwingArm then opens full screen from its own icon, like an app. On an iPhone or
              iPad, open Safari’s Share menu and tap <Ui>Add to Home Screen</Ui>; in Chrome or Edge, use{' '}
              <Ui>Install SwingArm</Ui> on More.
            </li>
            <li>
              <Ui>Download my data</Ui>: every bike, task and service record in one file, to keep as a backup.
            </li>
            <li>
              <Ui>Import a backup</Ui>: adds bikes from that file, with their tasks and history, e.g. to restore them or
              move them to another account. Pick which bikes first; bikes already in your garage start unticked, and
              nothing you have is changed.
            </li>
            <li>
              <Ui>Delete account</Ui>: erases your bikes, tasks and history for good. The dialog lets you download a copy
              of your data first.
            </li>
          </Bullets>
        </Section>

        <section className="space-y-2 border-t border-line pt-8">
          <h2 className="text-2xl font-extrabold tracking-tight">Still stuck?</h2>
          <p>
            Write to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>
            . Ideas and bug reports are welcome too.
          </p>
          <p>
            <Link href="/" className="font-bold text-accent hover:underline">
              {user ? 'Back to your garage' : 'SwingArm home'}
            </Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adminReviewEmail, dailyReminderEmail, dailySubject, escapeHtml, monthName, monthlySummaryEmail } from './reminderEmail';
import { planDailyReminders, planMonthlySummary, type ReminderBike, type ReminderRider, type ReminderTask } from './reminders';

const today = new Date(2026, 9, 16);
const links = { appUrl: 'https://swingarm.app/', settingsUrl: 'https://swingarm.app/?view=more', unsubscribeUrl: 'https://swingarm.app/unsubscribe?token=t&type=daily' };

const task = (id: string, task_name: string, interval_mileage: number): ReminderTask => ({
  id,
  task_name,
  interval_mileage,
  interval_months: 0,
  last_performed_mileage: 0,
  last_performed_date: '2026-01-01',
});

const bike = (id: string, model: string, tasks: ReminderTask[], overrides: Partial<ReminderBike> = {}): ReminderBike => ({
  id,
  year: 2023,
  make: 'Husqvarna',
  model,
  current_mileage: 3000,
  created_at: '2026-01-15T18:00:00+00:00',
  odometer_updated_at: '2026-10-10T00:00:00Z',
  tasks,
  spent: null,
  ...overrides,
});

const rider = (bikes: ReminderBike[], overrides: Partial<ReminderRider> = {}): ReminderRider => ({
  user_id: 'u',
  email: 'rider@example.com',
  email_token: 't',
  unit_system: 'imperial',
  task_reminders: true,
  odometer_reminders: true,
  monthly_summary: true,
  push_task_reminders: true,
  push_odometer_reminders: true,
  push: [],
  sent: [],
  bikes,
  ...overrides,
});

describe('dailySubject', () => {
  it('names a single task and the bike', () => {
    const plan = planDailyReminders(rider([bike('a', 'Norden 901', [task('t', 'Replace engine oil and filter', 2500)])]), today)!;
    assert.equal(dailySubject(plan), 'Overdue: Replace engine oil and filter on your Norden 901');
  });

  it('counts several tasks', () => {
    const plan = planDailyReminders(rider([bike('a', 'Norden 901', [task('t1', 'Oil', 2500), task('t2', 'Chain', 3800)])]), today)!;
    assert.equal(dailySubject(plan), '2 maintenance tasks need attention');
    const soonOnly = planDailyReminders(rider([bike('a', 'Norden 901', [task('t1', 'Oil', 3800), task('t2', 'Chain', 3500)])]), today)!;
    assert.equal(dailySubject(soonOnly), '2 maintenance tasks coming up');
  });

  it('asks for the odometer when that’s all there is', () => {
    const plan = planDailyReminders(rider([bike('a', 'Norden 901', [], { odometer_updated_at: '2026-08-01T00:00:00Z' })]), today)!;
    assert.equal(dailySubject(plan), 'Time to update your Norden 901’s odometer');
  });
});

describe('dailyReminderEmail', () => {
  it('lists tasks by bike in the rider’s units, with the unsubscribe link', () => {
    const plan = planDailyReminders(
      rider([bike('a', 'Norden 901', [task('t1', 'Oil <&> filter', 2500)]), bike('b', 'Svartpilen', [task('t2', 'Chain', 3800)])]),
      today
    )!;
    const email = dailyReminderEmail(plan, 'metric', links);
    assert.match(email.html, /Oil &lt;&amp;&gt; filter/);
    assert.match(email.html, /2023 Husqvarna Svartpilen/);
    assert.match(email.text, /- Oil <&> filter: 805 km overdue/);
    assert.match(email.text, /- Chain: 1,287 km left/);
    assert.ok(email.html.includes(escapeHtml(links.unsubscribeUrl)));
    assert.match(email.text, /Turn off these emails: https:\/\/swingarm\.app\/unsubscribe/);
  });

  it('shows the eight most due and counts the rest', () => {
    const tasks = Array.from({ length: 11 }, (_, index) => task(`t${index}`, `Task ${index}`, 2000 + index * 10));
    const email = dailyReminderEmail(planDailyReminders(rider([bike('a', 'Norden 901', tasks)]), today)!, 'imperial', links);
    assert.equal(email.text.match(/^- /gm)?.length, 8);
    assert.match(email.text, /And 3 more\. Open SwingArm to see them all\./);
    assert.match(email.text, /- Task 0: 1,000 mi overdue/);
  });

  it('explains the odometer check-in', () => {
    const plan = planDailyReminders(rider([bike('a', 'Norden 901', [], { odometer_updated_at: '2026-09-01T00:00:00Z' })]), today)!;
    const email = dailyReminderEmail(plan, 'imperial', links);
    assert.match(email.text, /last updated 45 days ago, at 3,000 mi\./);
    assert.match(email.text, /only count the miles you’ve entered/);
  });
});

describe('monthlySummaryEmail', () => {
  it('reports the month’s spending and what’s due', () => {
    const november = new Date(2026, 10, 1);
    const summary = planMonthlySummary(
      rider([
        bike('a', 'Norden 901', [task('t', 'Oil', 2500)], { spent: { services: 2, total: 84.5 } }),
        bike('b', 'Svartpilen', [], { spent: { services: 0, total: 0 } }),
      ]),
      november
    )!;
    const email = monthlySummaryEmail(summary, 'imperial', links);
    assert.equal(email.subject, 'Your October 2026 in SwingArm');
    assert.match(email.text, /2 services logged, \$84\.50 spent\. Odometer: 3,000 mi\./);
    assert.match(email.text, /No service logged in October\./);
    assert.match(email.text, /Nothing due soon\./);
  });

  it('names months', () => {
    assert.equal(monthName('2025-12'), 'December 2025');
  });
});

describe('adminReviewEmail', () => {
  const adminUrl = 'https://swingarm.app/admin';
  const manual = { make: 'Husqvarna', model: 'Norden 901', year_from: 2022, year_to: 2024, url: 'https://evil.example/manual.pdf?x=<script>', submitted_at: '2026-10-21T10:00:00Z' };
  const model = { make: 'CFMoto', model: '800MT <b>Explore</b>', submitted_at: '2026-10-21T11:00:00Z' };

  it('sends nothing when nothing is waiting', () => {
    assert.equal(adminReviewEmail({ manuals: [], models: [] }, adminUrl), null);
  });

  it('lists manual links and makes/models, with a link to the review page', () => {
    const email = adminReviewEmail({ manuals: [manual], models: [model] }, adminUrl)!;
    assert.equal(email.subject, '2 submissions to review');
    assert.match(email.text, /2022–2024 Husqvarna Norden 901: Link to evil\.example/);
    assert.match(email.text, /CFMoto 800MT <b>Explore<\/b>/);
    assert.ok(email.html.includes(`href="${adminUrl}"`));
  });

  it('never links to or shows a submitted manual link, and escapes what riders typed', () => {
    const email = adminReviewEmail({ manuals: [manual], models: [model] }, adminUrl)!;
    assert.ok(!email.html.includes('manual.pdf'));
    assert.ok(!email.text.includes('manual.pdf'));
    assert.ok(!email.html.includes('<b>Explore'));
    assert.ok(email.html.includes('&lt;b&gt;Explore'));
  });

  it('says so when a link isn’t a valid address', () => {
    const email = adminReviewEmail({ manuals: [{ ...manual, url: 'not a url' }], models: [] }, adminUrl)!;
    assert.match(email.text, /Husqvarna Norden 901: Not a valid web address/);
  });
});

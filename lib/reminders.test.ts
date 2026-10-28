import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMonthlySummaryDay,
  lastMonthRange,
  planDailyReminders,
  planMonthlySummary,
  planPushReminders,
  type ReminderBike,
  type ReminderRider,
  type ReminderTask,
} from './reminders';

const today = new Date(2026, 9, 16); // October 16, 2026

const task = (id: string, overrides: Partial<ReminderTask> = {}): ReminderTask => ({
  id,
  task_name: `Task ${id}`,
  interval_mileage: 4000,
  interval_months: 0,
  last_performed_mileage: 0,
  last_performed_date: '2026-01-01',
  ...overrides,
});

const bike = (overrides: Partial<ReminderBike> = {}): ReminderBike => ({
  id: 'bike',
  year: 2023,
  make: 'Husqvarna',
  model: 'Norden 901',
  current_mileage: 3000,
  created_at: '2026-01-15T18:00:00+00:00',
  odometer_updated_at: '2026-10-10T18:00:00+00:00',
  tasks: [],
  spent: null,
  ...overrides,
});

const rider = (overrides: Partial<ReminderRider> = {}): ReminderRider => ({
  user_id: 'rider',
  email: 'rider@example.com',
  email_token: 'token',
  unit_system: 'imperial',
  task_reminders: true,
  odometer_reminders: true,
  monthly_summary: false,
  push_task_reminders: true,
  push_odometer_reminders: true,
  push: [],
  sent: [],
  bikes: [bike()],
  ...overrides,
});

describe('planDailyReminders', () => {
  it('sends nothing when every task is healthy and the odometer is fresh', () => {
    assert.equal(planDailyReminders(rider({ bikes: [bike({ tasks: [task('a', { interval_mileage: 10000 })] })] }), today), null);
  });

  it('flags tasks turning soon (urgent counts as soon) and overdue, overdue first', () => {
    const tasks = [
      task('soon', { interval_mileage: 3800 }), // 800 of 3,800 left: 21%
      task('urgent', { interval_mileage: 3200 }), // 200 of 3,200 left: 6%
      task('overdue', { interval_mileage: 2500 }),
      task('healthy', { interval_mileage: 10000 }),
    ];
    const plan = planDailyReminders(rider({ bikes: [bike({ tasks })] }), today);
    assert.deepEqual(
      plan?.tasks.map((entry) => [entry.task.id, entry.kind]),
      [['overdue', 'overdue'], ['urgent', 'soon'], ['soon', 'soon']]
    );
  });

  it('sends each kind once per service cycle', () => {
    const overdue = task('t', { interval_mileage: 2500 });
    const first = planDailyReminders(rider({ bikes: [bike({ tasks: [overdue] })] }), today);
    const key = first!.tasks[0].key;
    assert.equal(planDailyReminders(rider({ sent: [key], bikes: [bike({ tasks: [overdue] })] }), today), null);

    // Logged service, and it's come due again: a new cycle, so a new key.
    const nextCycle = { ...overdue, last_performed_mileage: 400, last_performed_date: '2026-02-01' };
    const again = planDailyReminders(rider({ sent: [key], bikes: [bike({ current_mileage: 3000, tasks: [nextCycle] })] }), today);
    assert.notEqual(again?.tasks[0].key, key);
  });

  it('sends an overdue email even after the soon one', () => {
    const soon = task('t', { interval_mileage: 3800 });
    const soonKey = planDailyReminders(rider({ bikes: [bike({ tasks: [soon] })] }), today)!.tasks[0].key;
    const overdue = planDailyReminders(rider({ sent: [soonKey], bikes: [bike({ current_mileage: 4000, tasks: [soon] })] }), today);
    assert.equal(overdue?.tasks[0].kind, 'overdue');
  });

  it('waits a week after a bike is added before task reminders', () => {
    const overdue = [task('t', { interval_mileage: 2500 })];
    const justAdded = bike({ created_at: '2026-10-12T18:00:00+00:00', tasks: overdue }); // 4 days ago
    assert.equal(planDailyReminders(rider({ bikes: [justAdded] }), today), null);
    assert.equal(planDailyReminders(rider({ bikes: [justAdded] }), new Date(2026, 9, 19))?.tasks.length, 1); // day 7
  });

  it('skips tasks without a start point', () => {
    const tasks = [task('t', { interval_mileage: 2500, last_performed_mileage: null, last_performed_date: null })];
    assert.equal(planDailyReminders(rider({ bikes: [bike({ tasks })] }), today), null);
  });

  it('checks in on the odometer every 30 days it stays the same', () => {
    const stale = bike({ odometer_updated_at: '2026-09-10T18:00:00+00:00' }); // 36 days
    const plan = planDailyReminders(rider({ bikes: [stale] }), today);
    assert.equal(plan?.odometer[0].daysSince, 36);
    const key = plan!.odometer[0].key;

    assert.equal(planDailyReminders(rider({ sent: [key], bikes: [stale] }), today), null);
    const later = planDailyReminders(rider({ sent: [key], bikes: [stale] }), new Date(2026, 10, 10)); // 61 days
    assert.notEqual(later?.odometer[0].key, key);
  });

  it('respects the rider’s switches', () => {
    const stale = bike({ odometer_updated_at: '2026-01-01T00:00:00Z', tasks: [task('t', { interval_mileage: 2500 })] });
    assert.equal(planDailyReminders(rider({ task_reminders: false, odometer_reminders: false, bikes: [stale] }), today), null);
    assert.equal(planDailyReminders(rider({ task_reminders: false, bikes: [stale] }), today)?.tasks.length, 0);
    assert.equal(planDailyReminders(rider({ odometer_reminders: false, bikes: [stale] }), today)?.odometer.length, 0);
  });
});

describe('planPushReminders', () => {
  const device = { kind: 'web' as const, endpoint: 'https://push.example.com/abc', p256dh: 'key', auth: 'secret' };
  const stale = bike({ odometer_updated_at: '2026-09-10T18:00:00+00:00', tasks: [task('t', { interval_mileage: 2500 })] });

  it('sends nothing without a push device', () => {
    assert.equal(planPushReminders(rider({ bikes: [stale] }), today), null);
  });

  it('sends the same reminders as email, under their own keys', () => {
    const withDevice = rider({ push: [device], bikes: [stale] });
    const email = planDailyReminders(withDevice, today)!;
    const push = planPushReminders(withDevice, today)!;
    assert.deepEqual(
      push.tasks.map((entry) => entry.key),
      email.tasks.map((entry) => `push:${entry.key}`)
    );
    assert.equal(push.odometer[0].key, `push:${email.odometer[0].key}`);

    // Sending the email doesn't count as the push, and the other way around.
    const emailSent = [...email.tasks, ...email.odometer].map((entry) => entry.key);
    assert.equal(planPushReminders({ ...withDevice, sent: emailSent }, today)?.tasks.length, 1);
    const pushSent = [...push.tasks, ...push.odometer].map((entry) => entry.key);
    assert.equal(planDailyReminders({ ...withDevice, sent: pushSent }, today)?.tasks.length, 1);
    assert.equal(planPushReminders({ ...withDevice, sent: pushSent }, today), null);
  });

  it('follows the push switches, not the email ones', () => {
    const emailOff = rider({ push: [device], task_reminders: false, odometer_reminders: false, bikes: [stale] });
    assert.equal(planPushReminders(emailOff, today)?.tasks.length, 1);
    assert.equal(planPushReminders({ ...emailOff, push_task_reminders: false }, today)?.tasks.length, 0);
    assert.equal(planPushReminders({ ...emailOff, push_task_reminders: false, push_odometer_reminders: false }, today), null);
  });
});

describe('monthly summary', () => {
  const firstOfMonth = new Date(2026, 10, 1); // November 1

  it('goes out in the first days of the month, about last month', () => {
    assert.equal(isMonthlySummaryDay(firstOfMonth), true);
    assert.equal(isMonthlySummaryDay(new Date(2026, 10, 3)), true);
    assert.equal(isMonthlySummaryDay(new Date(2026, 10, 4)), false);
    assert.deepEqual(lastMonthRange(firstOfMonth), { from: '2026-10-01', to: '2026-11-01', month: '2026-10' });
    assert.deepEqual(lastMonthRange(new Date(2026, 0, 2)), { from: '2025-12-01', to: '2026-01-01', month: '2025-12' });
  });

  it('summarizes spending and what needs attention, once', () => {
    const withSpend = bike({ spent: { services: 2, total: 84.5 }, tasks: [task('t', { interval_mileage: 2500 })] });
    const summary = planMonthlySummary(rider({ monthly_summary: true, bikes: [withSpend] }), firstOfMonth);
    assert.equal(summary?.key, 'monthly:2026-10');
    assert.equal(summary?.bikes[0].spent, 84.5);
    assert.equal(summary?.bikes[0].services, 2);
    assert.equal(summary?.bikes[0].needsAttention.length, 1);

    assert.equal(planMonthlySummary(rider({ monthly_summary: true, sent: ['monthly:2026-10'], bikes: [withSpend] }), firstOfMonth), null);
    assert.equal(planMonthlySummary(rider({ monthly_summary: false, bikes: [withSpend] }), firstOfMonth), null);
    assert.equal(planMonthlySummary(rider({ monthly_summary: true, bikes: [withSpend] }), today), null);
  });
});

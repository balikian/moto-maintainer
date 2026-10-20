import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dailyPush } from './pushMessage';
import type { DailyReminders, ReminderBike, ReminderTask } from './reminders';
import { getTaskDueState } from './maintenance';

const today = new Date(2026, 9, 16);

const task = (id: string, task_name: string, interval_mileage: number): ReminderTask => ({
  id,
  task_name,
  interval_mileage,
  interval_months: 0,
  last_performed_mileage: 0,
  last_performed_date: '2026-01-01',
});

const bike = (id: string, model: string): ReminderBike => ({
  id,
  year: 2023,
  make: 'Husqvarna',
  model,
  current_mileage: 3000,
  created_at: '2026-01-15T18:00:00+00:00',
  odometer_updated_at: '2026-09-10T00:00:00Z',
  tasks: [],
  spent: null,
});

const due = (onBike: ReminderBike, entry: ReminderTask): DailyReminders['tasks'][number] => {
  const dueState = getTaskDueState(entry, onBike.current_mileage, today);
  return { key: entry.id, kind: dueState.status === 'Overdue' ? 'overdue' : 'soon', bike: onBike, task: entry, dueState };
};

const norden = bike('a', 'Norden 901');
const svartpilen = bike('b', 'Svartpilen 401');

describe('dailyPush', () => {
  it('uses the email’s subject as the title and lists the tasks', () => {
    const message = dailyPush({ tasks: [due(norden, task('t', 'Replace engine oil', 2500))], odometer: [] }, 'imperial');
    assert.equal(message.title, 'Overdue: Replace engine oil on your Norden 901');
    assert.equal(message.body, 'Replace engine oil, 500 mi overdue');
    assert.equal(message.url, '/');
  });

  it('names the bike when there are several', () => {
    const message = dailyPush(
      { tasks: [due(norden, task('t', 'Chain', 2500)), due(svartpilen, task('u', 'Coolant', 2500))], odometer: [] },
      'metric'
    );
    assert.deepEqual(message.body.split('\n'), ['Norden 901: Chain, 805 km overdue', 'Svartpilen 401: Coolant, 805 km overdue']);
  });

  it('shows a few lines and counts the rest', () => {
    const tasks = ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => due(norden, task(name, name, 2500)));
    const lines = dailyPush({ tasks, odometer: [] }, 'imperial').body.split('\n');
    assert.equal(lines.length, 4);
    assert.equal(lines[3], 'And 3 more');
  });

  it('asks for the odometer reading', () => {
    const message = dailyPush({ tasks: [], odometer: [{ key: 'o', bike: norden, daysSince: 36 }] }, 'imperial');
    assert.equal(message.title, 'Time to update your Norden 901’s odometer');
    assert.equal(message.body, 'It’s been 36 days at 3,000 mi. Tap to enter the new reading.');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  baselineFromLogs,
  findDefaultTask,
  fromNewBaseline,
  getDefaultTasks,
  getTaskDueState,
  GENERIC_MAINTENANCE_TASKS,
  groupTasksByUrgency,
} from './maintenance';

const today = new Date(2026, 8, 29); // Sep 29, 2026

const task = (overrides: Partial<Parameters<typeof getTaskDueState>[0]> = {}) => ({
  interval_mileage: 5000,
  interval_months: 12,
  last_performed_mileage: 10000,
  last_performed_date: '2026-09-01',
  ...overrides,
});

describe('getTaskDueState', () => {
  it('is healthy right after service', () => {
    const state = getTaskDueState(task(), 10100, today);
    assert.equal(state.status, 'Healthy');
    assert.equal(state.milesRemaining, 4900);
  });

  it('reports the share of the closest interval remaining', () => {
    // 2,500 of 5,000 miles left (50%) vs. ~11 of 12 months left: mileage is closer.
    assert.equal(getTaskDueState(task(), 12500, today).fractionRemaining, 0.5);
    // 1,000 miles past due on a 5,000-mile interval.
    assert.equal(getTaskDueState(task(), 16000, today).fractionRemaining, -0.2);
  });

  it('is soon inside the last 25% of the mileage interval', () => {
    assert.equal(getTaskDueState(task(), 14000, today).status, 'Soon');
  });

  it('is urgent inside the last 10% of the mileage interval', () => {
    assert.equal(getTaskDueState(task(), 14600, today).status, 'Urgent');
  });

  it('is overdue once past the mileage interval', () => {
    const state = getTaskDueState(task(), 15001, today);
    assert.equal(state.status, 'Overdue');
    assert.equal(state.trigger, 'mileage');
  });

  it('is overdue by time even with plenty of miles left', () => {
    const state = getTaskDueState(task({ last_performed_date: '2025-06-01' }), 10100, today);
    assert.equal(state.status, 'Overdue');
    assert.equal(state.trigger, 'time');
  });

  it('reports overdue, not urgent, when miles are far past due but time is nearly due', () => {
    // 50% past the mileage interval, ~8% of the time interval left.
    const state = getTaskDueState(task({ last_performed_date: '2025-10-29' }), 17500, today);
    assert.equal(state.status, 'Overdue');
    assert.equal(state.trigger, 'mileage');
  });

  it('uses calendar months for the time interval', () => {
    // Done Aug 29 with a 1-month interval: due Sep 29, which is today.
    const state = getTaskDueState(task({ interval_mileage: 0, interval_months: 1, last_performed_date: '2026-08-29' }), 0, today);
    assert.equal(state.daysRemaining, 0);
    assert.equal(state.status, 'Urgent');
  });

  it('ignores the time interval when there is no last performed date', () => {
    const state = getTaskDueState(task({ last_performed_date: null }), 10100, today);
    assert.equal(state.trigger, 'mileage');
    assert.equal(state.daysRemaining, null);
  });

  it('is healthy with no intervals at all', () => {
    const state = getTaskDueState(task({ interval_mileage: 0, interval_months: 0 }), 99999, today);
    assert.deepEqual(state, { status: 'Healthy', trigger: null, milesRemaining: null, daysRemaining: null, fractionRemaining: null });
  });
});

describe('default tasks', () => {
  const nordenSchedule = {
    model_schedule_tasks: [
      { task_name: 'Valve Clearance Check', interval_distance: 30000, distance_unit: 'km' as const, interval_months: 0, is_diy: false, sort_order: 2 },
      { task_name: 'Engine Oil & Filter', interval_distance: 15000, distance_unit: 'km' as const, interval_months: 12, is_diy: true, sort_order: 1 },
    ],
  };

  it('uses the manufacturer schedule, in order, converted to miles', () => {
    assert.deepEqual(getDefaultTasks(nordenSchedule), [
      { task_name: 'Engine Oil & Filter', interval_mileage: 9321, interval_months: 12, is_diy: true },
      { task_name: 'Valve Clearance Check', interval_mileage: 18641, interval_months: 0, is_diy: false },
    ]);
  });

  it('keeps mile-based schedules as they are', () => {
    const schedule = { model_schedule_tasks: [{ ...nordenSchedule.model_schedule_tasks[1], interval_distance: 6000, distance_unit: 'mi' as const }] };
    assert.equal(getDefaultTasks(schedule)[0].interval_mileage, 6000);
  });

  it('falls back to the generic schedule when there is none', () => {
    assert.equal(getDefaultTasks(null), GENERIC_MAINTENANCE_TASKS);
    assert.equal(getDefaultTasks({ model_schedule_tasks: [] }), GENERIC_MAINTENANCE_TASKS);
  });

  it('finds a default by task name, case-insensitively', () => {
    assert.equal(findDefaultTask(nordenSchedule, ' engine oil & filter ')?.interval_mileage, 9321);
  });

  it('falls back to the generic default when the schedule lacks that task', () => {
    assert.equal(findDefaultTask(nordenSchedule, 'Chain Clean & Tension')?.interval_mileage, 500);
  });

  it('returns null for custom tasks', () => {
    assert.equal(findDefaultTask(nordenSchedule, 'Fork seals'), null);
  });
});

describe('groupTasksByUrgency', () => {
  // Bike at 14,000 mi; all tasks last done at 10,000 mi on Sep 1, 2026 unless noted.
  const named = (task_name: string, overrides: Partial<Parameters<typeof getTaskDueState>[0]> = {}) => ({ task_name, ...task(overrides) });
  const names = (entries: { task: { task_name: string } }[]) => entries.map((entry) => entry.task.task_name);

  const tasks = [
    named('Healthy far', { interval_mileage: 20000 }),                 // 80% left
    named('Soon', { interval_mileage: 5000 }),                         // 20% left
    named('Overdue', { interval_mileage: 3000 }),                      // past due
    named('Healthy near', { interval_mileage: 8000 }),                 // 50% left
    named('Urgent', { interval_mileage: 4300 }),                       // ~7% left
    named('No interval', { interval_mileage: 0, interval_months: 0 }),
  ];

  it('puts tasks needing attention first, most due first', () => {
    const { needsAttention } = groupTasksByUrgency(tasks, 14000, today);
    assert.deepEqual(names(needsAttention), ['Overdue', 'Urgent', 'Soon']);
  });

  it('sorts healthy tasks by what is coming up next, with no-interval tasks last', () => {
    const { healthy } = groupTasksByUrgency(tasks, 14000, today);
    assert.deepEqual(names(healthy), ['Healthy near', 'Healthy far', 'No interval']);
  });
});

describe('task baselines', () => {
  it('counts from new: 0 miles and the start of the model year', () => {
    assert.deepEqual(fromNewBaseline(2024), { last_performed_mileage: 0, last_performed_date: '2024-01-01' });
  });

  it('a used bike with no service logged shows work as due', () => {
    // A 2020 bike bought with 20,000 miles: the 15,000-mile service is overdue until it's logged.
    const state = getTaskDueState({ interval_mileage: 15000, interval_months: 12, ...fromNewBaseline(2020) }, 20000, today);
    assert.equal(state.status, 'Overdue');
  });

  it('uses the latest log, by date and then odometer', () => {
    const logs = [
      { performed_at: '2026-01-05', odometer_at_service: 4000 },
      { performed_at: '2026-05-20T00:00:00Z', odometer_at_service: 7000 },
      { performed_at: '2026-05-20', odometer_at_service: 6900 },
    ];
    assert.deepEqual(baselineFromLogs(logs, 2024), { last_performed_mileage: 7000, last_performed_date: '2026-05-20' });
  });

  it('falls back to new when there are no logs', () => {
    assert.deepEqual(baselineFromLogs([], 2023), fromNewBaseline(2023));
  });
});

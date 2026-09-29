import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findDefaultTask, getDefaultTasks, getTaskDueState, GENERIC_MAINTENANCE_TASKS } from './maintenance';

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
    assert.deepEqual(state, { status: 'Healthy', trigger: null, milesRemaining: null, daysRemaining: null });
  });
});

describe('default tasks', () => {
  it('uses the model schedule when the bike is known', () => {
    const tasks = getDefaultTasks({ year: 2024, make: 'Yamaha', model: 'Tenere 700' });
    assert.ok(tasks.some((t) => t.task_name === 'Spark Plugs Replacement'));
  });

  it('falls back to the generic schedule for unknown bikes', () => {
    assert.equal(getDefaultTasks({ year: 2010, make: 'Honda', model: 'CB500' }), GENERIC_MAINTENANCE_TASKS);
  });

  it('finds a default by task name, case-insensitively', () => {
    const found = findDefaultTask({ year: 2024, make: 'Yamaha', model: 'Tenere 700' }, ' engine oil & filter ');
    assert.equal(found?.interval_mileage, 6000);
  });

  it('falls back to the generic default when the model schedule lacks that task', () => {
    const found = findDefaultTask({ year: 2024, make: 'Yamaha', model: 'Tenere 700' }, 'Valve Clearance Check');
    assert.equal(found?.interval_mileage, 15000);
  });

  it('returns null for custom tasks', () => {
    assert.equal(findDefaultTask({ year: 2024, make: 'Yamaha', model: 'Tenere 700' }, 'Fork seals'), null);
  });
});

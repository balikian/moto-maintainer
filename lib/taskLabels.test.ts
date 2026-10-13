import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TaskDueState } from './maintenance';
import { dueLabel, intervalLabel } from './taskLabels';

const state = (changes: Partial<TaskDueState>): TaskDueState => ({
  status: 'Soon',
  trigger: 'mileage',
  milesRemaining: null,
  daysRemaining: null,
  fractionRemaining: 0.2,
  ...changes,
});

describe('dueLabel', () => {
  it('shows distance left or overdue', () => {
    assert.deepEqual(dueLabel(state({ milesRemaining: 640 }), 'imperial'), { value: '640 mi', caption: 'left' });
    assert.deepEqual(dueLabel(state({ milesRemaining: -112 }), 'imperial'), { value: '112 mi', caption: 'overdue' });
  });

  it('converts to kilometers', () => {
    assert.deepEqual(dueLabel(state({ milesRemaining: 100 }), 'metric'), { value: '161 km', caption: 'left' });
  });

  it('shows days, then whole months past two months', () => {
    assert.deepEqual(dueLabel(state({ trigger: 'time', daysRemaining: 1 }), 'imperial'), { value: '1 day', caption: 'left' });
    assert.deepEqual(dueLabel(state({ trigger: 'time', daysRemaining: 60 }), 'imperial'), { value: '60 days', caption: 'left' });
    assert.deepEqual(dueLabel(state({ trigger: 'time', daysRemaining: 400 }), 'imperial'), { value: '13 months', caption: 'left' });
    assert.deepEqual(dueLabel(state({ trigger: 'time', daysRemaining: -9 }), 'imperial'), { value: '9 days', caption: 'overdue' });
  });

  it('says when a task is due today', () => {
    assert.deepEqual(dueLabel(state({ trigger: 'time', daysRemaining: 0 }), 'imperial'), { value: 'Today', caption: 'due' });
  });

  it('uses the distance when distance is the closer interval', () => {
    assert.deepEqual(dueLabel(state({ milesRemaining: 50, daysRemaining: 200 }), 'imperial'), { value: '50 mi', caption: 'left' });
  });

  it('handles a task with no interval', () => {
    assert.deepEqual(dueLabel(state({ trigger: null }), 'imperial'), { value: 'No interval', caption: '' });
  });
});

describe('intervalLabel', () => {
  it('joins distance and time', () => {
    assert.equal(intervalLabel({ interval_mileage: 6200, interval_months: 12 }, 'imperial'), 'Every 6,200 mi or 12 months');
  });

  it('shows whichever interval is set', () => {
    assert.equal(intervalLabel({ interval_mileage: 500, interval_months: 0 }, 'imperial'), 'Every 500 mi');
    assert.equal(intervalLabel({ interval_mileage: 0, interval_months: 1 }, 'imperial'), 'Every 1 month');
  });

  it('says when neither is set', () => {
    assert.equal(intervalLabel({ interval_mileage: 0, interval_months: 0 }, 'imperial'), 'No interval set');
  });
});

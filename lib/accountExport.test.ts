import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accountExportFileName, buildAccountExport } from './accountExport';
import type { MaintenanceTask, Motorcycle, ServiceLog } from './types';

const bike = (id: string, model: string): Motorcycle => ({
  id,
  user_id: 'rider',
  make: 'Husqvarna',
  model,
  year: 2024,
  current_mileage: 5200,
  created_at: '2024-04-02T18:30:00Z',
});

const task = (id: string, motorcycle_id: string, task_name: string, category: MaintenanceTask['category'] = null): MaintenanceTask => ({
  id,
  motorcycle_id,
  user_id: 'rider',
  task_name,
  interval_mileage: 6000,
  interval_months: 0,
  last_performed_mileage: 0,
  last_performed_date: null,
  is_diy: true,
  category,
});

const log = (id: string, motorcycle_id: string, performed_at: string, cost: number | null, task_id: string | null): ServiceLog => ({
  id,
  motorcycle_id,
  task_id,
  task_name: 'Oil change',
  performed_at,
  odometer_at_service: 3000,
  cost,
  notes: null,
});

describe('buildAccountExport', () => {
  const data = buildAccountExport({
    email: 'rider@example.com',
    profile: { unit_system: 'metric', theme: 'system', email_task_reminders: false },
    bikes: [bike('a', 'Norden 901'), bike('b', 'Svartpilen 401')],
    tasks: [task('t1', 'a', 'Engine oil'), task('t2', 'b', 'Chain', 'drivetrain')],
    logs: [
      log('l1', 'a', '2025-05-01', 60, 't1'),
      log('l2', 'a', '2026-02-10', null, null),
      log('l3', 'b', '2025-07-04', 25, null),
    ],
    exportedOn: '2026-10-16',
  });

  it('puts each task and service under its own bike, newest service first', () => {
    assert.deepEqual(data.bikes.map((entry) => entry.model), ['Norden 901', 'Svartpilen 401']);
    assert.deepEqual(data.bikes[0].maintenance_tasks.map((entry) => entry.name), ['Engine oil']);
    assert.deepEqual(data.bikes[0].service_history.map((entry) => entry.date), ['2026-02-10', '2025-05-01']);
    assert.equal(data.bikes[1].service_history.length, 1);
  });

  it('labels categories, guessing for tasks without one', () => {
    assert.equal(data.bikes[0].maintenance_tasks[0].category, 'Engine');
    assert.equal(data.bikes[1].maintenance_tasks[0].category, 'Drivetrain');
  });

  it('reads settings, with defaults for columns that are missing', () => {
    assert.deepEqual(data.account, {
      email: 'rider@example.com',
      distance_units: 'kilometers',
      theme: 'auto',
      reminder_emails: { tasks_coming_due: false, odometer_check_in: true, monthly_summary: false },
    });
  });

  it('keeps routine vs one-off, costs and the calendar day', () => {
    const [latest, earlier] = data.bikes[0].service_history;
    assert.equal(latest.type, 'One-off');
    assert.equal(latest.cost, null);
    assert.equal(earlier.type, 'Routine');
    assert.equal(earlier.cost, 60);
    assert.equal(data.bikes[0].added_on, '2024-04-02');
  });

  it('names the file by date', () => {
    assert.equal(accountExportFileName('2026-10-16'), 'swingarm-data-2026-10-16.json');
  });
});

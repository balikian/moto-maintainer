import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDefaultTasks } from './maintenance';
import { MAX_IMPORT_PAGES } from './pageRanges';
import type { ExtractedTask } from './scheduleExtraction';
import { applySummary, cleanTasks, MAX_EXTRACTED_TASKS, MAX_UPLOAD_BYTES, planScheduleApply, validatePageImages } from './scheduleImport';

const jpeg = (size = 1000) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};

describe('validatePageImages', () => {
  it('accepts a few JPEG pages', () => {
    assert.equal(validatePageImages([jpeg(), jpeg()]), null);
  });

  it('rejects no pages', () => {
    assert.match(validatePageImages([]) ?? '', /No pages/);
  });

  it(`rejects more than ${MAX_IMPORT_PAGES} pages`, () => {
    assert.equal(validatePageImages(Array.from({ length: MAX_IMPORT_PAGES }, () => jpeg())), null);
    assert.match(validatePageImages(Array.from({ length: MAX_IMPORT_PAGES + 1 }, () => jpeg())) ?? '', /at most/);
  });

  it('rejects pages that are too large in total', () => {
    const half = Math.ceil(MAX_UPLOAD_BYTES / 2);
    assert.equal(validatePageImages([jpeg(half - 1), jpeg(half - 1)]), null);
    assert.match(validatePageImages([jpeg(half), jpeg(half + 1)]) ?? '', /too large/);
  });

  it('rejects files that are not JPEGs', () => {
    const pdf = new TextEncoder().encode('%PDF-2.0 ...');
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    assert.match(validatePageImages([jpeg(), pdf]) ?? '', /valid images/);
    assert.match(validatePageImages([png]) ?? '', /valid images/);
    assert.match(validatePageImages([new Uint8Array(0)]) ?? '', /valid images/);
  });
});

const extracted = (overrides: Partial<ExtractedTask> = {}): ExtractedTask => ({
  task_name: 'Change engine oil',
  interval_distance: 10000,
  distance_unit: 'km',
  interval_months: 12,
  is_diy: true,
  ...overrides,
});

describe('cleanTasks', () => {
  it('tidies names and rounds intervals', () => {
    const [task] = cleanTasks([extracted({ task_name: '  Change \n engine   oil ', interval_distance: 9999.6, interval_months: 11.5 })]);
    assert.equal(task.task_name, 'Change engine oil');
    assert.equal(task.interval_distance, 10000);
    assert.equal(task.interval_months, 12);
  });

  it('keeps tasks with only a distance or only a time interval', () => {
    const tasks = cleanTasks([extracted({ interval_months: 0 }), extracted({ interval_distance: 0 })]);
    assert.equal(tasks.length, 2);
  });

  it('drops rows with no name or no interval', () => {
    const tasks = cleanTasks([
      extracted({ task_name: '   ' }),
      extracted({ interval_distance: 0, interval_months: 0 }),
      extracted({ interval_distance: -500, interval_months: -1 }),
      extracted({ interval_distance: Number.NaN, interval_months: Number.POSITIVE_INFINITY }),
    ]);
    assert.deepEqual(tasks, []);
  });

  it('clamps a negative interval to zero but keeps the other one', () => {
    const [task] = cleanTasks([extracted({ interval_distance: -5, interval_months: 24 })]);
    assert.equal(task.interval_distance, 0);
    assert.equal(task.interval_months, 24);
  });

  it('shortens very long names', () => {
    const [task] = cleanTasks([extracted({ task_name: 'x'.repeat(500) })]);
    assert.equal(task.task_name.length, 120);
  });

  it(`keeps at most ${MAX_EXTRACTED_TASKS} tasks`, () => {
    const many = Array.from({ length: MAX_EXTRACTED_TASKS + 20 }, (_, i) => extracted({ task_name: `Task ${i}` }));
    assert.equal(cleanTasks(many).length, MAX_EXTRACTED_TASKS);
  });
});

const scheduleTask = (task_name: string, interval_mileage = 6214, interval_months = 12, is_diy = true) => ({
  task_name,
  interval_mileage,
  interval_months,
  is_diy,
});

const noLogs = { bikeYear: 2024, logs: [] };

const log = (id: string, task_name: string, performed_at: string, odometer_at_service: number, task_id: string | null = null) => ({
  id,
  task_id,
  task_name,
  performed_at,
  odometer_at_service,
});

describe('planScheduleApply', () => {
  it('counts new tasks from when the bike was new if nothing was logged', () => {
    const [task] = planScheduleApply([scheduleTask('Oil change')], [], noLogs).additions;
    assert.equal(task.last_performed_mileage, 0);
    assert.equal(task.last_performed_date, '2024-01-01');
    assert.deepEqual(task.relinkLogIds, []);
  });

  it('a deleted task that comes back picks up from its latest service record', () => {
    const logs = [
      log('l1', 'Oil change', '2025-03-01', 1000),
      log('l2', 'oil  change', '2026-06-15', 8000),
      log('l3', 'Oil change', '2026-01-10', 5000, 'some-other-task'),
      log('l4', 'Chain lube', '2026-07-01', 8500),
    ];
    const [task] = planScheduleApply([scheduleTask('Oil change')], [], { bikeYear: 2024, logs }).additions;
    assert.equal(task.last_performed_mileage, 8000);
    assert.equal(task.last_performed_date, '2026-06-15');
    assert.deepEqual(task.relinkLogIds.sort(), ['l1', 'l2']);
  });

  it('removes generic starter tasks the schedule replaces, unless they were logged', () => {
    const existing = [
      { id: 'oil', task_name: 'Replace engine oil and filter' },
      { id: 'old-chain', task_name: 'Chain Clean & Tension' },
      { id: 'coolant', task_name: 'Replace coolant' },
      { id: 'logged', task_name: 'Check brake pads and discs' },
      { id: 'mine', task_name: 'Wash the bike' },
    ];
    const plan = planScheduleApply([scheduleTask('Replace coolant', 0, 48)], existing, {
      bikeYear: 2024,
      logs: [log('l1', 'Check brake pads and discs', '2026-05-01', 3000, 'logged')],
    });
    assert.deepEqual(plan.removals, ['oil', 'old-chain']);
    assert.deepEqual(plan.updates.map((task) => task.id), ['coolant']);
  });

  it('leaves the baseline of existing tasks alone', () => {
    const plan = planScheduleApply([scheduleTask('Oil change')], [{ id: 'a', task_name: 'Oil change' }], {
      bikeYear: 2024,
      logs: [log('l1', 'Oil change', '2026-06-15', 8000)],
    });
    assert.equal(plan.updates.length, 1);
    assert.equal('last_performed_mileage' in plan.updates[0], false);
  });

  it('adds every task to an empty checklist', () => {
    const plan = planScheduleApply([scheduleTask('Oil change'), scheduleTask('Spark plugs')], [], noLogs);
    assert.deepEqual(plan.updates, []);
    assert.deepEqual(plan.additions.map((task) => task.task_name), ['Oil change', 'Spark plugs']);
  });

  it('updates matching tasks, ignoring case and spacing', () => {
    const plan = planScheduleApply(
      [scheduleTask('Oil change', 6214, 12, true), scheduleTask('Valve clearance', 18641, 0, false)],
      [{ id: 'a', task_name: '  oil   CHANGE ' }],
      noLogs
    );
    assert.deepEqual(plan.updates, [{ id: 'a', interval_mileage: 6214, interval_months: 12, is_diy: true }]);
    assert.deepEqual(plan.additions.map((task) => task.task_name), ['Valve clearance']);
  });

  it('never removes tasks that are not in the schedule', () => {
    const plan = planScheduleApply([scheduleTask('Oil change')], [
      { id: 'a', task_name: 'Oil change' },
      { id: 'b', task_name: 'Wash the bike' },
    ], noLogs);
    assert.deepEqual(plan.updates.map((task) => task.id), ['a']);
    assert.deepEqual(plan.additions, []);
  });

  it('applying the same schedule twice only updates the second time', () => {
    const schedule = [scheduleTask('Oil change'), scheduleTask('Chain - clean and lube')];
    const first = planScheduleApply(schedule, [], noLogs);
    const afterFirst = first.additions.map((task, i) => ({ id: `new-${i}`, task_name: task.task_name }));
    const second = planScheduleApply(schedule, afterFirst, noLogs);
    assert.equal(second.additions.length, 0);
    assert.equal(second.updates.length, 2);
  });

  it('uses the first entry when the schedule repeats a name', () => {
    const plan = planScheduleApply([scheduleTask('Oil change', 6000), scheduleTask('oil change', 3000)], [], noLogs);
    assert.equal(plan.additions.length, 1);
    assert.equal(plan.additions[0].interval_mileage, 6000);
  });

  it('converts a kilometre schedule to miles on the way in', () => {
    const defaults = getDefaultTasks({
      model_schedule_tasks: [
        { task_name: 'Oil change', interval_distance: 10000, distance_unit: 'km', interval_months: 12, is_diy: true, sort_order: 0 },
        { task_name: 'Coolant', interval_distance: 0, distance_unit: 'km', interval_months: 48, is_diy: true, sort_order: 1 },
      ],
    });
    const plan = planScheduleApply(defaults, [], noLogs);
    assert.deepEqual(
      plan.additions.map(({ task_name, interval_mileage, interval_months }) => ({ task_name, interval_mileage, interval_months })),
      [
        { task_name: 'Oil change', interval_mileage: 6214, interval_months: 12 },
        { task_name: 'Coolant', interval_mileage: 0, interval_months: 48 },
      ]
    );
  });
});

describe('applySummary', () => {
  it('mentions removed starter tasks only when there are some', () => {
    assert.equal(applySummary({ updated: 2, added: 30, removed: 0 }), '2 updated, 30 added');
    assert.equal(applySummary({ updated: 0, added: 5, removed: 1 }), '0 updated, 5 added, 1 starter task removed');
  });
});

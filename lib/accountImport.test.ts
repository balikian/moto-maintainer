import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAccountExport } from './accountExport';
import {
  findDuplicateBikes,
  IMPORT_LIMITS,
  parseAccountImport,
  parseAccountImportText,
  taskIdForLog,
  taskIdsByName,
} from './accountImport';
import type { MaintenanceTask, Motorcycle, ServiceLog } from './types';

const TODAY = '2026-10-20';

const exportFile = () =>
  buildAccountExport({
    email: 'rider@example.com',
    profile: { unit_system: 'metric' },
    bikes: [
      { id: 'b1', user_id: 'someone-else', make: 'Husqvarna', model: 'Norden 901', year: 2023, current_mileage: 5200 } as Motorcycle,
    ],
    tasks: [
      {
        id: 't1',
        motorcycle_id: 'b1',
        user_id: 'someone-else',
        task_name: 'Front tire',
        interval_mileage: 8000,
        interval_months: 0,
        last_performed_mileage: 3000,
        last_performed_date: '2025-06-01',
        is_diy: false,
        category: 'wheels',
        notes: 'Mitas E-07',
      } as MaintenanceTask,
    ],
    logs: [
      { id: 'l1', motorcycle_id: 'b1', task_id: 't1', task_name: 'Front tire', performed_at: '2025-06-01T00:00:00Z', odometer_at_service: 3000, cost: 189.5, notes: null },
      { id: 'l2', motorcycle_id: 'b1', task_id: null, task_name: 'New grips', performed_at: '2025-07-04', odometer_at_service: 3400, cost: null, notes: 'Heated' },
    ] as ServiceLog[],
    exportedOn: '2026-10-16',
  });

const parse = (raw: unknown) => parseAccountImport(raw, TODAY);
const errorOf = (result: ReturnType<typeof parse>) => ('error' in result ? result.error : null);

describe('parseAccountImport', () => {
  it('reads back what Download my data writes', () => {
    const result = parse(exportFile());
    assert.ok('data' in result);
    assert.equal(result.data.exportedOn, '2026-10-16');
    assert.deepEqual(result.data.bikes, [
      {
        year: 2023,
        make: 'Husqvarna',
        model: 'Norden 901',
        odometerMiles: 5200,
        tasks: [
          {
            taskName: 'Front tire',
            category: 'wheels',
            intervalMiles: 8000,
            intervalMonths: 0,
            lastPerformedMiles: 3000,
            lastPerformedDate: '2025-06-01',
            isDiy: false,
            notes: 'Mitas E-07',
          },
        ],
        logs: [
          { taskName: 'New grips', routine: false, performedAt: '2025-07-04', odometerMiles: 3400, cost: null, notes: 'Heated' },
          { taskName: 'Front tire', routine: true, performedAt: '2025-06-01', odometerMiles: 3000, cost: 189.5, notes: null },
        ],
      },
    ]);
  });

  it('never carries ids, owners or emails from the file', () => {
    const file = exportFile() as Record<string, unknown>;
    const bikes = file.bikes as Record<string, unknown>[];
    bikes[0].id = 'b1';
    bikes[0].user_id = 'victim';
    const result = parse(file);
    assert.ok('data' in result);
    const text = JSON.stringify(result.data);
    for (const leaked of ['victim', 'someone-else', 'rider@example.com', '"id"']) {
      assert.ok(!text.includes(leaked), leaked);
    }
  });

  it('rejects files that aren’t SwingArm data', () => {
    assert.match(errorOf(parse(null))!, /isn’t a SwingArm data file/);
    assert.match(errorOf(parse([]))!, /isn’t a SwingArm data file/);
    assert.match(errorOf(parse({ app: 'Other', format_version: 1, bikes: [] }))!, /isn’t a SwingArm data file/);
  });

  it('rejects other format versions', () => {
    assert.match(errorOf(parse({ ...exportFile(), format_version: 2 }))!, /newer version/);
    assert.match(errorOf(parse({ ...exportFile(), format_version: '1' }))!, /format/);
  });

  it('says where a bad value is', () => {
    const file = exportFile();
    file.bikes[0].service_history[1].cost = -5;
    assert.equal(errorOf(parse(file)), 'This file has a problem (Bike 1, service record 2, cost): can\'t be negative.');
  });

  it('checks dates are real calendar days', () => {
    const file = exportFile();
    file.bikes[0].maintenance_tasks[0].last_done_on = '2025-02-30';
    assert.match(errorOf(parse(file))!, /Bike 1, task 1, last done on/);
  });

  it('checks the model year', () => {
    const file = exportFile();
    file.bikes[0].year = 2029;
    assert.match(errorOf(parse(file))!, /in the future/);
    file.bikes[0].year = 2028;
    assert.ok('data' in parse(file));
  });

  it('needs at least one bike, and caps how many', () => {
    assert.match(errorOf(parse({ ...exportFile(), bikes: [] }))!, /has no bikes/);
    const bike = exportFile().bikes[0];
    const many = Array.from({ length: IMPORT_LIMITS.bikes + 1 }, () => bike);
    assert.match(errorOf(parse({ ...exportFile(), bikes: many }))!, /more than 50 bikes/);
  });

  it('limits text lengths', () => {
    const file = exportFile();
    file.bikes[0].service_history[0].notes = 'x'.repeat(2001);
    assert.match(errorOf(parse(file))!, /longer than 2000/);
  });

  it('maps category labels back to ids, and guesses unknown ones', () => {
    const file = exportFile();
    file.bikes[0].maintenance_tasks.push({ ...file.bikes[0].maintenance_tasks[0], name: 'Brake fluid', category: 'Nonsense' });
    const result = parse(file);
    assert.ok('data' in result);
    assert.deepEqual(result.data.bikes[0].tasks.map((task) => task.category), ['wheels', 'brakes']);
  });

  it('drops empty notes and rounds distances', () => {
    const file = exportFile();
    file.bikes[0].odometer_miles = 5200.6;
    file.bikes[0].maintenance_tasks[0].notes = '   ';
    const result = parse(file);
    assert.ok('data' in result);
    assert.equal(result.data.bikes[0].odometerMiles, 5201);
    assert.equal(result.data.bikes[0].tasks[0].notes, null);
  });
});

describe('parseAccountImportText', () => {
  it('rejects text that isn’t JSON', () => {
    assert.match(errorOf(parseAccountImportText('not json', TODAY))!, /isn’t readable JSON/);
  });

  it('rejects files over the size limit before parsing', () => {
    assert.match(errorOf(parseAccountImportText(' '.repeat(IMPORT_LIMITS.fileChars + 1), TODAY))!, /too large/);
  });
});

describe('findDuplicateBikes', () => {
  it('matches year, make and model, ignoring case and spaces', () => {
    const garage = [{ year: 2023, make: 'Husqvarna', model: 'Norden 901' }];
    assert.deepEqual(
      findDuplicateBikes(
        [
          { year: 2023, make: 'husqvarna ', model: 'NORDEN 901' },
          { year: 2024, make: 'Husqvarna', model: 'Norden 901' },
        ],
        garage
      ),
      [true, false]
    );
  });
});

describe('taskIdForLog', () => {
  const ids = taskIdsByName([
    { id: 't1', task_name: 'Front tire' },
    { id: 't2', task_name: 'front tire' },
  ]);

  it('links a routine service to the task with the same name (first one wins)', () => {
    assert.equal(taskIdForLog({ taskName: 'FRONT TIRE', routine: true }, ids), 't1');
  });

  it('leaves one-offs and unmatched names unlinked', () => {
    assert.equal(taskIdForLog({ taskName: 'Front tire', routine: false }, ids), null);
    assert.equal(taskIdForLog({ taskName: 'Chain', routine: true }, ids), null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAccountExport } from './accountExport';
import {
  findDuplicateBikes,
  jobForEachLog,
  IMPORT_LIMITS,
  parseAccountImport,
  parseAccountImportText,
  taskIdForLog,
  taskIdsByName,
} from './accountImport';
import type { BikeJob, MaintenanceTask, Motorcycle, ServiceLog } from './types';

const TODAY = '2026-10-20';

const exportFile = () =>
  buildAccountExport({
    email: 'rider@example.com',
    profile: { unit_system: 'metric' },
    bikes: [
      {
        id: 'b1',
        user_id: 'someone-else',
        make: 'Husqvarna',
        model: 'Norden 901',
        year: 2023,
        current_mileage: 5200,
        purchased_on: '2024-03-10',
        purchase_mileage: 1200,
        shop_id: 's1',
        stored_on: '2026-10-12',
        battery_type: 'lithium',
        specs: { values: { oil_with_filter: { value: 1.7, unit: 'L', page: 140 } }, custom: [{ label: 'Headlight bulb', text: 'H4' }] },
      } as Motorcycle,
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
      { id: 'l2', motorcycle_id: 'b1', task_id: null, task_name: 'New grips', performed_at: '2025-07-04', odometer_at_service: 3400, cost: null, notes: 'Heated', shop: 'Home' },
      { id: 'l3', motorcycle_id: 'b1', task_id: null, task_name: 'Crash bars', performed_at: '2025-08-01', odometer_at_service: 3900, cost: 420, notes: null, job_id: 'j1', job_kind: 'upgrade' },
    ] as ServiceLog[],
    jobs: [
      { id: 'j1', user_id: 'someone-else', motorcycle_id: 'b1', kind: 'upgrade', name: 'Crash bars', notes: null, estimated_cost: 450, links: [{ url: 'https://revzilla.com/bars', label: 'SW-Motech' }], created_at: '2025-07-20T10:00:00Z' },
      { id: 'j2', user_id: 'someone-else', motorcycle_id: 'b1', kind: 'repair', name: 'Cracked mirror', notes: 'Left side', estimated_cost: null, links: [], created_at: '2025-09-01T10:00:00Z' },
    ] as BikeJob[],
    shops: [
      { id: 's1', user_id: 'someone-else', name: 'Moto Works', phone: '555-1234', email: null, address: null, website: 'https://motoworks.com/', notes: null, map_url: 'https://maps.app.goo.gl/AbC123' },
      { id: 's2', user_id: 'someone-else', name: 'moto works', phone: null, email: null, address: null, website: null, notes: 'A second one', map_url: null },
    ],
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
        purchase: { purchasedOn: '2024-03-10', purchaseMileage: 1200 },
        specs: { values: { oil_with_filter: { value: 1.7, unit: 'L', page: 140 } }, custom: [{ label: 'Headlight bulb', text: 'H4' }] },
        shop: { name: 'Moto Works', phone: '555-1234', email: null, address: null, website: 'https://motoworks.com/', notes: null, map_url: 'https://maps.app.goo.gl/AbC123' },
        storedOn: '2026-10-12',
        batteryType: 'lithium',
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
          { taskName: 'Crash bars', routine: false, jobKind: 'upgrade', performedAt: '2025-08-01', odometerMiles: 3900, shop: null, cost: 420, notes: null },
          { taskName: 'New grips', routine: false, jobKind: null, performedAt: '2025-07-04', odometerMiles: 3400, shop: 'Home', cost: null, notes: 'Heated' },
          { taskName: 'Front tire', routine: true, jobKind: null, performedAt: '2025-06-01', odometerMiles: 3000, shop: null, cost: 189.5, notes: null },
        ],
        jobs: [
          { kind: 'upgrade', name: 'Crash bars', notes: null, estimated_cost: 450, links: [{ url: 'https://revzilla.com/bars', label: 'SW-Motech' }], doneOn: '2025-08-01' },
          { kind: 'repair', name: 'Cracked mirror', notes: 'Left side', estimated_cost: null, links: [], doneOn: null },
        ],
      },
    ]);
  });

  it('drops a repair or upgrade that doesn’t make sense, and reads files without any', () => {
    const file = exportFile() as { bikes: { repairs_and_upgrades?: Record<string, unknown>[] }[] };
    file.bikes[0].repairs_and_upgrades![0].kind = 'wish';
    file.bikes[0].repairs_and_upgrades![1].links = [{ url: 'javascript:alert(1)', label: 'Bad' }, { url: 'shop.com/mirror', label: null }];
    const bad = parse(file);
    assert.ok('data' in bad);
    assert.deepEqual(bad.data.bikes[0].jobs.map((job) => [job.name, job.links]), [['Cracked mirror', [{ url: 'https://shop.com/mirror', label: null }]]]);

    delete file.bikes[0].repairs_and_upgrades;
    const older = parse(file);
    assert.ok('data' in older);
    assert.deepEqual(older.data.bikes[0].jobs, []);
  });

  it('drops a storage day in the future, and reads files without one', () => {
    const file = exportFile() as { bikes: Record<string, unknown>[] };
    file.bikes[0].in_storage_since = '2026-10-21';
    const future = parse(file);
    assert.ok('data' in future);
    assert.equal(future.data.bikes[0].storedOn, null);

    delete file.bikes[0].in_storage_since;
    delete file.bikes[0].battery_type;
    const older = parse(file);
    assert.ok('data' in older);
    assert.equal(older.data.bikes[0].storedOn, null);
    assert.equal(older.data.bikes[0].batteryType, null);
  });

  it('drops a purchase that doesn’t fit the bike, and reads files without one', () => {
    const file = exportFile() as { bikes: Record<string, unknown>[] };
    file.bikes[0].odometer_when_bought_miles = 9000;
    const tooHigh = parse(file);
    assert.ok('data' in tooHigh);
    assert.deepEqual(tooHigh.data.bikes[0].purchase, { purchasedOn: null, purchaseMileage: null });

    delete file.bikes[0].bought_on;
    delete file.bikes[0].odometer_when_bought_miles;
    const older = parse(file);
    assert.ok('data' in older);
    assert.deepEqual(older.data.bikes[0].purchase, { purchasedOn: null, purchaseMileage: null });
  });

  it('drops a shop that doesn’t make sense, and reads files without shops', () => {
    const file = exportFile() as { shops: Record<string, unknown>[]; bikes: Record<string, unknown>[] };
    file.shops[0].website = 'javascript:alert(1)';
    file.shops.splice(1, 1);
    const bad = parse(file);
    assert.ok('data' in bad);
    assert.equal(bad.data.bikes[0].shop, null);

    delete (file as Record<string, unknown>).shops;
    delete file.bikes[0].shop;
    const older = parse(file);
    assert.ok('data' in older);
    assert.equal(older.data.bikes[0].shop, null);
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

  it('keeps only well-formed specs, and reads files without any', () => {
    const file = exportFile() as { bikes: Record<string, unknown>[] };
    file.bikes[0].specs = { values: { oil_grade: { text: '10W-40' }, made_up: { text: 'x' }, fuel_tank: { value: 'lots', unit: 'L' } }, custom: 'nope' };
    const withBadSpecs = parse(file);
    assert.ok('data' in withBadSpecs);
    assert.deepEqual(withBadSpecs.data.bikes[0].specs, { values: { oil_grade: { text: '10W-40' } }, custom: [] });

    delete file.bikes[0].specs;
    const older = parse(file);
    assert.ok('data' in older);
    assert.deepEqual(older.data.bikes[0].specs, { values: {}, custom: [] });
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

  it('keeps a missing odometer as no reading', () => {
    const file = exportFile();
    file.bikes[0].odometer_miles = null;
    file.bikes[0].service_history[0].odometer_miles = null;
    const result = parse(file);
    assert.ok('data' in result);
    assert.equal(result.data.bikes[0].odometerMiles, null);
    assert.equal(result.data.bikes[0].logs[0].odometerMiles, null);
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

describe('jobForEachLog', () => {
  it('pairs each repair or upgrade record with its done job, once each', () => {
    const jobs = [
      { kind: 'upgrade' as const, name: 'Crash bars', doneOn: '2025-08-01' },
      { kind: 'repair' as const, name: 'Mirror', doneOn: null },
      { kind: 'repair' as const, name: 'Mirror', doneOn: '2025-09-01' },
    ];
    assert.deepEqual(
      jobForEachLog(
        [
          { taskName: 'crash bars', jobKind: 'upgrade', performedAt: '2025-08-01' },
          { taskName: 'Crash bars', jobKind: 'upgrade', performedAt: '2025-08-01' },
          { taskName: 'Mirror', jobKind: 'repair', performedAt: '2025-09-01' },
          { taskName: 'Mirror', jobKind: null, performedAt: '2025-09-01' },
          { taskName: 'Crash bars', jobKind: 'repair', performedAt: '2025-08-01' },
        ],
        jobs
      ),
      [0, null, 2, null, null]
    );
  });
});

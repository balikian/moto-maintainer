import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildServiceHistoryCsv, historyFileName, totalCost } from './historyExport';

const bike = { year: 2024, make: 'Yamaha', model: 'Tenere 700', current_mileage: 12000 };

const logs = [
  { id: '1', task_id: 't1', task_name: 'Engine Oil & Filter', performed_at: '2026-09-01', odometer_at_service: 10000, cost: 49.5, notes: 'Motul 10W-40, "OEM" filter' },
  { id: '2', task_id: null, task_name: 'Rear tire', performed_at: '2026-06-15T00:00:00+00:00', odometer_at_service: 8000, cost: null, notes: 'Line one\nLine two' },
];

describe('buildServiceHistoryCsv', () => {
  it('writes a header and one row per service, quoting commas, quotes, and newlines', () => {
    const csv = buildServiceHistoryCsv(bike, logs, 'imperial');
    assert.equal(
      csv,
      'Date,Type,Service,Odometer (mi),Cost,Notes\r\n' +
        '2026-09-01,Routine,Engine Oil & Filter,10000,49.50,"Motul 10W-40, ""OEM"" filter"\r\n' +
        '2026-06-15,One-off,Rear tire,8000,,"Line one\nLine two"\r\n'
    );
  });

  it('converts odometer readings to kilometers', () => {
    const csv = buildServiceHistoryCsv(bike, [logs[0]], 'metric');
    assert.match(csv, /Odometer \(km\)/);
    assert.match(csv, /,16093,/);
  });
});

describe('export helpers', () => {
  it('totals only recorded costs', () => {
    assert.equal(totalCost(logs), 49.5);
  });

  it('builds a safe file name', () => {
    assert.equal(historyFileName({ year: 2024, make: 'Harley-Davidson', model: 'Street Glide / Special' }, 'csv'),
      '2024-harley-davidson-street-glide-special-service-history.csv');
  });
});

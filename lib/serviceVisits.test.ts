import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupServiceVisits, normalizeShop, shopSuggestions, type VisitLog } from './serviceVisits';

const log = (overrides: Partial<VisitLog>): VisitLog => ({
  id: 'x',
  task_id: 't',
  task_name: 'Engine oil',
  performed_at: '2026-09-01',
  odometer_at_service: 12000,
  cost: null,
  notes: null,
  shop: null,
  ...overrides,
});

describe('groupServiceVisits', () => {
  it('puts services on the same day, odometer and place in one visit', () => {
    const visits = groupServiceVisits([
      log({ id: '1', task_name: '12,000 mi service', cost: 320, notes: 'Dealer service', shop: 'Eastside Harley' }),
      log({ id: '2', task_name: 'Engine oil', performed_at: '2026-09-01T00:00:00+00:00', shop: ' eastside  harley ' }),
      log({ id: '3', task_name: 'Chain lube', shop: 'Home' }),
      log({ id: '4', task_name: 'Brake fluid', performed_at: '2026-03-02', odometer_at_service: 9000 }),
    ]);

    assert.deepEqual(
      visits.map((visit) => visit.logs.map((entry) => entry.id)),
      [['1', '2'], ['3'], ['4']]
    );
    assert.equal(visits[0].shop, 'Eastside Harley');
    assert.equal(visits[0].performedAt, '2026-09-01');
    assert.equal(visits[0].odometer, 12000);
    assert.equal(visits[0].cost, 320);
    assert.deepEqual(visits[0].notes, ['Dealer service']);
  });

  it('keeps a different odometer apart, and groups services without a reading', () => {
    const visits = groupServiceVisits([
      log({ id: '1', odometer_at_service: null }),
      log({ id: '2', odometer_at_service: null }),
      log({ id: '3', odometer_at_service: 12100 }),
    ]);
    assert.deepEqual(visits.map((visit) => visit.logs.length), [2, 1]);
    assert.equal(visits[0].odometer, null);
  });

  it('adds up costs, lists each note once, and leaves cost null when none was recorded', () => {
    const [withCosts] = groupServiceVisits([
      log({ id: '1', cost: 49.5, notes: 'Motul 10W-40' }),
      log({ id: '2', cost: 20, notes: 'Motul 10W-40' }),
      log({ id: '3', cost: null, notes: ' ' }),
    ]);
    assert.equal(withCosts.cost, 69.5);
    assert.deepEqual(withCosts.notes, ['Motul 10W-40']);

    const [noCosts] = groupServiceVisits([log({ id: '1' })]);
    assert.equal(noCosts.cost, null);
  });
});

describe('normalizeShop', () => {
  it('trims, collapses spaces and turns blank into null', () => {
    assert.equal(normalizeShop('  Scarab   werks '), 'Scarab werks');
    assert.equal(normalizeShop('   '), null);
    assert.equal(normalizeShop(null), null);
    assert.equal(normalizeShop('x'.repeat(100))?.length, 80);
  });
});

describe('shopSuggestions', () => {
  it('offers Home first, then places used before, newest first, once each', () => {
    assert.deepEqual(
      shopSuggestions([{ shop: 'Scarabwerks' }, { shop: null }, { shop: 'home' }, { shop: 'scarabwerks' }, { shop: 'Eastside Harley' }]),
      ['Home', 'Scarabwerks', 'Eastside Harley']
    );
    assert.deepEqual(shopSuggestions([{ shop: 'A' }, { shop: 'B' }, { shop: 'C' }, { shop: 'D' }]), ['Home', 'A', 'B', 'C']);
  });
});

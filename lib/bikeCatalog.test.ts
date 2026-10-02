import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isInCatalog, manualsWithoutSchedule, mergeCatalog, type BikeCatalog } from './bikeCatalog';
import type { ModelEntry } from './types';

const base: BikeCatalog = {
  Husqvarna: { years: [2024], models: ['Norden 901', 'Svartpilen 401'] },
  Honda: { years: [2024], models: [] },
};

describe('isInCatalog', () => {
  it('matches make and model ignoring case and spaces', () => {
    assert.equal(isInCatalog(base, ' husqvarna', 'NORDEN 901 '), true);
  });

  it('treats a new model, a new make, or a make with no models as not listed', () => {
    assert.equal(isInCatalog(base, 'Husqvarna', 'Norden 901 Expedition'), false);
    assert.equal(isInCatalog(base, 'CFMoto', '450MT'), false);
    assert.equal(isInCatalog(base, 'Honda', 'Africa Twin'), false);
  });
});

describe('mergeCatalog', () => {
  it('adds a model under the existing make, sorted, without changing the original', () => {
    const merged = mergeCatalog(base, [{ make: 'husqvarna', model: 'Norden 901 Expedition' }]);
    assert.deepEqual(merged.Husqvarna.models, ['Norden 901', 'Norden 901 Expedition', 'Svartpilen 401']);
    assert.deepEqual(base.Husqvarna.models, ['Norden 901', 'Svartpilen 401']);
    assert.equal('husqvarna' in merged, false);
  });

  it('adds new makes and skips duplicates and blanks', () => {
    const merged = mergeCatalog(base, [
      { make: 'CFMoto', model: '450MT' },
      { make: 'cfmoto', model: '450mt' },
      { make: 'Husqvarna', model: 'norden 901' },
      { make: ' ', model: 'X' },
    ]);
    assert.deepEqual(merged.CFMoto.models, ['450MT']);
    assert.deepEqual(merged.Husqvarna.models, ['Norden 901', 'Svartpilen 401']);
    assert.equal(Object.keys(merged).length, 3);
  });
});

const entry = (overrides: Partial<ModelEntry>): ModelEntry => ({
  id: 'x',
  make: 'Husqvarna',
  model: 'Norden 901',
  year_from: 2024,
  year_to: 2024,
  status: 'approved',
  submitted_by: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('manualsWithoutSchedule', () => {
  it('lists approved manuals no schedule covers', () => {
    const manuals = [
      entry({ id: 'covered' }),
      entry({ id: 'other-years', year_from: 2020, year_to: 2021 }),
      entry({ id: 'other-model', model: 'Norden 901 Expedition' }),
      entry({ id: 'pending', model: 'Svartpilen 401', status: 'pending' }),
    ];
    const schedules = [entry({ year_from: 2023, year_to: 2025, make: 'HUSQVARNA' })];
    assert.deepEqual(manualsWithoutSchedule(manuals, schedules).map((m) => m.id), ['other-years', 'other-model']);
  });

  it('ignores rejected schedules', () => {
    assert.equal(manualsWithoutSchedule([entry({})], [entry({ status: 'rejected' })]).length, 1);
  });
});

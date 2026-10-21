import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDistance, formatOdometer, fromDisplayDistance, normalizeMileage, toDisplayDistance } from './units';

describe('units', () => {
  it('reads typed distances with thousands separators', () => {
    assert.equal(fromDisplayDistance('12,345', 'imperial'), 12345);
    assert.ok(Number.isNaN(fromDisplayDistance('abc', 'imperial')));
  });

  it('keeps a minus sign, so a negative reading is rejected rather than saved', () => {
    assert.equal(fromDisplayDistance('-500', 'imperial'), -500);
    assert.equal(normalizeMileage(fromDisplayDistance('-500', 'imperial')), null);
  });

  it('converts kilometers to miles and back', () => {
    assert.equal(toDisplayDistance(fromDisplayDistance('1609.344', 'metric'), 'metric'), 1609);
    assert.equal(formatDistance(1000, 'metric'), '1,609 km');
  });

  it('shows a bike without a reading', () => {
    assert.equal(formatOdometer(null, 'imperial'), 'No odometer reading');
    assert.equal(formatOdometer(8554, 'imperial'), '8,554 mi');
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addMonths, daysBetween, formatDisplayDate, isIsoDate, parseIsoDate, toIsoDate } from './dates';

describe('dates', () => {
  it('parses a calendar day as local midnight, not UTC', () => {
    const date = parseIsoDate('2026-09-29');
    assert.equal(date?.getFullYear(), 2026);
    assert.equal(date?.getMonth(), 8);
    assert.equal(date?.getDate(), 29);
  });

  it('parses the date part of a timestamp', () => {
    assert.equal(toIsoDate(parseIsoDate('2026-09-29T00:00:00+00:00')!), '2026-09-29');
  });

  it('rejects invalid dates', () => {
    assert.equal(parseIsoDate('2026-02-30'), null);
    assert.equal(parseIsoDate('not a date'), null);
    assert.equal(isIsoDate('2026-9-1'), false);
    assert.equal(isIsoDate('2026-09-01'), true);
  });

  it('formats for display without shifting the day', () => {
    assert.equal(formatDisplayDate('2026-09-29'), 'Sep 29, 2026');
  });

  it('adds months, clamping to the end of short months', () => {
    assert.equal(toIsoDate(addMonths(new Date(2026, 0, 31), 1)), '2026-02-28');
    assert.equal(toIsoDate(addMonths(new Date(2026, 10, 15), 3)), '2027-02-15');
  });

  it('counts calendar days', () => {
    assert.equal(daysBetween(new Date(2026, 8, 1), new Date(2026, 8, 29)), 28);
    assert.equal(daysBetween(new Date(2026, 8, 29), new Date(2026, 8, 1)), -28);
  });
});

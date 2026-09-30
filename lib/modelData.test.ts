import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankMatches } from './modelData';
import type { ModelEntry } from './types';

const entry = (id: string, overrides: Partial<ModelEntry>): ModelEntry => ({
  id,
  make: 'Husqvarna',
  model: 'Norden 901',
  year_from: 2022,
  year_to: 2025,
  status: 'approved',
  submitted_by: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const ids = (entries: ModelEntry[]) => entries.map((e) => e.id);

describe('rankMatches', () => {
  it('keeps only entries whose year range covers the bike', () => {
    const entries = [entry('a', {}), entry('b', { year_from: 2026, year_to: 2027 })];
    assert.deepEqual(ids(rankMatches(entries, 2024)), ['a']);
  });

  it('never uses rejected entries', () => {
    assert.deepEqual(ids(rankMatches([entry('a', { status: 'rejected' })], 2024)), []);
  });

  it('prefers approved entries over pending ones', () => {
    const entries = [entry('pending', { status: 'pending', year_from: 2024, year_to: 2024 }), entry('approved', {})];
    assert.deepEqual(ids(rankMatches(entries, 2024)), ['approved', 'pending']);
  });

  it('prefers the narrowest year range, then the newest', () => {
    const entries = [
      entry('wide', { year_from: 2019, year_to: 2030 }),
      entry('old', { year_from: 2024, year_to: 2024, created_at: '2025-01-01T00:00:00Z' }),
      entry('new', { year_from: 2024, year_to: 2024, created_at: '2026-06-01T00:00:00Z' }),
    ];
    assert.deepEqual(ids(rankMatches(entries, 2024)), ['new', 'old', 'wide']);
  });
});

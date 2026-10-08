import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeSpend } from './spend';

const log = (task_name: string, performed_at: string, cost: number | null, task_id: string | null = null) => ({
  task_id,
  task_name,
  performed_at,
  cost,
});

const tasks = [
  { id: 'fluid', task_name: 'Replace front brake fluid', category: null },
  { id: 'bleed', task_name: 'Bleed the system', category: 'brakes' as const },
];

describe('summarizeSpend', () => {
  const logs = [
    log('Replace front brake fluid', '2026-03-01', 40, 'fluid'),
    log('Bleed the system', '2026-03-01', 25.5, 'bleed'),
    log('New rear tire', '2026-06-10', 189.99),
    log('Replace engine oil and filter', '2025-11-20', 60),
    log('Check tire pressure and tread', '2026-07-01', null),
    log('Wash', '2026-07-02', 0),
  ];

  it('totals everything, largest category first', () => {
    const summary = summarizeSpend(logs, tasks);
    assert.equal(summary.total, 315.49);
    assert.equal(summary.paidServices, 4);
    assert.deepEqual(summary.byCategory, [
      { category: 'wheels', total: 189.99 },
      { category: 'engine', total: 60 },
      { category: 'brakes', total: 65.5 },
    ].sort((a, b) => b.total - a.total));
  });

  it('can limit to one calendar year', () => {
    const summary = summarizeSpend(logs, tasks, 2026);
    assert.equal(summary.total, 255.49);
    assert.equal(summary.paidServices, 3);
    assert.equal(summary.byCategory.some((entry) => entry.category === 'engine'), false);
  });

  it("uses the task's saved category, and guesses for one-offs", () => {
    const summary = summarizeSpend([log('Bleed the system', '2026-01-01', 10, 'bleed'), log('Bleed the system', '2026-01-02', 5)], tasks);
    assert.deepEqual(summary.byCategory, [
      { category: 'brakes', total: 10 },
      { category: 'other', total: 5 },
    ]);
  });

  it('is empty when nothing had a cost', () => {
    assert.deepEqual(summarizeSpend([log('Wash', '2026-01-01', null)], tasks), { total: 0, paidServices: 0, byCategory: [] });
  });
});

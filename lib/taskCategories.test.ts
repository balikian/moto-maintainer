import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { batchCandidates, guessCategory, isTaskCategory, taskCategory } from './taskCategories';

describe('guessCategory', () => {
  const cases: [string, string][] = [
    ['Replace engine oil and filter', 'engine'],
    ['Check valve clearance', 'engine'],
    ['Replace air filter, clean air filter box', 'engine'],
    ['Replace spark plugs', 'engine'],
    ['Replace front brake fluid', 'brakes'],
    ['Check foot brake lever free travel', 'brakes'],
    ['Check brake pads and discs', 'brakes'],
    ['Clean, lube and adjust chain', 'drivetrain'],
    ['Replace final drive oil', 'drivetrain'],
    ['Check drive belt', 'drivetrain'],
    ['Check clutch lever free travel', 'drivetrain'],
    ['Change fork oil', 'suspension'],
    ['Check steering and wheel bearings', 'suspension'],
    ['Check shock absorber and fork for leaks', 'suspension'],
    ['Check the frame', 'suspension'],
    ['Check tire pressure and tread', 'wheels'],
    ['Check wheel bearing play', 'wheels'],
    ['Check spoke tension', 'wheels'],
    ['Check rim run-out', 'wheels'],
    ['Replace coolant', 'cooling'],
    ['Check coolant level and antifreeze', 'cooling'],
    ['Check radiator fan', 'cooling'],
    ['Check battery and terminals', 'electrical'],
    ['Check headlight setting', 'electrical'],
    ['Check electrical system', 'electrical'],
    ['Lubricate and adjust cables and controls', 'controls'],
    ['Lubricate all moving parts', 'controls'],
    ['Dealer service inspection', 'other'],
    ['Check all hoses and sleeves', 'other'],
    ['Wash the bike', 'other'],
  ];

  for (const [name, expected] of cases) {
    it(`"${name}" → ${expected}`, () => assert.equal(guessCategory(name), expected));
  }
});

describe('taskCategory', () => {
  it('uses the saved category when there is one, else guesses', () => {
    assert.equal(taskCategory({ task_name: 'Replace coolant', category: 'engine' }), 'engine');
    assert.equal(taskCategory({ task_name: 'Replace coolant', category: null }), 'cooling');
    assert.equal(taskCategory({ task_name: 'Replace coolant', category: 'not-a-category' }), 'cooling');
  });

  it('recognises valid ids', () => {
    assert.equal(isTaskCategory('brakes'), true);
    assert.equal(isTaskCategory('Brakes'), false);
    assert.equal(isTaskCategory(undefined), false);
  });
});

describe('batchCandidates', () => {
  const task = (id: string, task_name: string, category: string | null = null) => ({ id, task_name, category });
  const entry = (t: ReturnType<typeof task>, fractionRemaining: number | null) => ({ task: t, dueState: { fractionRemaining } });

  const frontFluid = task('front', 'Replace front brake fluid');
  const rearFluid = task('rear', 'Replace rear brake fluid');
  const pads = task('pads', 'Check brake pads and discs');
  const lever = task('lever', 'Check foot brake lever free travel');
  const oil = task('oil', 'Replace engine oil and filter');
  const entries = [entry(frontFluid, 0.05), entry(rearFluid, 0.3), entry(pads, 0.6), entry(lever, -0.1), entry(oil, 0.1)];

  it('lists other same-category tasks at least halfway to due, most due first', () => {
    assert.deepEqual(batchCandidates(frontFluid, entries).map((t) => t.id), ['lever', 'rear']);
  });

  it('ignores other categories and tasks without an interval', () => {
    assert.deepEqual(batchCandidates(oil, [...entries, entry(task('x', 'Check engine mounts'), null)]).map((t) => t.id), []);
  });

  it('respects a saved category over the name', () => {
    const custom = task('custom', 'Bleed the system', 'brakes');
    assert.deepEqual(batchCandidates(custom, entries).map((t) => t.id), ['lever', 'front', 'rear']);
  });

  it('caps the list', () => {
    const custom = task('custom', 'Bleed the system', 'brakes');
    assert.equal(batchCandidates(custom, entries, 1).length, 1);
  });
});

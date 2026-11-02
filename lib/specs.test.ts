import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanBikeSpecs,
  cleanSpecValue,
  DEFAULT_FAVORITE_SPECS,
  favoriteSpecKeys,
  favoriteSpecRows,
  formatSpec,
  groupResolvedSpecs,
  parseSpecNumber,
  pickFavoriteSpecs,
  resolveSpecs,
  shortGrade,
  SPEC_GROUPS,
  specFromDraft,
  specGroupsForTask,
  specsForTasks,
  specValuesFromRows,
  toggleCustomFavorite,
  toggleFavoriteSpec,
  unitsFor,
  type ExtractedSpecRow,
} from './specs';

describe('SPEC_GROUPS', () => {
  it('uses each key once', () => {
    const keys = SPEC_GROUPS.flatMap((group) => group.specs.map((spec) => spec.key));
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe('formatSpec', () => {
  it('shows text as entered', () => {
    assert.equal(formatSpec({ text: 'SAE 10W-40, JASO MA2' }, 'imperial'), 'SAE 10W-40, JASO MA2');
  });

  it('shows values in the rider’s units as entered', () => {
    assert.equal(formatSpec({ value: 3.2, unit: 'L' }, 'metric'), '3.2 L');
    assert.equal(formatSpec({ value: 36, unit: 'psi' }, 'imperial'), '36 psi');
    assert.equal(formatSpec({ value: 2.5, unit: 'bar' }, 'metric'), '2.5 bar');
    assert.equal(formatSpec({ value: 0.15, unit: 'mm' }, 'metric'), '0.15 mm');
  });

  it('converts from the other system, with the original in parentheses', () => {
    assert.equal(formatSpec({ value: 3.2, unit: 'L' }, 'imperial'), '3.4 qt (3.2 L)');
    assert.equal(formatSpec({ value: 482, unit: 'mL' }, 'imperial'), '0.5 qt (482 mL)');
    assert.equal(formatSpec({ value: 250, unit: 'kPa' }, 'imperial'), '36 psi (250 kPa)');
    assert.equal(formatSpec({ value: 36, unit: 'psi' }, 'metric'), '248 kPa (36 psi)');
    assert.equal(formatSpec({ value: 0.9, unit: 'L' }, 'metric'), '0.9 L');
    assert.equal(formatSpec({ value: 12, unit: 'floz' }, 'metric'), '355 mL (12 fl oz)');
  });

  it('shows ranges', () => {
    assert.equal(formatSpec({ value: 25, max: 35, unit: 'mm' }, 'metric'), '25–35 mm');
    assert.equal(formatSpec({ value: 25, max: 35, unit: 'mm' }, 'imperial'), '0.984–1.378 in (25–35 mm)');
  });

  it('always shows torques in both systems', () => {
    assert.equal(formatSpec({ value: 30, unit: 'Nm' }, 'metric'), '30 N·m (22 lb-ft)');
    assert.equal(formatSpec({ value: 30, unit: 'Nm' }, 'imperial'), '22 lb-ft (30 N·m)');
    assert.equal(formatSpec({ value: 22, unit: 'lbft' }, 'metric'), '29.8 N·m (22 lb-ft)');
    assert.equal(formatSpec({ value: 10, unit: 'Nm' }, 'imperial'), '89 lb-in (10 N·m)');
    assert.equal(formatSpec({ value: 3, unit: 'kgfm' }, 'metric'), '29.4 N·m (3 kgf·m)');
  });
});

describe('unitsFor', () => {
  it('lists the rider’s units first', () => {
    assert.deepEqual(unitsFor('pressure', 'imperial'), ['psi', 'kPa', 'bar']);
    assert.deepEqual(unitsFor('torque', 'metric'), ['Nm', 'kgfm', 'lbft', 'lbin']);
  });
});

describe('parseSpecNumber', () => {
  it('reads numbers and ranges', () => {
    assert.deepEqual(parseSpecNumber('3.2'), { value: 3.2 });
    assert.deepEqual(parseSpecNumber(' .5 '), { value: 0.5 });
    assert.deepEqual(parseSpecNumber('25-35'), { value: 25, max: 35 });
    assert.deepEqual(parseSpecNumber('0.10 – 0.15'), { value: 0.1, max: 0.15 });
    assert.deepEqual(parseSpecNumber('25 to 35'), { value: 25, max: 35 });
    assert.deepEqual(parseSpecNumber('30-30'), { value: 30 });
  });

  it('reads commas', () => {
    assert.deepEqual(parseSpecNumber('3,2'), { value: 3.2 });
    assert.deepEqual(parseSpecNumber('0,15'), { value: 0.15 });
    assert.deepEqual(parseSpecNumber('1,000'), { value: 1000 });
  });

  it('rejects anything else', () => {
    for (const input of ['', 'abc', '3.2 L', '35-25', '1-2-3', '-5']) assert.equal(parseSpecNumber(input), null, input);
  });
});

describe('cleanSpecValue', () => {
  it('keeps well-formed values', () => {
    assert.deepEqual(cleanSpecValue('oil_grade', { text: ' 10W-40 ', page: 140 }), { text: '10W-40', page: 140 });
    assert.deepEqual(cleanSpecValue('chain_slack', { value: 25, max: 35, unit: 'mm' }), { value: 25, max: 35, unit: 'mm' });
  });

  it('drops values that don’t fit the spec', () => {
    assert.equal(cleanSpecValue('oil_with_filter', { value: 3, unit: 'psi' }), null);
    assert.equal(cleanSpecValue('oil_with_filter', { value: -1, unit: 'L' }), null);
    assert.equal(cleanSpecValue('oil_with_filter', { value: 3, max: 2, unit: 'L' }), null);
    assert.equal(cleanSpecValue('oil_grade', { text: '' }), null);
    assert.equal(cleanSpecValue('oil_grade', { text: 'x'.repeat(121) }), null);
    assert.equal(cleanSpecValue('oil_grade', 'SAE 10W-40'), null);
  });

  it('drops a bad page but keeps the value', () => {
    assert.deepEqual(cleanSpecValue('battery', { text: 'YTZ10S', page: 0 }), { text: 'YTZ10S' });
  });
});

describe('cleanBikeSpecs', () => {
  it('keeps known values and custom rows, and drops the rest', () => {
    assert.deepEqual(
      cleanBikeSpecs({
        values: { battery: { text: 'YTZ10S' }, made_up: { text: 'x' }, fuel_tank: { value: 'lots', unit: 'L' } },
        custom: [{ label: 'Headlight bulb', text: 'H4' }, { label: '', text: 'x' }, 'nope'],
        extra: true,
      }),
      { values: { battery: { text: 'YTZ10S' } }, custom: [{ label: 'Headlight bulb', text: 'H4' }] }
    );
  });

  it('handles nothing saved', () => {
    assert.deepEqual(cleanBikeSpecs({}), { values: {}, custom: [] });
    assert.deepEqual(cleanBikeSpecs(null), { values: {}, custom: [] });
  });

  it('keeps known favorites once each, in the list’s order, and an empty choice', () => {
    assert.deepEqual(cleanBikeSpecs({ favorites: ['battery', 'made_up', 'oil_grade', 'battery', 7] }).favorites, ['oil_grade', 'battery']);
    assert.deepEqual(cleanBikeSpecs({ favorites: [] }).favorites, []);
    assert.equal('favorites' in cleanBikeSpecs({ favorites: 'oil_grade' }), false);
  });
});

describe('favorites', () => {
  it('uses the defaults until the bike has its own choice', () => {
    assert.deepEqual(favoriteSpecKeys(undefined), DEFAULT_FAVORITE_SPECS);
    assert.deepEqual(favoriteSpecKeys([]), []);
  });

  it('stars and unstars, starting from the defaults', () => {
    assert.deepEqual(toggleFavoriteSpec(undefined, 'pressure_rear'), ['fuel_grade', 'oil_grade', 'pressure_front']);
    assert.deepEqual(toggleFavoriteSpec(undefined, 'battery'), ['fuel_grade', 'oil_grade', 'pressure_front', 'pressure_rear', 'battery']);
    assert.deepEqual(toggleFavoriteSpec(['battery'], 'fuel_tank'), ['fuel_tank', 'battery']);
  });

  it('picks the starred specs that have a value', () => {
    const specs = resolveSpecs({ oil_grade: { text: '10W-40' }, battery: { text: 'YTZ10S' } }, { values: { pressure_front: { value: 36, unit: 'psi' } } });
    assert.deepEqual(pickFavoriteSpecs(specs, undefined).map(({ key }) => key), ['oil_grade', 'pressure_front']);
    assert.deepEqual(pickFavoriteSpecs(specs, ['battery']).map(({ key }) => key), ['battery']);
  });

  it('stars the rider’s own rows and shows them after the listed specs', () => {
    const custom = toggleCustomFavorite([{ label: 'Headlight bulb', text: 'H7' }, { label: 'Key', text: '1234' }], 0);
    assert.deepEqual(custom, [{ label: 'Headlight bulb', text: 'H7', favorite: true }, { label: 'Key', text: '1234' }]);
    assert.deepEqual(toggleCustomFavorite(custom, 0)[0], { label: 'Headlight bulb', text: 'H7' });
    assert.deepEqual(cleanBikeSpecs({ custom: [...custom, { label: 'X', text: 'y', favorite: 'yes' }] }).custom, [...custom, { label: 'X', text: 'y' }]);

    const specs = resolveSpecs({ oil_grade: { text: '10W-40' } }, null);
    assert.deepEqual(favoriteSpecRows(specs, { custom }, 'imperial'), [
      { id: 'oil_grade', label: 'Oil grade', value: '10W-40', icon: 'oil' },
      { id: 'custom-0', label: 'Headlight bulb', value: 'H7' },
    ]);
  });

  it('shortens fuel and oil grades', () => {
    assert.equal(shortGrade('fuel_grade', 'Unleaded, 91 octane (95 RON)'), '91 octane (95 RON)');
    assert.equal(shortGrade('fuel_grade', 'Premium unleaded'), 'Premium');
    assert.equal(shortGrade('fuel_grade', '91 octane (unleaded)'), '91 octane');
    assert.equal(shortGrade('fuel_grade', 'Unleaded'), 'Unleaded');
    assert.equal(shortGrade('oil_grade', 'SAE 10W-40, JASO MA2'), '10W-40, JASO MA2');
    assert.equal(shortGrade('coolant', 'Unleaded'), 'Unleaded');
  });

  it('puts front and rear pressure on one chip, in the rider’s units only', () => {
    const specs = resolveSpecs(
      { fuel_grade: { text: 'Unleaded, 91 octane' }, pressure_front: { value: 250, unit: 'kPa' }, pressure_rear: { value: 290, unit: 'kPa' } },
      null
    );
    assert.deepEqual(favoriteSpecRows(specs, {}, 'imperial'), [
      { id: 'fuel_grade', label: 'Fuel grade', value: '91 octane', icon: 'fuel' },
      { id: 'pressures', label: 'Tire pressure', value: '36 / 42 psi', icon: 'tire' },
    ]);
    assert.deepEqual(favoriteSpecRows(specs, { favorites: ['pressure_rear', 'battery'] }, 'metric'), [
      { id: 'pressure_rear', label: 'Rear pressure', value: '290 kPa', icon: 'tire' },
    ]);
  });
});

describe('resolveSpecs', () => {
  it('uses the bike’s own values over the manual’s, in the list’s order', () => {
    const resolved = resolveSpecs(
      { tire_rear: { text: '150/70-17', page: 150 }, oil_grade: { text: '10W-40', page: 140 } },
      { values: { tire_rear: { text: '150/70-18' } } }
    );
    assert.deepEqual(
      resolved.map(({ key, from, value }) => [key, from, 'text' in value ? value.text : null]),
      [
        ['oil_grade', 'manual', '10W-40'],
        ['tire_rear', 'bike', '150/70-18'],
      ]
    );
    assert.deepEqual(
      groupResolvedSpecs(resolved).map(({ group }) => group.id),
      ['oil', 'tires']
    );
  });
});

describe('specFromDraft', () => {
  it('reads text, numbers and ranges', () => {
    assert.deepEqual(specFromDraft('text', { text: ' DOT 4 ', unit: null }), { text: 'DOT 4' });
    assert.deepEqual(specFromDraft('volume', { text: '3,2', unit: 'L' }), { value: 3.2, unit: 'L' });
    assert.deepEqual(specFromDraft('length', { text: '25-35', unit: 'mm' }), { value: 25, max: 35, unit: 'mm' });
  });

  it('tells empty from unreadable', () => {
    assert.equal(specFromDraft('volume', { text: '  ', unit: 'L' }), null);
    assert.equal(specFromDraft('volume', { text: 'lots', unit: 'L' }), 'invalid');
    assert.equal(specFromDraft('volume', { text: '3', unit: null }), 'invalid');
  });
});

describe('specValuesFromRows', () => {
  const row = (fields: Partial<ExtractedSpecRow> & Pick<ExtractedSpecRow, 'key'>): ExtractedSpecRow => ({
    text: null,
    value: null,
    max: null,
    unit: null,
    page: null,
    ...fields,
  });

  it('turns Claude’s rows into values, with their pages', () => {
    assert.deepEqual(
      specValuesFromRows([
        row({ key: 'oil_grade', text: 'SAE  10W-40,\nJASO MA2', page: 140 }),
        row({ key: 'oil_with_filter', value: 3.2, unit: 'L', page: 140 }),
        row({ key: 'chain_slack', value: 25, max: 35, unit: 'mm' }),
        row({ key: 'spark_plug_gap', value: 0.8, max: 0.8, unit: 'mm' }),
      ]),
      {
        oil_grade: { text: 'SAE 10W-40, JASO MA2', page: 140 },
        oil_with_filter: { value: 3.2, unit: 'L', page: 140 },
        chain_slack: { value: 25, max: 35, unit: 'mm' },
        spark_plug_gap: { value: 0.8, unit: 'mm' },
      }
    );
  });

  it('keeps the first value for a key and drops ones that don’t fit', () => {
    assert.deepEqual(
      specValuesFromRows([
        row({ key: 'battery', text: 'YTZ10S' }),
        row({ key: 'battery', text: 'YTX9-BS' }),
        row({ key: 'fuel_tank', text: '18 L' }),
        row({ key: 'pressure_front', value: 36, unit: 'L' }),
        row({ key: 'oil_grade', value: 10, unit: 'L' }),
      ]),
      { battery: { text: 'YTZ10S' } }
    );
  });
});

describe('specsForTasks', () => {
  const resolved = resolveSpecs({ oil_grade: { text: '10W-40' }, tire_front: { text: '90/90-21' } }, { values: { chain_slack: { value: 25, max: 35, unit: 'mm' } } });
  const summary = (names: string[]) => specsForTasks(names, resolved).map(({ group, specs }) => [group.id, specs.map((spec) => spec.key)]);

  it('gives each task’s groups with the bike’s values, once and in the list’s order', () => {
    assert.deepEqual(summary(['Clean and lube chain', 'Oil change', 'Replace oil filter']), [
      ['oil', ['oil_grade']],
      ['chain', ['chain_slack']],
    ]);
  });

  it('lists a matching group even without values', () => {
    assert.deepEqual(summary(['Replace coolant']), [['cooling', []]]);
  });

  it('gives nothing for tasks without specs', () => {
    assert.deepEqual(summary(['Wash the bike']), []);
  });
});

describe('specGroupsForTask', () => {
  const groups = (name: string) => specGroupsForTask(name).map((group) => group.id);

  it('matches tasks to their specs', () => {
    assert.deepEqual(groups('Replace engine oil and filter'), ['oil']);
    assert.deepEqual(groups('Oil change'), ['oil']);
    assert.deepEqual(groups('Change fork oil'), ['suspension']);
    assert.deepEqual(groups('Replace final drive oil'), ['shaft']);
    assert.deepEqual(groups('Check tire pressure and tread'), ['tires']);
    assert.deepEqual(groups('Clean, lube and adjust chain'), ['chain']);
    assert.deepEqual(groups('Replace brake fluid'), ['brakes']);
    assert.deepEqual(groups('Replace coolant'), ['cooling']);
    assert.deepEqual(groups('Check valve clearance'), ['engine']);
    assert.deepEqual(groups('Replace spark plugs'), ['electrical']);
    assert.deepEqual(groups('Replace air filter'), ['air']);
    assert.deepEqual(groups('Check headlight'), []);
  });
});

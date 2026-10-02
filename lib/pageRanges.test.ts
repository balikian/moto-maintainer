import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatPageList, MAX_IMPORT_PAGES, parsePageSelection } from './pageRanges';

describe('parsePageSelection', () => {
  it('parses single pages and ranges, sorted and without duplicates', () => {
    assert.deepEqual(parsePageSelection('90, 84-86, 85', 200), { pages: [84, 85, 86, 90] });
  });

  it('accepts an en dash and extra spaces', () => {
    assert.deepEqual(parsePageSelection(' 12 – 13 ', 50), { pages: [12, 13] });
  });

  it('rejects empty input, bad formats, backwards ranges, and pages past the end', () => {
    assert.ok('error' in parsePageSelection('', 50));
    assert.ok('error' in parsePageSelection('page 4', 50));
    assert.ok('error' in parsePageSelection('10-5', 50));
    assert.ok('error' in parsePageSelection('0', 50));
    assert.match((parsePageSelection('49-51', 50) as { error: string }).error, /only has 50 pages/);
  });

  it('limits how many pages can be sent', () => {
    assert.ok('pages' in parsePageSelection(`1-${MAX_IMPORT_PAGES}`, 500));
    assert.ok('error' in parsePageSelection(`1-${MAX_IMPORT_PAGES + 1}`, 500));
    assert.ok('error' in parsePageSelection('1-400', 500));
  });

  it('explains what went wrong for a blank box or a whole-manual range', () => {
    assert.match((parsePageSelection('', 190) as { error: string }).error, /Enter the page numbers/);
    assert.match((parsePageSelection('1-200', 190) as { error: string }).error, /only has 190 pages/);
    assert.match((parsePageSelection('1-200', 400) as { error: string }).error, /at most 20 pages/);
  });
});

describe('formatPageList', () => {
  it('collapses consecutive pages into ranges', () => {
    assert.equal(formatPageList([84, 85, 86, 90]), '84–86, 90');
    assert.equal(formatPageList([7]), '7');
  });
});

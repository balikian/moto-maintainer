import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDarkTheme, parseTheme } from './theme';

describe('parseTheme', () => {
  it('keeps light and dark', () => {
    assert.equal(parseTheme('light'), 'light');
    assert.equal(parseTheme('dark'), 'dark');
  });

  it('treats anything else as Auto', () => {
    assert.equal(parseTheme('system'), 'system');
    assert.equal(parseTheme(undefined), 'system');
    assert.equal(parseTheme('Dark'), 'system');
  });
});

describe('isDarkTheme', () => {
  it('follows the device on Auto', () => {
    assert.equal(isDarkTheme('system', true), true);
    assert.equal(isDarkTheme('system', false), false);
  });

  it('ignores the device when the rider picked one', () => {
    assert.equal(isDarkTheme('dark', false), true);
    assert.equal(isDarkTheme('light', true), false);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeVapidKey, pushAvailability } from './pushSupport';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const browser = (overrides: Partial<Parameters<typeof pushAvailability>[0]> = {}) => ({
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  runningInstalled: false,
  userAgent: WINDOWS,
  maxTouchPoints: 0,
  ...overrides,
});

describe('pushAvailability', () => {
  it('is available where the browser has push', () => {
    assert.equal(pushAvailability(browser()), 'available');
    assert.equal(pushAvailability(browser({ userAgent: IPHONE, maxTouchPoints: 5, runningInstalled: true })), 'available');
  });

  it('points iPhones in Safari to the Home Screen app', () => {
    assert.equal(pushAvailability(browser({ userAgent: IPHONE, maxTouchPoints: 5, hasPushManager: false, hasNotification: false })), 'home-screen');
  });

  it('is unsupported elsewhere, and in a Home Screen app on an iOS too old for push', () => {
    assert.equal(pushAvailability(browser({ hasPushManager: false })), 'unsupported');
    assert.equal(pushAvailability(browser({ userAgent: IPHONE, maxTouchPoints: 5, hasPushManager: false, runningInstalled: true })), 'unsupported');
  });
});

describe('decodeVapidKey', () => {
  it('decodes URL-safe base64 without padding', () => {
    assert.deepEqual([...decodeVapidKey('-_8')], [0xfb, 0xff]);
    assert.deepEqual([...decodeVapidKey('AQID')], [1, 2, 3]);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { installOption, isIosDevice } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

describe('isIosDevice', () => {
  it('spots iPhones, and iPads that ask for desktop sites', () => {
    assert.equal(isIosDevice(IPHONE, 5), true);
    assert.equal(isIosDevice(IPAD_DESKTOP_MODE, 5), true);
  });

  it('leaves out Macs and Android', () => {
    assert.equal(isIosDevice(IPAD_DESKTOP_MODE, 0), false);
    assert.equal(isIosDevice(ANDROID, 5), false);
  });
});

describe('installOption', () => {
  const base = { runningInstalled: false, hasPrompt: false, userAgent: ANDROID, maxTouchPoints: 5 };

  it('offers nothing once running as an installed app', () => {
    assert.equal(installOption({ ...base, runningInstalled: true, hasPrompt: true }), 'installed');
    assert.equal(installOption({ ...base, runningInstalled: true, userAgent: IPHONE }), 'installed');
  });

  it('uses the browser’s prompt when there is one', () => {
    assert.equal(installOption({ ...base, hasPrompt: true }), 'prompt');
  });

  it('shows the Share-menu steps on iPhone', () => {
    assert.equal(installOption({ ...base, userAgent: IPHONE }), 'ios');
  });

  it('offers nothing where the browser can’t install', () => {
    assert.equal(installOption(base), 'none');
  });
});

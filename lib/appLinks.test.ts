import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appLinkPath, notificationPath } from './appLinks';

describe('appLinkPath', () => {
  it("turns Google sign-in's return into the site's callback, query and all", () => {
    assert.equal(appLinkPath('app.swingarm://auth/callback?code=abc123'), '/auth/callback?code=abc123');
    assert.equal(appLinkPath('app.swingarm.dev://auth/callback?code=abc123'), '/auth/callback?code=abc123');
  });

  it("ignores other apps' schemes and web addresses", () => {
    assert.equal(appLinkPath('other.app://auth/callback?code=abc123'), null);
    assert.equal(appLinkPath('https://swingarm.app/auth/callback?code=abc123'), null);
  });

  it('only opens pages meant for app links', () => {
    assert.equal(appLinkPath('app.swingarm://admin'), null);
    assert.equal(appLinkPath('app.swingarm://auth/callback/../../admin'), null);
    assert.equal(appLinkPath('app.swingarm:///auth/callback'), null);
  });

  it('ignores text that isn’t a link', () => {
    assert.equal(appLinkPath('not a link'), null);
    assert.equal(appLinkPath(''), null);
  });
});

describe('notificationPath', () => {
  it('opens paths on the site', () => {
    assert.equal(notificationPath('/'), '/');
    assert.equal(notificationPath('/?view=more'), '/?view=more');
  });

  it('ignores other sites and anything not a path', () => {
    assert.equal(notificationPath('https://evil.example/'), null);
    assert.equal(notificationPath('//evil.example/'), null);
    assert.equal(notificationPath('/\\evil.example/'), null);
    assert.equal(notificationPath(undefined), null);
    assert.equal(notificationPath(42), null);
  });
});

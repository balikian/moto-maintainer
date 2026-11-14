import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAuthCookie } from './authCookies';

describe('isAuthCookie', () => {
  it('matches the session cookie and its pieces', () => {
    assert.equal(isAuthCookie('sb-hizfldkwauwhrgkmaphe-auth-token'), true);
    assert.equal(isAuthCookie('sb-hizfldkwauwhrgkmaphe-auth-token.0'), true);
    assert.equal(isAuthCookie('sb-hizfldkwauwhrgkmaphe-auth-token.12'), true);
  });

  it('leaves out the sign-in verifier and other cookies', () => {
    assert.equal(isAuthCookie('sb-hizfldkwauwhrgkmaphe-auth-token-code-verifier'), false);
    assert.equal(isAuthCookie('sb-hizfldkwauwhrgkmaphe-auth-token.x'), false);
    assert.equal(isAuthCookie('theme'), false);
  });
});

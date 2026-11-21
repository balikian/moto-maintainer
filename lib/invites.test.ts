import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { INVITE_CODE_LENGTH, inviteCodeFromPath, inviteUrl, newInviteCode, normalizeInviteCode } from './invites';

describe('normalizeInviteCode', () => {
  it('accepts a code however it is typed', () => {
    assert.equal(normalizeInviteCode('abc234xyz9'), 'abc234xyz9');
    assert.equal(normalizeInviteCode('  ABC234xyz9 '), 'abc234xyz9');
  });

  it('refuses anything that cannot be a code', () => {
    assert.equal(normalizeInviteCode(''), null);
    assert.equal(normalizeInviteCode(null), null);
    assert.equal(normalizeInviteCode('abc'), null);
    assert.equal(normalizeInviteCode('abc-234-xyz'), null);
    assert.equal(normalizeInviteCode("x'; drop table invites;--"), null);
    assert.equal(normalizeInviteCode('a'.repeat(33)), null);
  });
});

describe('inviteCodeFromPath', () => {
  it('reads the code from a join link', () => {
    assert.equal(inviteCodeFromPath('/join/abc234xyz9'), 'abc234xyz9');
    assert.equal(inviteCodeFromPath('/join/ABC234XYZ9/'), 'abc234xyz9');
  });

  it('ignores other paths', () => {
    assert.equal(inviteCodeFromPath('/'), null);
    assert.equal(inviteCodeFromPath('/join'), null);
    assert.equal(inviteCodeFromPath('/join/abc234xyz9/more'), null);
    assert.equal(inviteCodeFromPath('/share/abc234xyz9'), null);
    assert.equal(inviteCodeFromPath('/join/no'), null);
  });
});

describe('newInviteCode', () => {
  it('makes a valid code of the set length', () => {
    const code = newInviteCode();
    assert.equal(code.length, INVITE_CODE_LENGTH);
    assert.equal(normalizeInviteCode(code), code);
  });

  it('leaves out characters that are easy to misread', () => {
    const code = newInviteCode((bytes) => bytes.map((_, index) => index * 25));
    assert.doesNotMatch(code, /[01ilo]/);
  });

  it('differs each time', () => {
    assert.notEqual(newInviteCode(), newInviteCode());
  });
});

describe('inviteUrl', () => {
  it('builds the link to send', () => {
    assert.equal(inviteUrl('https://swingarm.app', 'abc234xyz9'), 'https://swingarm.app/join/abc234xyz9');
    assert.equal(inviteUrl('https://test.swingarm.app/', 'abc234xyz9'), 'https://test.swingarm.app/join/abc234xyz9');
  });
});

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { randomNonce, sha256Hex } from './appleNonce';

describe('randomNonce', () => {
  it('is 64 hex characters by default, and different each time', () => {
    const first = randomNonce();
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.notEqual(first, randomNonce());
  });
});

describe('sha256Hex', () => {
  it('matches Node’s SHA-256 in lowercase hex', async () => {
    const nonce = randomNonce();
    assert.equal(await sha256Hex(nonce), createHash('sha256').update(nonce).digest('hex'));
  });

  it('hashes a known value', async () => {
    assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

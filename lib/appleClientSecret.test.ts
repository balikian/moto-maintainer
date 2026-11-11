import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, it } from 'node:test';
import { APPLE_SECRET_MAX_SECONDS, APPLE_SECRET_SECONDS, appleClientSecret } from './appleClientSecret';

describe('appleClientSecret', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const input = {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    keyId: 'ABC123DEFG',
    teamId: 'TEAM123456',
    clientId: 'app.swingarm.signin',
    now: 1_800_000_000,
  };

  it('names the key and the Services ID, from the team, for Apple', () => {
    const [header, claims] = appleClientSecret(input).split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'ES256', kid: 'ABC123DEFG', typ: 'JWT' });
    assert.deepEqual(JSON.parse(Buffer.from(claims, 'base64url').toString()), {
      iss: 'TEAM123456',
      iat: 1_800_000_000,
      exp: 1_800_000_000 + APPLE_SECRET_SECONDS,
      aud: 'https://appleid.apple.com',
      sub: 'app.swingarm.signin',
    });
  });

  it('lasts no longer than Apple allows', () => {
    assert.ok(APPLE_SECRET_SECONDS <= APPLE_SECRET_MAX_SECONDS);
  });

  it('is signed with the key, as a JWT’s raw signature', () => {
    const [header, claims, signature] = appleClientSecret(input).split('.');
    const raw = Buffer.from(signature, 'base64url');
    assert.equal(raw.length, 64);
    const ok = verify('sha256', Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, raw);
    assert.equal(ok, true);
  });
});

import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, it } from 'node:test';
import { fcmMessage, fcmTokenGone, tokenRequestAssertion } from './fcm';
import { testPush } from './pushMessage';

describe('tokenRequestAssertion', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'sender@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };

  it('asks for Firebase messaging for an hour, signed with the service account’s key', () => {
    const [header, claims, signature] = tokenRequestAssertion(account, 1_800_000_000).split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'RS256', typ: 'JWT' });
    assert.deepEqual(JSON.parse(Buffer.from(claims, 'base64url').toString()), {
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    const verified = createVerify('RSA-SHA256').update(`${header}.${claims}`).verify(publicKey, signature, 'base64url');
    assert.equal(verified, true);
  });
});

describe('fcmMessage', () => {
  it('sends the notification to the token, with its page and tag', () => {
    const message = testPush();
    assert.deepEqual(fcmMessage('token-1', message), {
      message: {
        token: 'token-1',
        notification: { title: message.title, body: message.body },
        data: { url: '/?view=more', tag: 'test' },
        android: { ttl: '86400s', notification: { tag: 'test', channel_id: 'reminders' } },
      },
    });
  });
});

describe('fcmTokenGone', () => {
  const error = (errorCode: string) => ({
    error: { code: 400, details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode }] },
  });

  it('treats uninstalled apps and other projects’ tokens as gone', () => {
    assert.equal(fcmTokenGone(404, error('UNREGISTERED')), true);
    assert.equal(fcmTokenGone(403, error('SENDER_ID_MISMATCH')), true);
    assert.equal(fcmTokenGone(404, null), true);
  });

  it('keeps the token for errors that may pass', () => {
    assert.equal(fcmTokenGone(429, error('QUOTA_EXCEEDED')), false);
    assert.equal(fcmTokenGone(503, error('UNAVAILABLE')), false);
    assert.equal(fcmTokenGone(400, error('INVALID_ARGUMENT')), false);
    assert.equal(fcmTokenGone(500, null), false);
  });
});

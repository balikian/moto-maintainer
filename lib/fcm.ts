import { createSign } from 'node:crypto';
import { APP_NOTIFICATION_CHANNEL, type PushMessage } from './pushMessage';
import type { PushSendResult } from './push';

// Server-only: sends the phone app's notifications through Firebase Cloud
// Messaging (FCM), Google's delivery service for Android. The app registers
// with Firebase and saves its token (see app/hooks/usePush.ts); we send to
// the token with FCM's HTTP v1 API, signed in as the Firebase project's
// service account. FIREBASE_SERVICE_ACCOUNT holds that account's key file
// (the JSON from Firebase's Project settings, Service accounts). It's a
// secret, never prefixed with NEXT_PUBLIC_. One Firebase project serves both
// app ids, so every environment uses the same key.

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/** A reminder older than this isn't worth showing; Firebase drops it. */
const TIME_TO_LIVE = '86400s';

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as Partial<ServiceAccount>;
    if (typeof account.project_id !== 'string' || typeof account.client_email !== 'string' || typeof account.private_key !== 'string') {
      return null;
    }
    return account as ServiceAccount;
  } catch {
    return null;
  }
}

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** The signed request for an access token (a JWT, RFC 7523), good for an hour from `now` (seconds). */
export function tokenRequestAssertion(account: Pick<ServiceAccount, 'client_email' | 'private_key'>, now: number): string {
  const unsigned = `${base64Url({ alg: 'RS256', typ: 'JWT' })}.${base64Url({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  return `${unsigned}.${signature}`;
}

// Access tokens last an hour; the daily job sends many messages with one.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: tokenRequestAssertion(account, now),
    }),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(`Google sign-in for Firebase failed (${response.status}): ${body?.error_description ?? 'no token'}`);
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

/**
 * FCM's message for a notification. Android shows it on its own while the app
 * is closed (and the app shows it while open, see capacitor.config.ts); a tap
 * opens the app, which opens `data.url` (app/components/NativeAppLinks.tsx).
 */
export function fcmMessage(token: string, message: PushMessage) {
  return {
    message: {
      token,
      notification: { title: message.title, body: message.body },
      data: { url: message.url, tag: message.tag },
      android: {
        ttl: TIME_TO_LIVE,
        notification: { tag: message.tag, channel_id: APP_NOTIFICATION_CHANNEL },
      },
    },
  };
}

type FcmError = { error?: { code?: number; message?: string; status?: string; details?: { errorCode?: string }[] } };

/**
 * Whether FCM's error means the token is gone for good: the app was
 * uninstalled or its data cleared (UNREGISTERED), or the token belongs to
 * another Firebase project (SENDER_ID_MISMATCH).
 */
export function fcmTokenGone(status: number, body: FcmError | null): boolean {
  if (status === 404) return true;
  const codes = (body?.error?.details ?? []).map((detail) => detail.errorCode);
  return codes.includes('UNREGISTERED') || codes.includes('SENDER_ID_MISMATCH');
}

export async function sendFcm(token: string, message: PushMessage): Promise<PushSendResult> {
  const account = serviceAccount();
  if (!account) return { error: 'FIREBASE_SERVICE_ACCOUNT is not set, or isn’t the service account’s key file.' };

  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessToken(account)}`, 'content-type': 'application/json' },
      body: JSON.stringify(fcmMessage(token, message)),
    });
    if (response.ok) return {};
    const body = (await response.json().catch(() => null)) as FcmError | null;
    return {
      error: `Firebase ${response.status}: ${body?.error?.message?.slice(0, 200) ?? response.statusText}`,
      gone: fcmTokenGone(response.status, body),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
